# -*- coding: utf-8 -*-

import re
import requests
import logging
import threading
from typing import Dict, List, Optional
from difflib import SequenceMatcher

try:
    from googleapiclient.discovery import build
    from bs4 import BeautifulSoup
except ImportError:
    print("錯誤：缺少必要的函式庫。")
    exit()

from .google_vision_service import google_vision_service

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

_API_LOCK = threading.Lock()
_LAST_REQUEST_TIME = 0

class TerminalColors:
    HEADER = '\033[95m'; OKGREEN = '\033[92m'; WARNING = '\033[93m'; FAIL = '\033[91m'; ENDC = '\033[0m'; BOLD = '\033[1m'

class TerminalUI:
    ENABLE_VISUAL = True
    @staticmethod
    def print_header(text): print(f"\n{TerminalColors.HEADER}{'='*60}\n{text:^60}\n{'='*60}{TerminalColors.ENDC}")
    @staticmethod
    def print_step(num, text): print(f"\n{TerminalColors.BOLD}[步驟 {num}]{TerminalColors.ENDC} {text}")
    @staticmethod
    def print_success(text): print(f"  {TerminalColors.OKGREEN}✓ {text}{TerminalColors.ENDC}")
    @staticmethod
    def print_warning(text): print(f"  {TerminalColors.WARNING}⚠ {text}{TerminalColors.ENDC}")
    @staticmethod
    def print_error(text): print(f"  {TerminalColors.FAIL}✗ {text}{TerminalColors.ENDC}")
    @staticmethod
    def print_info(text): print(f"  → {text}")
    @staticmethod
    def print_book_info(info):
        TerminalUI.print_header("📖 最終判定結果")
        for k, l in [('title','書名'),('authors','作者'),('publisher','出版社'),('isbn','ISBN'),('source','來源')]:
            val = info.get(k,'')
            if isinstance(val, list): val = ', '.join(val)
            print(f"{l}：{val}")

