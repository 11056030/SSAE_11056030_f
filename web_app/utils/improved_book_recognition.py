# -*- coding: utf-8 -*-

import re
import requests
import logging
import time
import threading # 導入執行緒模組
from typing import Dict, List, Optional, Tuple
from difflib import SequenceMatcher

# ============================================================================
# 導入你自己的 Google Vision Service
# ============================================================================
from .google_vision_service import google_vision_service
# ============================================================================

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============================================================================
# 全局唯一的 API 鎖和時間戳，徹底解決 429 問題
# ============================================================================
_API_LOCK = threading.Lock()
_LAST_REQUEST_TIME = 0

# ============================================================================
# 視覺化工具 (保留您原始的定義)
# ============================================================================
class TerminalColors:
    HEADER = '\033[95m'; OKBLUE = '\033[94m'; OKCYAN = '\033[96m'; OKGREEN = '\033[92m'
    WARNING = '\033[93m'; FAIL = '\033[91m'; ENDC = '\033[0m'; BOLD = '\033[1m'

class TerminalUI:
    ENABLE_VISUAL = True
    
    @staticmethod
    def print_header(text: str):
        if not TerminalUI.ENABLE_VISUAL: return
        print(f"\n{TerminalColors.HEADER}{TerminalColors.BOLD}{'='*60}{TerminalColors.ENDC}\n{TerminalColors.HEADER}{TerminalColors.BOLD}{text:^60}{TerminalColors.ENDC}\n{TerminalColors.HEADER}{TerminalColors.BOLD}{'='*60}{TerminalColors.ENDC}\n")
    
    @staticmethod
    def print_step(step_num: int, text: str):
        if not TerminalUI.ENABLE_VISUAL: return
        print(f"\n{TerminalColors.OKBLUE}{TerminalColors.BOLD}[步驟 {step_num}]{TerminalColors.ENDC} {text}")
    
    @staticmethod
    def print_success(text: str):
        if not TerminalUI.ENABLE_VISUAL: return
        print(f"{TerminalColors.OKGREEN}✓ {text}{TerminalColors.ENDC}")
    
    @staticmethod
    def print_warning(text: str):
        if not TerminalUI.ENABLE_VISUAL: return
        print(f"{TerminalColors.WARNING}⚠ {text}{TerminalColors.ENDC}")

    @staticmethod
    def print_error(text: str):
        if not TerminalUI.ENABLE_VISUAL: return
        print(f"{TerminalColors.FAIL}✗ {text}{TerminalColors.ENDC}")
    
    @staticmethod
    def print_info(text: str, indent: int = 0):
        if not TerminalUI.ENABLE_VISUAL: return
        prefix = "  " * indent
        print(f"{prefix}{TerminalColors.OKCYAN}→{TerminalColors.ENDC} {text}")
    
    @staticmethod
    def print_text_block(title: str, text: str):
        if not TerminalUI.ENABLE_VISUAL: return
        print(f"\n{TerminalColors.OKCYAN}{'─'*25} {title} {'─'*25}{TerminalColors.ENDC}")
        print(text)
        print(f"{TerminalColors.OKCYAN}{'─'*(52 + len(title))}{TerminalColors.ENDC}")

    @staticmethod
    def print_book_info(book_info: dict):
        if not TerminalUI.ENABLE_VISUAL: return
        print(f"\n{TerminalColors.OKGREEN}{TerminalColors.BOLD}{'─'*60}{TerminalColors.ENDC}")
        print(f"{TerminalColors.OKGREEN}{TerminalColors.BOLD}📖 找到的書籍資訊{TerminalColors.ENDC}")
        print(f"{TerminalColors.OKGREEN}{TerminalColors.BOLD}{'─'*60}{TerminalColors.ENDC}")
        for key, label in [('title', '書名'), ('authors', '作者'), ('publisher', '出版社'), ('publishedDate', '出版日期'), ('isbn', 'ISBN'), ('source', '資料來源')]:
            value = book_info.get(key)
            if isinstance(value, list): value = ', '.join(map(str, value))
            print(f"{TerminalColors.BOLD}{label}：{TerminalColors.ENDC}{value or '未知'}")
        print(f"{TerminalColors.OKGREEN}{TerminalColors.BOLD}{'─'*60}{TerminalColors.ENDC}\n")


