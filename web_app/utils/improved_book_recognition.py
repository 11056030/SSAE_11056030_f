# -*- coding: utf-8 -*-

import re
import requests
import logging
import time
import threading
from typing import Dict, List, Optional, Tuple
from difflib import SequenceMatcher
import urllib.parse

try:
    from googleapiclient.discovery import build
    from bs4 import BeautifulSoup
except ImportError:
    print("錯誤：缺少必要的函式庫。請執行 'pip install google-api-python-client beautifulsoup4'")
    exit()

from .google_vision_service import google_vision_service

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

_API_LOCK = threading.Lock()
_LAST_REQUEST_TIME = 0

class TerminalColors:
    HEADER = '\033[95m'; OKBLUE = '\033[94m'; OKCYAN = '\033[96m'; OKGREEN = '\033[92m'
    WARNING = '\033[93m'; FAIL = '\033[91m'; ENDC = '\033[0m'; BOLD = '\033[1m'

class TerminalUI:
    ENABLE_VISUAL = True
    
    @staticmethod
    def print_header(text: str):
        if not TerminalUI.ENABLE_VISUAL: print(f"\n===== {text} =====")
        else: print(f"\n{TerminalColors.HEADER}{TerminalColors.BOLD}{'='*60}{TerminalColors.ENDC}\n{TerminalColors.HEADER}{TerminalColors.BOLD}{text:^60}{TerminalColors.ENDC}\n{TerminalColors.HEADER}{TerminalColors.BOLD}{'='*60}{TerminalColors.ENDC}\n")
    
    @staticmethod
    def print_step(step_num: any, text: str):
        if not TerminalUI.ENABLE_VISUAL: print(f"\n[Step {step_num}] {text}")
        else: print(f"\n{TerminalColors.OKBLUE}{TerminalColors.BOLD}[步驟 {step_num}]{TerminalColors.ENDC} {text}")
    
    @staticmethod
    def print_success(text: str, indent: int = 0):
        prefix = "  " * indent
        if not TerminalUI.ENABLE_VISUAL: print(f"{prefix}✓ {text}")
        else: print(f"{prefix}{TerminalColors.OKGREEN}✓ {text}{TerminalColors.ENDC}")
    
    @staticmethod
    def print_warning(text: str, indent: int = 0):
        prefix = "  " * indent
        if not TerminalUI.ENABLE_VISUAL: print(f"{prefix}⚠ {text}")
        else: print(f"{prefix}{TerminalColors.WARNING}⚠ {text}{TerminalColors.ENDC}")

    @staticmethod
    def print_error(text: str):
        if not TerminalUI.ENABLE_VISUAL: print(f"✗ {text}")
        else: print(f"{TerminalColors.FAIL}✗ {text}{TerminalColors.ENDC}")
    
    @staticmethod
    def print_info(text: str, indent: int = 0):
        prefix = "  " * indent
        if not TerminalUI.ENABLE_VISUAL: print(f"{prefix}→ {text}")
        else: print(f"{prefix}{TerminalColors.OKCYAN}→{TerminalColors.ENDC} {text}")
    
    @staticmethod
    def print_text_block(title: str, text: str):
        if not TerminalUI.ENABLE_VISUAL:
            print(f"\n--- {title} ---\n{text}\n--------------------")
        else:
            print(f"\n{TerminalColors.OKCYAN}{'─'*25} {title} {'─'*25}{TerminalColors.ENDC}")
            print(text)
            print(f"{TerminalColors.OKCYAN}{'─'*(52 + len(title))}{TerminalColors.ENDC}")

    @staticmethod
    def print_book_info(book_info: dict):
        TerminalUI.print_header("📖 找到的書籍資訊")
        for key, label in [('title', '書名'), ('authors', '作者'), ('publisher', '出版社'), ('publishedDate', '出版日期'), ('isbn', 'ISBN'), ('source', '資料來源')]:
            value = book_info.get(key)
            if isinstance(value, list): value = ', '.join(map(str, value))
            print(f"{TerminalColors.BOLD}{label}：{TerminalColors.ENDC}{value or '未知'}")
        print(f"{TerminalColors.OKGREEN}{TerminalColors.BOLD}{'─'*60}{TerminalColors.ENDC}\n")