class FinalBookRecognizer:
    def __init__(self):
        TerminalUI.print_header("📚 書籍識別服務 (Final v14.0 - 爬蟲修正版)")
        self.google_books_api = {'base_url': 'https://www.googleapis.com/books/v1/volumes'}
        self.request_interval = 0.3
        
        self.google_api_key = "AIzaSyARwMYmmWQbUeNNxXKP0WAOg0Tlp9xwVXY"
        self.google_search_cx_id = "e250702ba333848ea"
        
        google_vision_service.set_api_key(self.google_api_key)

        self.generic_labels = [
            'poster', 'book', 'book cover', 'publication', 'paper', 'text', 'font', 
            'rectangle', 'advertising', 'logo', 'brand', 'magenta', 'material property',
            'graphic design', 'flyer', 'brochure', 'album cover', 'product', 
            'illustration', 'stairs', 'multimedia software', 'diagram', 'screenshot'
        ]
        
        self.noise_patterns = [
            r'第\s*\d+\s*版', r'^\d{2,}', r'Vol\.\d+', r'No\.\d+', 
            r'\d+th\s*Edition', r'\d+st\s*Edition', r'\d+nd\s*Edition', r'\d+rd\s*Edition',
            r'(?i)(?:First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleventh|Twelfth|Thirteenth|Fourteenth|Fifteenth|Sixteenth|Seventeenth|Eighteenth|Nineteenth|Twentieth)\s+Edition',
            r'紅沙龍', r'藍沙龍', r'大師名作', r'經典文學', r'暢銷書系', r'Systems Analysis', r'International Student'
        ]

    def _clean_text(self, text: str) -> str:
        text = re.sub(r'(?<=[\u4e00-\u9fa5])\s+(?=[\u4e00-\u9fa5])', '', text)
        return text.strip('., \t\n').strip()

    def _remove_edition_noise(self, text: str) -> str:
        cleaned = text
        for pattern in self.noise_patterns:
            cleaned = re.sub(pattern, '', cleaned, flags=re.IGNORECASE)
        return cleaned.strip()
        
    def _split_camel_case(self, text: str) -> str:
        return re.sub(r'(?<=[a-z])(?=[A-Z])', ' ', text)

    def _extract_isbn_from_text(self, text: str) -> Optional[str]:
        clean = re.sub(r'[-—\s]', '', text)
        match = re.search(r'(978\d{10})', clean)
        return match.group(1) if match else None

    def _check_keyword_containment(self, query: str, result_title: str) -> bool:
        split_query = self._split_camel_case(query)
        result_norm = result_title.replace(' ', '').lower()
        query_norm = split_query.lower()
        
        q_words = set(re.findall(r'\w+', query_norm))
        r_words = set(re.findall(r'\w+', result_norm))
        
        query_chinese = re.findall(r'[\u4e00-\u9fa5]+', query)
        
        if not query_chinese:
            flat_query = query.lower().replace(' ', '')
            flat_result = result_title.lower().replace(' ', '')
            if len(flat_query) > 10 and (flat_query in flat_result or flat_result in flat_query): return True
            if not q_words: return True
            overlap = len(q_words & r_words) / len(q_words)
            return overlap > 0.2 

        match_count = 0
        for word in query_chinese:
            if len(word) > 1 and word in result_norm: match_count += 1
            elif len(word) == 1 and word in result_norm: match_count += 0.5
        
        if match_count > 0: return True
        
        q_chars = set(query)
        r_chars = set(result_title)
        if len(q_chars) == 0: return False
        return (len(q_chars & r_chars) / len(q_chars)) > 0.4

    def process_book_image(self, image_data: bytes) -> Dict:
        result_template = {"title": "未知", "authors": [], "isbn": "", "source": "無"}
        best_result_so_far = None
        highest_score = 0.0
        
        try:
            TerminalUI.print_step(1, f"影像分析中 (圖片: {len(image_data)/1024:.1f} KB)")

            web_res = google_vision_service.detect_web_entities(image_data)
            ocr_res = google_vision_service.detect_text_with_preprocessing(image_data)
            
            full_text = ocr_res.get('text', '')
            best_guess = web_res.get('best_guess', '').lower()
            
            if best_guess: TerminalUI.print_info(f"Google 猜測: {best_guess}")

            isbn = self._extract_isbn_from_text(full_text)
            if isbn:
                TerminalUI.print_success(f"發現 ISBN: {isbn}")
                res = self._search_books_com_tw(isbn) or self._search_google_books(f"isbn:{isbn}")
                if res: return self._success_return(res, "ISBN 精準搜尋", full_text)

            search_candidates = []

            if best_guess and not any(g in best_guess for g in self.generic_labels):
                 search_candidates.append({"q": best_guess, "src": f"以圖搜圖 ({best_guess})", "weight": 0.6})

            raw_lines = [l.strip() for l in full_text.split('\n') if len(l.strip()) > 1]
            valid_lines = []
            for l in raw_lines:
                cleaned = self._remove_edition_noise(l)
                if len(cleaned) > 1: valid_lines.append(cleaned)
            
            if valid_lines:
                line1 = valid_lines[0]
                search_candidates.append({"q": line1, "src": f"OCR 第一行", "weight": 1.0})
                
                if len(line1) > 8:
                    mid = len(line1) // 2
                    search_candidates.append({"q": line1[:mid+2], "src": "OCR 切割(前)", "weight": 0.9})
                    search_candidates.append({"q": line1[mid-2:], "src": "OCR 切割(後)", "weight": 0.9})

                if len(valid_lines) > 1:
                    author_part = self._clean_text(valid_lines[1])
                    if len(author_part) < 20:
                        query = f"{line1} {author_part}"
                        search_candidates.append({"q": query, "src": "標題+作者", "weight": 1.2})

            text_blocks = ocr_res.get('text_blocks', [])
            if text_blocks:
                max_block = max(text_blocks, key=lambda b: abs(b['boundingBox']['vertices'][2]['y'] - b['boundingBox']['vertices'][0]['y']))
                search_candidates.append({"q": max_block['text'], "src": f"OCR 最大區塊", "weight": 0.95})

            if not search_candidates:
                return {"success": False, "book_info": result_template, "ocr_text": full_text, "error": "無法提取搜尋關鍵字"}

            TerminalUI.print_step(2, f"執行容錯搜尋 (共 {len(search_candidates)} 個候選)")
            
            unique_queries = []
            seen = set()
            for c in search_candidates:
                cleaned_q = c['q'].replace('\n', ' ').strip()
                if cleaned_q not in seen and len(cleaned_q) > 1 and not cleaned_q.isdigit():
                    unique_queries.append(c)
                    seen.add(cleaned_q)

            for cand in unique_queries:
                query = cand['q']
                TerminalUI.print_info(f"嘗試搜尋: [{query}]")
                
                res = self._search_books_com_tw(query)
                if not res: res = self._search_google_books(query)
                
                if res:
                    res_title = res.get('title', '')
                    
                    if not self._check_keyword_containment(query, res_title):
                        TerminalUI.print_warning(f"  -> 找到 '{res_title}' 但關鍵字不匹配 (剔除)")
                        continue

                    score = 0
                    if res.get('isbn'): score += 30
                    if res.get('authors'): score += 10
                    if res.get('title'): score += 10
                    if re.search(r'[\u4e00-\u9fa5]', res_title): score += 30
                    
                    similarity = SequenceMatcher(None, query, res_title).ratio()
                    if similarity > 0.5: score += 20
                    if 'books.com.tw' in res.get('source', ''): score += 15
                    
                    score *= cand['weight']
                    TerminalUI.print_success(f"  -> 找到: {res_title} (分數: {score:.1f})")

                    if score > highest_score:
                        highest_score = score
                        best_result_so_far = res
                        best_result_so_far['source'] = f"{cand['src']} -> {res['source']}"
                else:
                    TerminalUI.print_warning("  -> 無結果")

            if best_result_so_far and highest_score > 25:
                return self._success_return(best_result_so_far, best_result_so_far['source'], full_text)
            
            if full_text:
                fallback = valid_lines[0] if valid_lines else "未知"
                ocr_info = {"title": fallback, "source": "OCR 原始文字"}
                return self._success_return(ocr_info, "OCR 原始資料", full_text)

            return {"success": False, "book_info": result_template, "error": "查無資料"}

        except Exception as e:
            TerminalUI.print_error(f"系統錯誤: {e}")
            return {"success": False, "error": str(e)}

    def _search_books_com_tw(self, query):
        try:
            service = build("customsearch", "v1", developerKey=self.google_api_key)
            full_query = f'site:books.com.tw {query}' 
            res = service.cse().list(q=full_query, cx=self.google_search_cx_id, num=1).execute()
            if 'items' in res and len(res['items']) > 0:
                return self._scrape_books_page(res['items'][0]['link'])
        except Exception: pass
        return None

    def _scrape_books_page(self, url):
        try:
            headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
            resp = requests.get(url, headers=headers, timeout=5)
            if resp.status_code != 200: return None
            
            soup = BeautifulSoup(resp.text, 'html.parser')
            title = soup.find('meta', property='og:title')['content'] if soup.find('meta', property='og:title') else ''
            title = title.split('：')[0] if '：' in title else title
            title = re.sub(r' - 博客來.*', '', title)

            # ★ 修正：精準抓取作者與出版社
            authors = []
            # 博客來作者連結通常包含 adv_author 參數
            for a in soup.select('a[href*="adv_author"]'):
                authors.append(a.text.strip())
            
            # 如果沒有 adv_author，嘗試抓 meta description 裡的
            if not authors:
                desc = soup.find('meta', property='og:description')['content']
                if desc:
                    # 簡單嘗試從描述中提取，但這比較不可靠，不如留空
                    pass

            # 博客來出版社連結通常包含 adv_pub
            pub_tag = soup.select_one('a[href*="adv_pub"]')
            # 或是 pub
            if not pub_tag: pub_tag = soup.select_one('a[href*="pub"]')
            
            publisher = pub_tag.text.strip() if pub_tag else ''
            
            isbn = ''
            isbn_tag = soup.find(string=re.compile(r'ISBN：'))
            if isbn_tag: isbn = isbn_tag.replace('ISBN：', '').strip()
            
            date = ''
            date_tag = soup.find(string=re.compile(r'出版日期：'))
            if date_tag: date = date_tag.replace('出版日期：', '').strip()

            if title:
                # 去重作者
                authors = list(set(authors))
                return {"title": title, "authors": authors, "publisher": publisher, "publishedDate": date, "isbn": isbn, "source": "博客來爬蟲"}
        except Exception: pass
        return None

    def _search_google_books(self, query):
        try:
            safe_query = query[:100]
            url = f"{self.google_books_api['base_url']}?q={safe_query}&maxResults=1&langRestrict=zh&key={self.google_api_key}"
            r = requests.get(url, timeout=5)
            if r.status_code == 200 and r.json().get('totalItems', 0) > 0:
                vol = r.json()['items'][0]['volumeInfo']
                return {
                    "title": vol.get('title'),
                    "authors": vol.get('authors', []),
                    "publisher": vol.get('publisher'),
                    "publishedDate": vol.get('publishedDate'),
                    "isbn": next((i['identifier'] for i in vol.get('industryIdentifiers', []) if i['type']=='ISBN_13'), ""),
                    "source": "Google Books"
                }
        except: pass
        return None

    def _success_return(self, info, source, text):
        info['source'] = source
        TerminalUI.print_book_info(info)
        return {"success": True, "book_info": info, "ocr_text": text}

book_recognition_service = FinalBookRecognizer()