# ============================================================================
# 書籍辨識服務核心類別 (Platinum Edition v14.0 - 最終修正版)
# ============================================================================
class FinalBookRecognizer:
    def __init__(self):
        TerminalUI.print_header("📚 初始化書籍辨識服務 (Platinum Edition v14.0)")
        self.google_books_api = {'base_url': 'https://www.googleapis.com/books/v1/volumes'}
        self.request_interval = 1.5

        self.author_keywords = ['著', '譯', '作', '編', '編著', '主編', '監修', '繪', '博士']
        self.author_blacklist = {'團隊', '法則', '趨勢', '世界', '下一步', '自己', '幹到死', '夢想', '你就自己', '為例', '多益', '全新制', '未來', '解析', '布局', '發展', '心法', '思考', '台灣', '對手', '隊友', '大未來', '建立工', 'insight', 'Team', '人類智庫', '蔬適圈', '80年'}
        self.junk_patterns = [r'^(第.*版|.*edition)$', r'^\d+$', r'ISBN|出版|公司|書局', r'暢銷|推薦|No\.1|冠軍', r'^\d+\s*年$']

    def _clean_text(self, text: str) -> str:
        text = re.sub(r'GM\s*大未來', 'AI大未來', text, flags=re.IGNORECASE)
        text = re.sub(r'台\s*出\s*董學堂', '', text, flags=re.IGNORECASE)
        text = re.sub(r'(?<=[\u4e00-\u9fa5])\s(?=[\u4e00-\u9fa5])', '', text)
        return text.strip('.,·• \t\n\r~#弓|').strip()

    def _extract_authors(self, full_text: str) -> List[str]:
        """v14.0 核心修正：正則表達式加入對斜線 `/` 的支持"""
        authors = set()
        # v14.0 關鍵修正：在字元集 `[]` 中加入 `/`
        author_keyword_pattern = r'([\u4e00-\u9fa5a-zA-Z\s\.·、/]{2,30}?)\s*[-—–―\s]*\s*(' + '|'.join(self.author_keywords) + r')'
        matches = re.findall(author_keyword_pattern, full_text)
        
        for name_candidate, keyword in matches:
            cleaned_candidate = self._clean_text(name_candidate.split('\n')[-1])
            # v14.0 關鍵修正：將 `/` 也作為分隔符
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

    def process_book_image(self, image_data: bytes) -> Dict:
        result_template = {"title": "未知", "authors": ["未知"], "publisher": "未知", "publishedDate": "未知", "isbn": "未知", "source": "無"}
        try:
            TerminalUI.print_header("🔍 開始書籍辨識流程 (Platinum Edition v14.0)")
            TerminalUI.print_step(1, "執行 OCR 文字識別與提取")
            ocr_result = google_vision_service.detect_text_with_preprocessing(image_data)
            if not ocr_result.get('success'):
                TerminalUI.print_error("OCR 服務失敗")
                return {"success": False, "book_info": result_template, "error": "OCR 失敗"}
            
            full_text, text_blocks = ocr_result.get('text', ''), ocr_result.get('text_blocks', [])
            TerminalUI.print_success("OCR 識別成功！")
            TerminalUI.print_text_block("OCR 原始識別文字", full_text)
            
            ocr_authors = self._extract_authors(full_text)
            title_candidates = self._extract_title_candidates(text_blocks, ocr_authors)
            best_title = title_candidates[0]['text'] if title_candidates else None
            
            TerminalUI.print_info(f"提取到作者: {ocr_authors if ocr_authors else '無'}", 1)
            TerminalUI.print_info(f"最高分書名候選: {best_title if best_title else '無'}", 1)

            if not best_title and not ocr_authors:
                 TerminalUI.print_error("未提取到任何有效書名或作者資訊。")
                 return {"success": False, "book_info": result_template, "ocr_text": full_text}

            TerminalUI.print_step(2, "執行多樣化線上搜尋與評分")
            search_tasks = self._generate_search_tasks(best_title, ocr_authors)
            best_match, highest_score = None, 0.0
            for i, query in enumerate(search_tasks, 1):
                TerminalUI.print_info(f"任務 {i}/{len(search_tasks)}: 嘗試查詢 '{query}'", 1)
                search_results = self._search_google_books_by_query(query)
                for book_data in search_results:
                    score, reason = self._score_search_result(book_data, best_title, ocr_authors)
                    TerminalUI.print_info(f"檢驗 '{book_data.get('title')}', 分數: {score:.2f} ({reason})", 2)
                    if score > highest_score: highest_score, best_match = score, book_data

            MIN_CONFIDENCE_SCORE = 0.60
            if best_match and highest_score >= MIN_CONFIDENCE_SCORE:
                TerminalUI.print_success(f"找到最佳匹配結果 (信心分數: {highest_score:.2f})！")
                final_book_info = self._enrich_book_info(best_match)
                TerminalUI.print_book_info(final_book_info)
                return {"success": True, "book_info": final_book_info, "ocr_text": full_text}
            
            TerminalUI.print_step(3, "最終回退：回傳 OCR 萃取資訊")
            ocr_book_info = {"title": best_title or "未知", "authors": ocr_authors or ["未知"], "source": "OCR 萃取 (線上無高可信度資料)"}
            final_book_info = self._enrich_book_info(ocr_book_info)
            TerminalUI.print_book_info(final_book_info)
            return {"success": True, "book_info": final_book_info, "ocr_text": full_text}
        except Exception as e:
            TerminalUI.print_error(f"書籍識別流程發生嚴重錯誤: {str(e)}")
            logger.error(f"書籍識別錯誤: {e}", exc_info=True)
            return {"success": False, "book_info": result_template, "error": str(e)}

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
                sleep_time = self.request_interval - elapsed
                TerminalUI.print_info(f"API速率限制：等待 {sleep_time:.2f} 秒", 1)
                time.sleep(sleep_time)
            
            params = {
                'q': self._clean_text(query),
                'maxResults': 3,
                'orderBy': 'relevance',
                'key': 'AIzaSyARwMYmmWQbUeNNxXKP0WAOg0Tlp9xwVXY'  # ← 這裡加上你的 Key
            }
            results = []
            try:
                response = requests.get(self.google_books_api['base_url'], params=params, timeout=5)
                _LAST_REQUEST_TIME = time.time()
                response.raise_for_status()
                if response.json().get('totalItems', 0) > 0:
                    for item in response.json()['items']:
                        if parsed_item := self._parse_google_books_item(item): results.append(parsed_item)
            except requests.RequestException as e:
                _LAST_REQUEST_TIME = time.time()
                logger.error(f"Google Books API 請求失敗 (查詢: '{query}'): {e}")
            return results
        
    def _get_core_title(self, title: str) -> str:
        if not title: return ""
        return re.split(r'[:：—–-]', title)[0].strip()

    def _calculate_token_set_similarity(self, str1: str, str2: str) -> float:
        if not str1 or not str2: return 0.0
        tokens1_en, tokens2_en = set(re.findall(r'[a-zA-Z0-9]+', str1.lower())), set(re.findall(r'[a-zA-Z0-9]+', str2.lower()))
        tokens1_zh, tokens2_zh = set(re.findall(r'[\u4e00-\u9fa5]', str1)), set(re.findall(r'[\u4e00-\u9fa5]', str2))
        tokens1, tokens2 = tokens1_en.union(tokens1_zh), tokens2_en.union(tokens2_zh)
        if not tokens1 or not tokens2: return 0.0
        intersection, union = tokens1.intersection(tokens2), tokens1.union(tokens2)
        return len(intersection) / len(union)

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
        if ocr_title and ocr_authors:
            total_score = (0.55 * title_score) + (0.45 * author_score)
            reason = f"{reason_title}, {reason_author}"
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

# ============================================================================
# 全局實例
# ============================================================================
book_recognition_service = FinalBookRecognizer()