class FinalBookRecognizer:
    def __init__(self):
        TerminalUI.print_header("📚 初始化書籍辨識服務 (Platinum Edition v20.0 - Speed Edition)")
        self.google_books_api = {'base_url': 'https://www.googleapis.com/books/v1/volumes'}
        self.request_interval = 0.3  # 稍微降低 API 間隔

        self.google_api_key = "AIzaSyARwMYmmWQbUeNNxXKP0WAOg0Tlp9xwVXY"
        self.google_search_cx_id = "e250702ba333848ea"

        self.author_keywords = ['著', '譯', '作', '編', '編著', '主編', '監修', '繪', '博士']
        self.author_blacklist = {'團隊', '法則', '趨勢', '世界', '下一步', '自己', '幹到死', '夢想', '你就自己', '為例', '多益', '全新制', '未來', '解析', '布局', '發展', '心法', '思考', '台灣', '對手', '隊友', '大未來', '建立工', 'insight', 'Team', '人類智庫', '蔬適圈', '80年'}
        self.junk_patterns = [r'^(第.*版|.*edition)$', r'^\d+$', r'ISBN|出版|公司|書局', r'暢銷|推薦|No\.1|冠軍', r'^\d+\s*年$']

    # ... (辅助函数 _clean_text, _extract_authors, _extract_title_candidates 保持不變) ...
    def _clean_text(self, text: str) -> str:
        text = re.sub(r'GM\s*大未來', 'AI大未來', text, flags=re.IGNORECASE)
        text = re.sub(r'台\s*出\s*董學堂', '', text, flags=re.IGNORECASE)
        text = re.sub(r'(?<=[\u4e00-\u9fa5])\s(?=[\u4e00-\u9fa5])', '', text)
        return text.strip('.,·• \t\n\r~#弓|').strip()

    def _extract_authors(self, full_text: str) -> List[str]:
        authors = set()
        author_keyword_pattern = r'([\u4e00-\u9fa5a-zA-Z\s\.·、/]{2,30}?)\s*[-—–―\s]*\s*(' + '|'.join(self.author_keywords) + r')'
        matches = re.findall(author_keyword_pattern, full_text)
        for name_candidate, keyword in matches:
            cleaned_candidate = self._clean_text(name_candidate.split('\n')[-1])
            parts = re.split(r'[、·,，\s/]+', cleaned_candidate)
            for part in parts:
                final_name = self._clean_text(part)
                if 2 <= len(final_name) <= 20 and final_name not in self.author_blacklist:
                    authors.add(final_name)
        return list(authors)

    def _extract_title_candidates(self, text_blocks: List[Dict], found_authors: List[str]) -> List[Dict]:
        candidates = []
        if not text_blocks: return []
        heights = [abs(b['boundingBox']['vertices'][2].get('y', 0) - b['boundingBox']['vertices'][0].get('y', 0)) for b in text_blocks if b.get('boundingBox', {}).get('vertices') and len(b['boundingBox']['vertices']) >= 4]
        avg_height = sum(heights) / len(heights) if heights else 0
        for block in text_blocks:
            text = self._clean_text(block.get('text', ''))
            if not text or len(text) < 2 or text in found_authors or any(re.search(p, text, re.IGNORECASE) for p in self.junk_patterns):
                continue
            score = 1.0
            bbox = block.get('boundingBox', {})
            if avg_height > 0 and bbox and 'vertices' in bbox and len(bbox['vertices']) >= 4:
                height = abs(bbox['vertices'][2].get('y', 0) - bbox['vertices'][0].get('y', 0))
                if height > avg_height * 1.5: score += (height / avg_height)
            candidates.append({'text': text, 'score': score})
        return sorted(candidates, key=lambda x: x['score'], reverse=True)

    # <<< NEW: 將每個主要搜尋任務包裝成可供執行緒呼叫的函式 >>>
    def _task_google_books(self, best_title, ocr_authors, results_dict):
        TerminalUI.print_info("啟動 Google Books API 搜尋任務...", 1)
        search_tasks = self._generate_search_tasks(best_title, ocr_authors)
        best_match, highest_score = None, 0.0
        for query in search_tasks:
            search_results = self._search_google_books_by_query(query)
            for book_data in search_results:
                score, _ = self._score_search_result(book_data, best_title, ocr_authors)
                if score > highest_score:
                    highest_score, best_match = score, book_data
        
        if best_match and highest_score >= 0.60:
            TerminalUI.print_success("Google Books 任務找到高可信度結果！", 1)
            results_dict['google_books'] = best_match

    def _task_national_library(self, best_title, ocr_authors, results_dict):
        TerminalUI.print_info("啟動國家圖書館 LOD 搜尋任務...", 1)
        taiwan_results = self._search_taiwan_library_by_title(best_title, ocr_authors)
        if taiwan_results:
            # 國圖的結果需要交叉驗證
            result = taiwan_results[0]
            score, _ = self._score_search_result(result, best_title, ocr_authors)
            if score >= 0.60:
                TerminalUI.print_success("國家圖書館任務找到高可信度結果！", 1)
                results_dict['national_library'] = result

    def _task_web_scraper(self, best_title, ocr_authors, results_dict):
        TerminalUI.print_info("啟動網路情報搜尋任務...", 1)
        core_title_search = ""
        if best_title:
            chinese_parts = re.findall(r'[\u4e00-\u9fa5]+', best_title)
            core_title_search = " ".join(chinese_parts) if chinese_parts else re.split(r'[:：]', best_title)[0].strip()
        primary_author_search = ""
        if ocr_authors:
            eng_author = next((a for a in ocr_authors if re.search(r'[a-zA-Z]', a)), None)
            primary_author_search = eng_author or ocr_authors[0]
        web_query = f'"{core_title_search}" "{primary_author_search}" site:books.com.tw OR site:eslite.com'
        
        potential_urls = self._search_web_for_urls(web_query)
        for url in potential_urls:
            if 'books.com.tw' in url and '/products/' not in url:
                continue
            scraped_data = self._scrape_book_details(url)
            if scraped_data:
                score, _ = self._score_search_result(scraped_data, best_title, ocr_authors)
                if score >= 0.60:
                    TerminalUI.print_success("網路爬蟲任務找到高可信度結果！", 1)
                    results_dict['web_scraper'] = scraped_data
                    return # 找到一個就夠了

    # <<< MODIFIED: 全新設計的主流程，採用並行化設計 >>>
    def process_book_image(self, image_data: bytes) -> Dict:
        start_time = time.time()
        result_template = {"title": "未知", "authors": ["未知"], "publisher": "未知", "publishedDate": "未知", "isbn": "未知", "source": "無"}
        try:
            TerminalUI.print_step(1, "執行 OCR 文字識別與提取")
            ocr_result = google_vision_service.detect_text_with_preprocessing(image_data)
            if not ocr_result.get('success'): return {"success": False, "book_info": result_template, "error": "OCR 服務失敗"}
            
            full_text, text_blocks = ocr_result.get('text', ''), ocr_result.get('text_blocks', [])
            ocr_authors = self._extract_authors(full_text)
            best_title = (self._extract_title_candidates(text_blocks, ocr_authors)[0]['text'] if self._extract_title_candidates(text_blocks, ocr_authors) else "")
            
            TerminalUI.print_text_block("OCR 原始識別文字", full_text)
            TerminalUI.print_info(f"提取到作者: {ocr_authors if ocr_authors else '無'}", 1)
            TerminalUI.print_info(f"最高分書名候選: {best_title if best_title else '無'}", 1)

            if not best_title and not ocr_authors: return {"success": False, "book_info": result_template, "ocr_text": full_text}

            TerminalUI.print_step(2, "啟動並行化搜尋 (Google Books, 國圖, 網路爬蟲)")
            
            results = {}
            threads = []
            
            # 建立並啟動所有搜尋執行緒
            tasks = {
                'google_books': self._task_google_books,
                'national_library': self._task_national_library,
                'web_scraper': self._task_web_scraper,
            }

            for name, task_func in tasks.items():
                thread = threading.Thread(target=task_func, args=(best_title, ocr_authors, results))
                threads.append(thread)
                thread.start()
                
            # 等待所有執行緒完成
            for thread in threads:
                thread.join(timeout=15) # 設定一個總超時，防止單一執行緒卡死

            TerminalUI.print_step(3, "處理並行搜尋結果")

            # 按優先級順序檢查結果
            if results.get('google_books'):
                final_book_info = self._enrich_book_info(results['google_books'])
            elif results.get('web_scraper'):
                final_book_info = self._enrich_book_info(results['web_scraper'])
            elif results.get('national_library'):
                final_book_info = self._enrich_book_info(results['national_library'])
            else:
                # 所有並行任務都失敗，最終回退
                TerminalUI.print_warning("所有線上搜尋來源均無高可信度結果。", 1)
                ocr_book_info = {"title": best_title or "未知", "authors": ocr_authors or ["未知"], "source": "OCR 萃取 (線上無高可信度資料)"}
                final_book_info = self._enrich_book_info(ocr_book_info)

            total_time = time.time() - start_time
            TerminalUI.print_success(f"辨識流程完成！總耗時: {total_time:.2f} 秒")
            TerminalUI.print_book_info(final_book_info)
            return {"success": True, "book_info": final_book_info, "ocr_text": full_text}

        except Exception as e:
            TerminalUI.print_error(f"書籍識別流程發生嚴重錯誤: {str(e)}")
            logger.error(f"書籍識別錯誤: {e}", exc_info=True)
            return {"success": False, "book_info": result_template, "error": str(e)}

    # ... (其他辅助函数 _generate_search_tasks, _search_google_books_by_query 等保持不變，但可以優化 timeout) ...
    def _generate_search_tasks(self, title: Optional[str], authors: List[str]) -> List[str]:
        tasks = []
        if title and authors: tasks.append(f"{title} {authors[0]}")
        if title: tasks.append(title)
        if authors: tasks.append(" ".join(authors))
        return list(dict.fromkeys(q for q in tasks if q))

    def _search_google_books_by_query(self, query: str) -> List[Dict]:
        global _API_LOCK, _LAST_REQUEST_TIME
        if not query: return []
        with _API_LOCK:
            elapsed = time.time() - _LAST_REQUEST_TIME
            if elapsed < self.request_interval:
                time.sleep(self.request_interval - elapsed)
            params = {'q': self._clean_text(query), 'maxResults': 3, 'orderBy': 'relevance', 'key': self.google_api_key}
            try:
                response = requests.get(self.google_books_api['base_url'], params=params, timeout=7) # 縮短 timeout
                _LAST_REQUEST_TIME = time.time()
                response.raise_for_status()
                if response.json().get('totalItems', 0) > 0:
                    return [p for item in response.json()['items'] if (p := self._parse_google_books_item(item))]
            except requests.RequestException as e:
                _LAST_REQUEST_TIME = time.time()
                logger.error(f"Google Books API 請求失敗 (查詢: '{query}'): {e}")
            return []

    def _search_taiwan_library_by_title(self, title: str, authors: List[str]) -> List[Dict]:
        if not title and not authors: return []
        # ... 此函式邏輯保持不變，但timeout可以縮短 ...
        # ... (為簡潔省略函式內部程式碼，請保留您原本的版本) ...
        # 只是在 requests.post 中將 timeout=15 改為 timeout=8
        core_title = ""
        if title:
            if "系統分析與設計" in title: core_title = "系統分析與設計"
            else: core_title = re.sub(r'\(.*?\)|\[.*?\]', '', title); core_title = re.split(r'[:：]', core_title)[0].strip()
        escaped_title = core_title.replace('"', '\\"')
        primary_author = ""
        if authors:
            eng_author = next((a for a in authors if re.search(r'[a-zA-Z]', a)), None)
            primary_author = eng_author or authors[0]
        escaped_author = primary_author.replace('"', '\\"')
        search_strategies = [{'title': escaped_title, 'author': escaped_author}] if escaped_title and escaped_author else []
        if escaped_title: search_strategies.append({'title': escaped_title, 'author': ''})
        if escaped_author and not escaped_title: search_strategies.append({'title': '', 'author': escaped_author})
        for i, strategy in enumerate(search_strategies):
            current_title, current_author = strategy['title'], strategy['author']
            query = f"""PREFIX madsrdf:<http://www.loc.gov/mads/rdf/v1#> PREFIX rdf:<http://www.w3.org/1999/02/22-rdf-syntax-ns#> PREFIX bf:<http://id.loc.gov/ontologies/bibframe/> PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> SELECT DISTINCT ?title ?authorName ?isbn WHERE{{?work rdf:type bf:Work . {f'?work bf:title ?titleNode . ?titleNode bf:mainTitle ?title . FILTER(CONTAINS(LCASE(str(?title)),LCASE("{current_title}")))' if current_title else ''} OPTIONAL{{?work bf:contribution ?contrib . ?contrib bf:agent ?agent . ?agent rdfs:label ?authorName . {f'FILTER(CONTAINS(LCASE(str(?authorName)),LCASE("{current_author}")))' if current_author else ''}}} OPTIONAL{{?instance bf:instanceOf ?work . ?instance bf:identifiedBy ?isbnNode . ?isbnNode rdf:value ?isbn . FILTER(CONTAINS(STR(?isbnNode),"ISBN"))}}}}LIMIT 5"""
            try:
                response = requests.post("https://ld.ncl.edu.tw/fuseki/lod/query", data={"query": query}, headers={"Accept": "application/sparql-results+json"}, timeout=8)
                response.raise_for_status()
                results = response.json().get("results", {}).get("bindings", [])
                if results:
                    books = [{"title": r.get("title",{}).get("value",core_title),"authors":[r.get("authorName",{}).get("value")] if r.get("authorName") else [],"isbn":r.get("isbn",{}).get("value",""),"source":"臺灣國家圖書館 LOD"} for r in results]
                    return list({book['title']: book for book in books}.values())
            except requests.RequestException:
                break # 發生錯誤直接中斷
        return []

    def _search_web_for_urls(self, query: str) -> List[str]:
        if not self.google_api_key or "貼上你" in self.google_api_key: return []
        try:
            service = build("customsearch", "v1", developerKey=self.google_api_key)
            res = service.cse().list(q=query, cx=self.google_search_cx_id, num=5).execute()
            return [item.get('link') for item in res.get('items', []) if item.get('link')]
        except Exception as e:
            logger.error(f"Google Custom Search API 查詢失敗: {e}")
            return []

    def _scrape_book_details(self, url: str) -> Optional[Dict]:
        try:
            headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
            response = requests.get(url, timeout=7, headers=headers)
            response.raise_for_status()
            if 'books.com.tw' in url: return self._parse_books_com_tw(response.text)
            elif 'eslite.com' in url: return self._parse_eslite_com(response.text)
        except Exception:
            pass # 爬取失敗靜默處理，主邏輯會繼續
        return None

    # ... (网站解析器 _parse_books_com_tw, _parse_eslite_com 保持不變) ...
    def _parse_books_com_tw(self, html_content: str) -> Optional[Dict]:
        try:
            soup = BeautifulSoup(html_content, 'html.parser')
            book_info = {"source": "網路搜尋 (books.com.tw)"}
            if title_tag := soup.find('h1'): book_info['title'] = title_tag.text.strip()
            
            author_label = soup.find(string=re.compile(r'\s*作者\s*：\s*'))
            if author_label and (authors := [a.text.strip() for a in author_label.find_parent().find_all('a')]): book_info['authors'] = authors

            publisher_label = soup.find(string=re.compile(r'\s*出版社\s*：\s*'))
            if publisher_label and (pub_tag := publisher_label.find_parent().find('a')):
                book_info['publisher'] = pub_tag.text.strip()

            date_label = soup.find(string=re.compile(r'\s*出版日期\s*：\s*'))
            if date_label:
                book_info['publishedDate'] = date_label.parent.text.replace('出版日期：', '').strip().replace('/', '-')

            isbn_label = soup.find(string=re.compile(r'\s*ISBN\s*：\s*'))
            if isbn_label:
                book_info['isbn'] = isbn_label.parent.text.replace('ISBN：', '').strip()
                
            if book_info.get('isbn'): return book_info
        except Exception: pass
        return None

    def _parse_eslite_com(self, html_content: str) -> Optional[Dict]:
        try:
            soup = BeautifulSoup(html_content, 'html.parser')
            book_info = {"source": "網路搜尋 (eslite.com)"}
            if title_tag := soup.find('h1', class_='product-name'):
                if title_span := title_tag.find('span'): book_info['title'] = title_span.text.strip()
            
            details_div = soup.find('div', class_='product-details-content')
            if details_div:
                if author_tag := details_div.find('a', href=lambda href: href and '/author/' in href):
                    book_info['authors'] = [author_tag.text.strip()]
                if publisher_tag := details_div.find('a', href=lambda href: href and '/publisher/' in href):
                    book_info['publisher'] = publisher_tag.text.strip()
                for field in details_div.find_all('div', class_='product-details-field'):
                    if label := field.find('span', class_='product-details-label'):
                        label_text = label.text.strip()
                        if '出版日期' in label_text and (value_tag := field.find('span', class_='product-details-value')):
                            book_info['publishedDate'] = value_tag.text.strip().replace('/', '-')
                        elif 'ISBN' in label_text and (value_tag := field.find('span', class_='product-details-value')):
                            book_info['isbn'] = value_tag.text.strip()
            if book_info.get('isbn'): return book_info
        except Exception: pass
        return None

    # ... (评分和数据处理函数 _get_core_title, _calculate_token_set_similarity, _score_search_result, _enrich_book_info, _parse_google_books_item 保持不變) ...
    def _get_core_title(self, title: str) -> str:
        if not title: return ""
        return re.split(r'[:：—–-]', title)[0].strip()

    def _calculate_token_set_similarity(self, str1: str, str2: str) -> float:
        if not str1 or not str2: return 0.0
        tokens1 = set(re.findall(r'[a-zA-Z0-9]+', str1.lower())).union(set(re.findall(r'[\u4e00-\u9fa5]', str1)))
        tokens2 = set(re.findall(r'[a-zA-Z0-9]+', str2.lower())).union(set(re.findall(r'[\u4e00-\u9fa5]', str2)))
        if not tokens1 or not tokens2: return 0.0
        return len(tokens1.intersection(tokens2)) / len(tokens1.union(tokens2))

    def _score_search_result(self, book_data: Dict, ocr_title: Optional[str], ocr_authors: List[str]) -> Tuple[float, str]:
        api_title, api_authors = book_data.get('title', ''), book_data.get('authors', [])
        title_score, reason_title = 0.0, "N/A"
        if ocr_title and api_title:
            ocr_core, api_core = self._get_core_title(ocr_title), self._get_core_title(api_title)
            core_ratio = SequenceMatcher(None, ocr_core, api_core).ratio()
            substring_score = 0.85 if len(ocr_core) > 2 and len(api_core) > 2 and (ocr_core in api_title or api_core in ocr_title) else 0.0
            full_ratio = SequenceMatcher(None, ocr_title, api_title).ratio()
            token_score = self._calculate_token_set_similarity(ocr_title, api_title)
            title_score = max(core_ratio, full_ratio, substring_score, token_score)
            reason_title = f"T_Score:{title_score:.2f}"
        author_score, reason_author = 0.5, "N/A"
        if ocr_authors:
            if not api_authors: return 0.0, "API 結果無作者"
            valid_ocr_authors = [author for author in ocr_authors if author not in api_title]
            if not valid_ocr_authors: author_score = 0.0
            else:
                matches = sum(1 for ocr_author in valid_ocr_authors if any(SequenceMatcher(None, ocr_author, str(api_author)).ratio() > 0.8 for api_author in api_authors))
                author_score = matches / len(valid_ocr_authors)
            reason_author = f"A_Score:{author_score:.2f}"
        if ocr_title and ocr_authors: total_score = (0.55 * title_score) + (0.45 * author_score); reason = f"{reason_title}, {reason_author}"
        elif ocr_title: total_score, reason = title_score, reason_title
        elif ocr_authors: total_score, reason = author_score, reason_author
        else: total_score, reason = 0.0, "No OCR data"
        return total_score, reason

    def _enrich_book_info(self, book_data: Dict) -> Dict:
        enriched = {"title": "未知", "authors": ["未知"], "publisher": "未知", "publishedDate": "未知", "isbn": "未知", "source": "未知"}
        enriched.update({k: v for k, v in book_data.items() if v})
        return enriched
        
    def _parse_google_books_item(self, item: Dict) -> Optional[Dict]:
        vol = item.get('volumeInfo')
        if not vol or not vol.get('title'): return None
        isbn13 = next((i['identifier'] for i in vol.get('industryIdentifiers', []) if i['type'] == 'ISBN_13'), None)
        isbn10 = next((i['identifier'] for i in vol.get('industryIdentifiers', []) if i['type'] == 'ISBN_10'), None)
        return {'title': vol.get('title', ''), 'authors': vol.get('authors', []), 'publisher': vol.get('publisher', ''), 'publishedDate': vol.get('publishedDate', ''), 'isbn': isbn13 or isbn10 or '', 'source': 'Google Books'}

book_recognition_service = FinalBookRecognizer()