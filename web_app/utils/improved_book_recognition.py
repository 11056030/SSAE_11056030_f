"""
書籍圖像辨識服務 (Book Recognition Service)
================================================

功能概述：
  1. 使用 Google Cloud Vision API 進行 OCR 文字識別
  2. 透過多個書籍資料庫 API 查詢書籍資訊
  3. 智能評分系統選擇最可能的書名
  4. 支援台灣教科書特殊格式識別

技術架構：
  - OCR: Google Cloud Vision API
  - 書籍資料源: Google Books API, Open Library API
  - 文字相似度: difflib.SequenceMatcher
  - 終端機視覺化: ANSI 顏色代碼
"""

import re
import requests
import logging
import time
from typing import Dict, List, Optional, Tuple
from difflib import SequenceMatcher
from collections import Counter
from .google_vision_service import google_vision_service

logger = logging.getLogger(__name__)


# ============================================================================
# 第一部分：終端機視覺化工具
# ============================================================================

class TerminalColors:
    """
    終端機 ANSI 顏色代碼常數
    用於美化 console 輸出，提升除錯體驗
    """
    HEADER = '\033[95m'    # 紫色 - 用於大標題
    OKBLUE = '\033[94m'    # 藍色 - 用於步驟標題
    OKCYAN = '\033[96m'    # 青色 - 用於資訊
    OKGREEN = '\033[92m'   # 綠色 - 用於成功訊息
    WARNING = '\033[93m'   # 黃色 - 用於警告
    FAIL = '\033[91m'      # 紅色 - 用於錯誤
    ENDC = '\033[0m'       # 重置顏色
    BOLD = '\033[1m'       # 粗體
    UNDERLINE = '\033[4m'  # 底線


class TerminalUI:
    """
    終端機視覺化輸出工具
    提供美化的進度顯示、狀態提示等功能
    可透過 ENABLE_VISUAL 開關控制是否啟用
    """
    
    ENABLE_VISUAL = True  # 全局開關，可透過環境變數控制
    
    @staticmethod
    def set_visual_mode(enabled: bool):
        """設定是否啟用視覺化輸出"""
        TerminalUI.ENABLE_VISUAL = enabled
    
    @staticmethod
    def print_header(text: str):
        """
        列印大標題（帶分隔線）
        範例: ========== 📚 初始化書籍辨識服務 ==========
        """
        if not TerminalUI.ENABLE_VISUAL:
            return
        print(f"\n{TerminalColors.HEADER}{TerminalColors.BOLD}{'='*60}{TerminalColors.ENDC}")
        print(f"{TerminalColors.HEADER}{TerminalColors.BOLD}{text:^60}{TerminalColors.ENDC}")
        print(f"{TerminalColors.HEADER}{TerminalColors.BOLD}{'='*60}{TerminalColors.ENDC}\n")
    
    @staticmethod
    def print_step(step_num: int, text: str):
        """
        列印步驟標題
        範例: [步驟 1] 執行 OCR 文字識別
        """
        if not TerminalUI.ENABLE_VISUAL:
            return
        print(f"\n{TerminalColors.OKBLUE}{TerminalColors.BOLD}[步驟 {step_num}]{TerminalColors.ENDC} {text}")
    
    @staticmethod
    def print_success(text: str):
        """列印成功訊息（綠色打勾）"""
        if not TerminalUI.ENABLE_VISUAL:
            return
        print(f"{TerminalColors.OKGREEN}✓ {text}{TerminalColors.ENDC}")
    
    @staticmethod
    def print_warning(text: str):
        """列印警告訊息（黃色警告符號）"""
        if not TerminalUI.ENABLE_VISUAL:
            return
        print(f"{TerminalColors.WARNING}⚠ {text}{TerminalColors.ENDC}")
    
    @staticmethod
    def print_error(text: str):
        """列印錯誤訊息（紅色叉號）"""
        if not TerminalUI.ENABLE_VISUAL:
            return
        print(f"{TerminalColors.FAIL}✗ {text}{TerminalColors.ENDC}")
    
    @staticmethod
    def print_info(text: str, indent: int = 0):
        """
        列印一般資訊（青色箭頭）
        indent: 縮排層級（每層 2 個空格）
        """
        if not TerminalUI.ENABLE_VISUAL:
            return
        prefix = "  " * indent
        print(f"{prefix}{TerminalColors.OKCYAN}→{TerminalColors.ENDC} {text}")
    
    @staticmethod
    def print_progress(current: int, total: int, prefix: str = "進度"):
        """
        列印進度條
        範例: 進度: |████████████░░░░░░░░| 60.0% (12/20)
        """
        if not TerminalUI.ENABLE_VISUAL:
            return
        bar_length = 30
        filled = int(bar_length * current / total)
        bar = '█' * filled + '░' * (bar_length - filled)
        percent = 100 * current / total
        print(f"\r{prefix}: |{bar}| {percent:.1f}% ({current}/{total})", end='', flush=True)
        if current == total:
            print()  # 完成時換行
    
    @staticmethod
    def simulate_processing(duration: float = 0.5, message: str = "處理中"):
        """
        模擬處理過程（顯示動態進度條）
        用於 API 呼叫等待時提供視覺回饋
        """
        if not TerminalUI.ENABLE_VISUAL:
            time.sleep(duration)
            return
        
        steps = 20
        for i in range(steps + 1):
            TerminalUI.print_progress(i, steps, message)
            time.sleep(duration / steps)
    
    @staticmethod
    def print_book_info(book_info: dict):
        """
        美化顯示書籍資訊
        包含書名、作者、出版社、出版日期、ISBN
        """
        if not TerminalUI.ENABLE_VISUAL:
            return
        
        print(f"\n{TerminalColors.OKGREEN}{TerminalColors.BOLD}{'─'*60}{TerminalColors.ENDC}")
        print(f"{TerminalColors.OKGREEN}{TerminalColors.BOLD}📖 找到的書籍資訊{TerminalColors.ENDC}")
        print(f"{TerminalColors.OKGREEN}{TerminalColors.BOLD}{'─'*60}{TerminalColors.ENDC}")
        
        # 書名
        title = book_info.get('title', '未知')
        print(f"{TerminalColors.BOLD}書名：{TerminalColors.ENDC}{title}")
        
        # 作者（處理列表格式）
        authors = book_info.get('authors', ['未知'])
        if isinstance(authors, list):
            authors_str = ', '.join(authors)
        else:
            authors_str = str(authors)
        print(f"{TerminalColors.BOLD}作者：{TerminalColors.ENDC}{authors_str}")
        
        # 出版社
        publisher = book_info.get('publisher', '未知')
        print(f"{TerminalColors.BOLD}出版社：{TerminalColors.ENDC}{publisher}")
        
        # 出版日期
        date = book_info.get('publishedDate', '未知')
        print(f"{TerminalColors.BOLD}出版日期：{TerminalColors.ENDC}{date}")
        
        # ISBN
        isbn = book_info.get('isbn', '未知')
        print(f"{TerminalColors.BOLD}ISBN：{TerminalColors.ENDC}{isbn}")
        
        print(f"{TerminalColors.OKGREEN}{TerminalColors.BOLD}{'─'*60}{TerminalColors.ENDC}\n")
    
    @staticmethod
    def print_candidates(candidates: list, max_show: int = 5):
        """
        顯示書名候選列表（帶評分視覺化）
        範例:
          1. [████████████░░░░░░░░] 0.75
             '深度學習入門'
             方法: block | 原因: 位置靠前, 長度適中
        """
        if not TerminalUI.ENABLE_VISUAL:
            return
        
        for i, candidate in enumerate(candidates[:max_show], 1):
            score = candidate.get('score', 0)
            text = candidate.get('text', '')
            reason = candidate.get('reason', '')
            method = candidate.get('method', '')
            
            # 分數視覺化（20 格進度條）
            score_bar = '█' * int(score * 20)
            
            print(f"{TerminalColors.OKCYAN}  {i}. [{score_bar:<20}] {score:.2f}{TerminalColors.ENDC}")
            print(f"     '{text}'")
            print(f"     {TerminalColors.WARNING}方法: {method} | 原因: {reason}{TerminalColors.ENDC}")


# ============================================================================
# 第二部分：書籍辨識服務核心類別
# ============================================================================

class ImprovedBookRecognitionService:
    """
    改進版書籍辨識服務
    
    辨識流程：
      1. OCR 文字識別（Google Vision API）
      2. ISBN 優先搜尋（最高準確度）
      3. 書名候選提取與評分
      4. 智能搜尋與驗證
      5. 全文搜尋（最後手段）
    
    評分機制：
      - 文字位置權重
      - 字體大小權重
      - 內容特徵分析
      - 上下文驗證
      - 台灣教科書特殊規則
    """
    
    def __init__(self):
        """
        初始化服務：載入 API 配置、關鍵字資料庫、正則表達式規則
        """
        TerminalUI.print_header("📚 初始化書籍辨識服務")
        
        # ===== API 端點配置 =====
        TerminalUI.print_info("設定 Google Books API 端點...")
        self.google_books_api = {
            'base_url': 'https://www.googleapis.com/books/v1/volumes',
            'key': None  # 可選：設定 API Key 以提高配額
        }
        
        TerminalUI.print_info("設定 Open Library API 端點...")
        self.open_library_api = {
            'search_url': 'https://openlibrary.org/search.json',
            'books_url': 'https://openlibrary.org/api/books'
        }
        
        # ===== 台灣書籍資料源（預留擴充用）=====
        TerminalUI.print_info("設定台灣書籍資料源...")
        self.taiwan_sources = {
            'ncl_isbn': 'https://isbn.ncl.edu.tw/NCL_ISBNNet/C00_index.php',
            'books_com_tw': 'https://search.books.com.tw/search/query/key/',
            'eslite': 'https://www.eslite.com/search?searchType=keyword&keyword=',
        }
        
        # ===== 台灣出版社資料庫 =====
        TerminalUI.print_info("載入台灣出版社資料庫...")
        self.taiwan_publishers = {
            '教科書': [
                '康軒', '南一', '翰林', '龍騰', '三民', '東大', '泰宇',
                '全華', '啟芳', '華興', '育達', '弘道', '謳馨', '大同'
            ],
            '一般出版': [
                '遠流', '天下', '商周', '時報', '聯經', '麥田', '皇冠',
                '圓神', '寶瓶', '大塊', '印刻', '九歌', '二魚', '尖端',
                '臉譜', '究竟', '方智', '先覺', '如何', '平安', '寂寞'
            ]
        }
        TerminalUI.print_success(f"載入 {len(self.taiwan_publishers['教科書'])} 家教科書出版社")
        TerminalUI.print_success(f"載入 {len(self.taiwan_publishers['一般出版'])} 家一般出版社")
        
        # ===== 無效書名模式（正則表達式）=====
        # 用於過濾不可能是書名的文字（如 ISBN、價格、日期等）
        TerminalUI.print_info("設定無效書名模式...")
        self.invalid_title_patterns = [
            r'^ISBN[-:\s]*[\d\-Xx]+$',      # ISBN 格式
            r'^\d{10,13}$',                  # 純數字（可能是 ISBN）
            r'^第?\d+版$',                   # 版本號
            r'^初版$', r'^修訂版$', r'^增訂版$',
            r'^\d+刷$', r'^\d+印$',          # 印刷次數
            r'^定價[:：\s]*[\d\$￥元]+',     # 價格
            r'^NT\$?\d+', r'^[\d\$￥元,]+元?$',
            r'^\d{4}年\d{1,2}月',            # 日期格式
            r'^\d{4}/\d{1,2}', r'^\d{4}-\d{1,2}',
            r'^頁數[:：]\d+', r'^\d+頁$', r'^\d+p\.?$',  # 頁數
            r'^作者[:：]', r'^著者[:：]', r'^編者[:：]', r'^譯者[:：]',  # 角色標籤
            r'^出版社?[:：]', r'^發行[:：]',  # 出版資訊
            r'^copyright', r'^©\s*\d{4}', r'^All Rights Reserved', r'^版權所有',
            r'www\.', r'http[s]?://', r'\.com', r'\.tw', r'\.org',  # 網址
            r'^\d{8,}$',                     # 長數字串
            r'^[\d\s\-_\.]+$',               # 純符號數字
            r'^[^\w\u4e00-\u9fff]+$',        # 無文字內容
            r'^.{1,2}$',                     # 太短（1-2 字元）
        ]
        TerminalUI.print_success(f"載入 {len(self.invalid_title_patterns)} 個無效模式")
        
        # ===== 關鍵字資料庫 =====
        TerminalUI.print_info("設定關鍵字資料庫...")
        
        # 教科書特徵關鍵字
        self.textbook_keywords = [
            '國中', '高中', '國小', '高職',
            '數學', '國文', '英文', '理化', '生物', '物理', '化學',
            '歷史', '地理', '公民', '社會',
            '上冊', '下冊', '第.*冊',
            '學習手冊', '習作', '講義', '自修',
            '康軒版', '南一版', '翰林版', '龍騰版'
        ]
        
        # 出版社相關關鍵字
        self.publisher_keywords = [
            '出版社', '出版', '出版者', '發行',
            'publishing', 'press', 'publisher',
            '印刷', '書局', '文化', '圖書', '書房'
        ]
        
        # 作者相關關鍵字
        self.author_keywords = [
            '作者', '著', '編著', '主編', '譯者', '編譯', '撰',
            'author', 'by', 'written by', 'edited by', 'translator'
        ]
        
        TerminalUI.print_success("服務初始化完成！")
        time.sleep(0.3)

    # ========================================================================
    # 主要流程：書籍圖像處理
    # ========================================================================

    def process_book_image(self, image_data: bytes) -> Dict:
        """
        完整的書籍圖像處理流程（主入口函數）
        
        參數:
            image_data: 圖像的二進制數據
            
        返回:
            Dict: {
                'success': bool,           # 是否成功識別
                'book_info': Dict,         # 書籍資訊
                'ocr_text': str,           # OCR 提取的文字
                'search_method': str,      # 搜尋方法（isbn/title/fulltext）
                'confidence': float,       # 信心度（0-1）
                'error': str (可選)        # 錯誤訊息
            }
        
        辨識流程:
            步驟 1: OCR 文字識別
            步驟 2: ISBN 優先搜尋（如果找到 ISBN）
            步驟 3: 書名候選提取與搜尋
            步驟 4: 全文搜尋（最後手段）
            步驟 5: 全部失敗，返回未知
        """
        try:
            TerminalUI.print_header("🔍 開始書籍辨識流程")
            logger.info("=== 開始書籍識別流程 ===")

            # 預設返回模板（識別失敗時使用）
            result_template = {
                "title": "未知",
                "authors": ["未知"],
                "publisher": "未知",
                "publishedDate": "未知",
                "isbn": "未知"
            }

            # ================================================================
            # 步驟 1: OCR 文字識別
            # ================================================================
            TerminalUI.print_step(1, "執行 OCR 文字識別")
            TerminalUI.print_info("呼叫 Google Vision API...", 1)
            logger.info("步驟 1: 執行 OCR 文字識別")
            
            # 模擬處理過程（提供視覺回饋）
            TerminalUI.simulate_processing(1.0, "OCR 識別中")
            
            # 呼叫 OCR 服務
            ocr_result = google_vision_service.detect_text_with_preprocessing(image_data)
            
            # 檢查 OCR 是否成功
            if not ocr_result.get('success'):
                TerminalUI.print_error("OCR 識別失敗")
                return {
                    "success": False,
                    "book_info": result_template,
                    "error": "無法提取文字"
                }

            # 提取 OCR 結果
            extracted_text = ocr_result.get('text', '').strip()
            text_blocks = ocr_result.get('text_blocks', [])      # 結構化文字塊
            isbn_candidates = ocr_result.get('isbn_candidates', [])  # ISBN 候選

            # 檢查是否有有效文字
            if not extracted_text:
                TerminalUI.print_error("未檢測到有效文字")
                return {
                    "success": False,
                    "book_info": result_template,
                    "error": "未檢測到有效文字"
                }

            # 顯示 OCR 結果統計
            TerminalUI.print_success(f"OCR 識別成功！")
            TerminalUI.print_info(f"提取文字長度: {len(extracted_text)} 字元", 1)
            TerminalUI.print_info(f"文字塊數量: {len(text_blocks)} 個", 1)
            TerminalUI.print_info(f"找到 ISBN 候選: {len(isbn_candidates)} 個", 1)
            
            # 顯示找到的 ISBN
            if isbn_candidates:
                for isbn in isbn_candidates:
                    TerminalUI.print_info(f"• {isbn}", 2)
            
            logger.info(f"OCR 成功，提取文字長度: {len(extracted_text)}")
            logger.info(f"找到 {len(isbn_candidates)} 個 ISBN 候選")
            time.sleep(0.3)

            # ================================================================
            # 步驟 2: ISBN 優先搜尋（最高準確度）
            # ================================================================
            if isbn_candidates:
                TerminalUI.print_step(2, "嘗試 ISBN 搜尋（最高準確度）")
                logger.info("步驟 2: 嘗試 ISBN 搜尋")
                
                # 逐一搜尋每個 ISBN 候選
                for i, isbn in enumerate(isbn_candidates, 1):
                    TerminalUI.print_info(f"搜尋 ISBN {i}/{len(isbn_candidates)}: {isbn}", 1)
                    TerminalUI.simulate_processing(0.8, "搜尋中")
                    
                    # 搜尋並驗證 ISBN
                    result = self._search_and_verify_isbn(isbn, extracted_text)
                    
                    if result.get("success"):
                        # ISBN 搜尋成功！直接返回結果
                        TerminalUI.print_success(f"ISBN 搜尋成功！信心度: {result['confidence']:.2%}")
                        logger.info(f"✓ ISBN 搜尋成功: {isbn}")
                        
                        # 補齊書籍資訊
                        enriched = self._enrich_book_info(result["data"])
                        TerminalUI.print_book_info(enriched)
                        
                        return {
                            "success": True,
                            "book_info": enriched,
                            "ocr_text": extracted_text,
                            "search_method": "isbn",
                            "confidence": result["confidence"]
                        }
                    else:
                        TerminalUI.print_warning(f"ISBN {isbn} 未找到結果")
                
                time.sleep(0.3)

            # ================================================================
            # 步驟 3: 書名候選提取與搜尋
            # ================================================================
            TerminalUI.print_step(3, "提取並分析書名候選")
            TerminalUI.print_info("使用多種方法提取書名...", 1)
            logger.info("步驟 3: 提取書名候選並搜尋")
            
            TerminalUI.simulate_processing(0.6, "分析中")
            
            # 提取書名候選（多種方法）
            title_candidates = self._extract_title_candidates_v2(text_blocks, extracted_text)
            
            TerminalUI.print_success(f"找到 {len(title_candidates)} 個書名候選")
            logger.info(f"找到 {len(title_candidates)} 個書名候選")
            
            if title_candidates:
                # 顯示候選列表
                TerminalUI.print_candidates(title_candidates)
                
                # 智能搜尋與驗證
                TerminalUI.print_info("開始逐一搜尋候選書名...", 1)
                result = self._smart_search_and_verify_v2(title_candidates, extracted_text)
                
                if result.get("success"):
                    # 書名搜尋成功！
                    TerminalUI.print_success(f"書名搜尋成功！信心度: {result['confidence']:.2%}")
                    logger.info("✓ 書名搜尋成功")
                    
                    enriched = self._enrich_book_info(result["data"])
                    TerminalUI.print_book_info(enriched)
                    
                    return {
                        "success": True,
                        "book_info": enriched,
                        "ocr_text": extracted_text,
                        "search_method": "title",
                        "confidence": result["confidence"]
                    }
                else:
                    TerminalUI.print_warning("書名搜尋未找到匹配結果")
            
            time.sleep(0.3)

            # ================================================================
            # 步驟 4: 全文搜尋（最後手段，準確度較低）
            # ================================================================
            TerminalUI.print_step(4, "嘗試全文搜尋（最後手段）")
            search_text = extracted_text[:80]  # 取前 80 字元
            TerminalUI.print_info(f"搜尋文字: {search_text}...", 1)
            logger.info("步驟 4: 嘗試全文搜尋")
            
            TerminalUI.simulate_processing(0.8, "搜尋中")
            result = self._search_by_title(search_text)
            
            if result.get("success"):
                TerminalUI.print_success("全文搜尋找到結果")
                TerminalUI.print_warning("注意：全文搜尋準確度較低，請確認資訊")
                logger.info("✓ 全文搜尋成功")
                
                enriched = self._enrich_book_info(result["data"])
                TerminalUI.print_book_info(enriched)
                
                return {
                    "success": True,
                    "book_info": enriched,
                    "ocr_text": extracted_text,
                    "search_method": "fulltext",
                    "confidence": 0.4  # 全文搜尋信心度固定為 0.4
                }

            # ================================================================
            # 步驟 5: 全部失敗
            # ================================================================
            TerminalUI.print_error("所有搜尋方法均失敗")
            TerminalUI.print_warning("建議：請手動輸入書籍資訊")
            logger.warning("所有搜尋方法均失敗")
            
            return {
                "success": False,
                "book_info": result_template,
                "ocr_text": extracted_text
            }

        except Exception as e:
            # 異常處理
            TerminalUI.print_error(f"書籍識別錯誤: {str(e)}")
            logger.error(f"書籍識別錯誤: {e}", exc_info=True)
            return {
                "success": False,
                "book_info": result_template,
                "error": str(e),
                "ocr_text": ""
            }

    # ========================================================================
    # 輔助函數：書籍資訊補齊
    # ========================================================================

    def _enrich_book_info(self, book_data: Dict) -> Dict:
        """
        補齊書籍資訊，確保所有欄位都有預設值
        如果缺少 ISBN，嘗試用書名再次查詢
        """
        title = book_data.get("title") or "未知"
        authors = book_data.get("authors") or ["未知"]
        publisher = book_data.get("publisher") or "未知"
        published_date = book_data.get("publishedDate") or "未知"
        
        # 如果沒有 ISBN，嘗試用書名查詢
        isbn = book_data.get("isbn") or self._try_fetch_isbn_from_apis(title)

        return {
            "title": title,
            "authors": authors if isinstance(authors, list) else [authors],
            "publisher": publisher,
            "publishedDate": published_date,
            "isbn": isbn or "未知"
        }

    def _try_fetch_isbn_from_apis(self, title: str) -> Optional[str]:
        """
        嘗試用書名從 Google Books API 查詢 ISBN
        """
        try:
            r = requests.get(
                f"{self.google_books_api['base_url']}?q={title}",
                timeout=10
            )
            if r.status_code == 200:
                items = r.json().get("items", [])
                if items:
                    # 提取第一個結果的 ISBN
                    identifiers = items[0]["volumeInfo"].get("industryIdentifiers", [])
                    for iden in identifiers:
                        if iden.get("type") in ["ISBN_10", "ISBN_13"]:
                            return iden.get("identifier")
        except Exception as e:
            logger.error(f"查詢 ISBN 失敗: {e}")
        return None

    # ========================================================================
    # 台灣教科書檢測
    # ========================================================================

    def _detect_taiwan_textbook(self, text: str) -> bool:
        """
        檢測是否為台灣教科書
        
        評分機制:
            - 教科書關鍵字: 每個 +1 分
            - 出版社匹配: +2 分
            - 年級格式: +2 分
            - 冊數格式: +1 分
            - 總分 >= 3 判定為教科書
        """
        TerminalUI.print_info("檢查教科書特徵...", 1)
        score = 0
        found_features = []
        
        # 檢查教科書關鍵字
        for keyword in self.textbook_keywords:
            if re.search(keyword, text):
                score += 1
                found_features.append(keyword)
        
        if found_features:
            TerminalUI.print_info(f"找到關鍵字: {', '.join(found_features[:5])}", 2)
        
        # 檢查台灣出版社
        all_publishers = []
        for publishers in self.taiwan_publishers.values():
            all_publishers.extend(publishers)
        
        for publisher in all_publishers:
            if publisher in text:
                score += 2
                TerminalUI.print_info(f"找到出版社: {publisher}", 2)
                break
        
        # 檢查年級格式（如：國中1、高中2）
        if re.search(r'(國|高)(中|小|職)\s*\d+', text):
            score += 2
        
        # 檢查冊數格式（如：第一冊）
        if re.search(r'第[一二三四五六1-6]冊', text):
            score += 1
        
        TerminalUI.print_info(f"教科書特徵分數: {score}/10", 1)
        logger.info(f"台灣教科書特徵分數: {score}")
        
        return score >= 3

    # ========================================================================
    # 核心功能：書名候選提取（三種方法）
    # ========================================================================

    def _extract_title_candidates_v2(self, text_blocks: List[Dict], 
                                     full_text: str, 
                                     is_textbook: bool = False) -> List[Dict]:
        """
        從 OCR 結果提取可能的書名候選
        
        三種提取方法:
            1. 文字塊提取: 基於 OCR 返回的結構化文字塊
            2. 文字行提取: 按換行符分割的文字行
            3. 大字體提取: 尋找字體最大的文字（通常是標題）
        
        返回:
            List[Dict]: 候選列表，每個包含：
                - text: 候選文字
                - score: 評分（0-1）
                - method: 提取方法
                - reason: 評分原因
                - position: 文字位置
        """
        candidates = []
        lines = full_text.split('\n')
        
        # ===== 方法 1: 從文字塊提取 =====
        if text_blocks:
            logger.info("方法1: 從文字塊提取")
            for idx, block in enumerate(text_blocks[:20]):  # 只處理前 20 個文字塊
                text = block.get('text', '').strip()
                confidence = block.get('confidence', 0.5)  # OCR 置信度
                position = idx
                
                # 評分
                score, reason = self._score_title_candidate_v2(
                    text, full_text, confidence, position, is_textbook
                )
                
                # 只保留分數 > 0.25 的候選
                if score > 0.25:
                    candidates.append({
                        'text': text,
                        'score': score,
                        'method': 'block',
                        'reason': reason,
                        'position': position
                    })
        
        # ===== 方法 2: 從文字行提取 =====
        logger.info("方法2: 從文字行提取")
        for i, line in enumerate(lines[:20]):  # 只處理前 20 行
            line = line.strip()
            
            # 跳過空行或太短的行
            if not line or len(line) < 3:
                continue
            
            # 位置權重：越靠前權重越高
            position_weight = 1.0 - (i * 0.03)
            
            # 評分
            score, reason = self._score_title_candidate_v2(
                line, full_text, 0.8, i, is_textbook
            )
            
            score *= position_weight
            
            if score > 0.25:
                candidates.append({
                    'text': line,
                    'score': score,
                    'method': 'line',
                    'reason': reason,
                    'position': i
                })
        
        # ===== 方法 3: 尋找大字體文字 =====
        if text_blocks:
            logger.info("方法3: 尋找大字體文字")
            largest_texts = self._find_largest_text_blocks(text_blocks)
            for text in largest_texts:
                score, reason = self._score_title_candidate_v2(
                    text, full_text, 0.9, 0, is_textbook
                )
                if score > 0.2:
                    # 大字體文字額外加 0.2 分
                    candidates.append({
                        'text': text,
                        'score': score + 0.2,
                        'method': 'largest',
                        'reason': f'大字體 + {reason}',
                        'position': 0
                    })
        
        # ===== 去重並排序 =====
        seen = set()
        unique_candidates = []
        for c in candidates:
            # 標準化文字用於去重
            text_normalized = self._normalize_for_comparison(c['text'])
            if text_normalized not in seen and len(text_normalized) >= 3:
                seen.add(text_normalized)
                unique_candidates.append(c)
        
        # 按分數降序排列
        sorted_candidates = sorted(unique_candidates, key=lambda x: x['score'], reverse=True)
        
        # 記錄前 5 個候選
        for i, c in enumerate(sorted_candidates[:5]):
            logger.info(f"  候選 {i+1}: '{c['text']}' (分數: {c['score']:.2f}, 原因: {c['reason']})")
        
        return sorted_candidates

    def _find_largest_text_blocks(self, text_blocks: List[Dict]) -> List[str]:
        """
        尋找字體最大的文字塊
        
        原理: 通過 boundingBox 的高度判斷字體大小
        書籍封面的標題通常使用最大字體
        """
        texts_with_height = []
        
        for block in text_blocks:
            text = block.get('text', '').strip()
            if not text:
                continue
            
            # 提取邊界框
            bbox = block.get('boundingBox', {})
            if bbox and 'vertices' in bbox:
                vertices = bbox['vertices']
                if len(vertices) >= 4:
                    # 計算高度（y 軸差值）
                    height = abs(vertices[2].get('y', 0) - vertices[0].get('y', 0))
                    texts_with_height.append((text, height))
        
        if not texts_with_height:
            return []
        
        # 按高度降序排列，取前 3 個
        texts_with_height.sort(key=lambda x: x[1], reverse=True)
        return [t[0] for t in texts_with_height[:3]]

    # ========================================================================
    # 核心功能：書名候選評分（最重要的函數）
    # ========================================================================

    def _score_title_candidate_v2(self, text: str, context: str, 
                                   base_confidence: float, position: int, 
                                   is_textbook: bool) -> Tuple[float, str]:
        """
        為書名候選評分（核心評分邏輯）
        
        評分維度:
            1. 長度檢查（4-25 字為佳）
            2. 內容組成（中文/英文/數字比例）
            3. 無效模式過濾（ISBN、價格、日期等）
            4. 負面關鍵字懲罰（出版社、定價等）
            5. 位置權重（越靠前越可能是標題）
            6. 上下文驗證（附近是否有作者、出版社資訊）
            7. 教科書特殊規則（科目、年級、冊數）
            8. 格式特徵（副標題、重複出現等）
        
        參數:
            text: 候選文字
            context: 完整 OCR 文字（用於上下文分析）
            base_confidence: OCR 基礎置信度
            position: 文字位置（從 0 開始）
            is_textbook: 是否為教科書
            
        返回:
            (score, reason): 分數和評分原因
        """
        # ===== 基本檢查 =====
        if not text or len(text) < 3:
            return 0.0, "太短"
        
        reasons = []
        score = base_confidence * 0.2  # 基礎分數
        
        # ===== 無效模式檢查（硬性排除）=====
        for pattern in self.invalid_title_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                return 0.0, f"匹配無效模式"
        
        # ===== 嚴格負面關鍵字（大幅扣分）=====
        strict_negative = [
            ('出版社', 0.8), ('印刷', 0.8), ('發行', 0.7),
            ('定價', 0.9), ('價格', 0.9), ('NT', 0.9),
            ('ISBN', 0.9), ('版權', 0.8), ('copyright', 0.9),
            ('頁數', 0.8), ('www.', 0.9), ('http', 0.9),
            ('.com', 0.9), ('.tw', 0.9), ('.org', 0.9),
        ]
        
        for keyword, penalty in strict_negative:
            if re.search(keyword, text, re.IGNORECASE):
                score -= penalty
                if score <= 0:
                    return 0.0, f"包含排除關鍵字: {keyword}"
        
        # ===== 長度評分 =====
        length = len(text)
        if 4 <= length <= 25:
            score += 0.4
            reasons.append("長度適中")
        elif 3 <= length <= 35:
            score += 0.2
            reasons.append("長度可接受")
        elif length > 50:
            score -= 0.3
            reasons.append("過長")
        
        # ===== 內容組成分析 =====
        chinese_count = len(re.findall(r'[\u4e00-\u9fff]', text))
        english_count = len(re.findall(r'[a-zA-Z]', text))
        digit_count = len(re.findall(r'\d', text))
        
        # 中文或英文為主都加分
        if chinese_count >= length * 0.5:
            score += 0.3
            reasons.append("中文為主")
        elif english_count >= length * 0.5:
            score += 0.3
            reasons.append("英文為主")
        
        # 數字過多扣分
        if digit_count > length * 0.4:
            score -= 0.4
            reasons.append("數字過多")
        elif 0 < digit_count <= 3:
            score += 0.05  # 少量數字（如版本號）小幅加分
        
        # ===== 教科書特殊規則 =====
        if is_textbook:
            textbook_score = 0
            
            # 檢查科目
            subjects = ['數學', '國文', '英文', '理化', '生物', '物理', 
                       '化學', '歷史', '地理', '公民', '社會', '自然']
            for subject in subjects:
                if subject in text:
                    textbook_score += 0.3
                    reasons.append(f"包含科目: {subject}")
                    break
            
            # 檢查年級
            if re.search(r'(國|高)(中|小|職)', text):
                textbook_score += 0.2
                reasons.append("包含年級")
            
            # 檢查冊數
            if re.search(r'第?[一二三四五六1-6]冊', text) or re.search(r'[上下]冊', text):
                textbook_score += 0.2
                reasons.append("包含冊數")
            
            # 檢查出版社
            for publishers in self.taiwan_publishers.values():
                for pub in publishers:
                    if pub in text:
                        textbook_score += 0.15
                        reasons.append(f"包含出版社: {pub}")
                        break
            
            score += textbook_score
        
        # ===== 位置權重 =====
        if position <= 2:
            score += 0.25
            reasons.append("位置靠前")
        elif position <= 5:
            score += 0.15
            reasons.append("位置較前")
        
        # ===== 上下文驗證 =====
        context_window = self._get_context_window(text, context, 150)
        
        # 檢查附近是否有作者資訊
        for kw in self.author_keywords:
            if kw in context_window:
                score += 0.15
                reasons.append("附近有作者資訊")
                break
        
        # 檢查附近是否有出版社資訊
        for kw in self.publisher_keywords:
            if kw in context_window:
                score += 0.1
                reasons.append("附近有出版社資訊")
                break
        
        # ===== 格式特徵 =====
        # 檢查副標題格式（如：深度學習：理論與實踐）
        if '：' in text or ':' in text:
            parts = re.split('[：:]', text)
            if len(parts) == 2 and all(len(p.strip()) >= 3 for p in parts):
                score += 0.15
                reasons.append("有副標題格式")
        
        # 特殊符號過多扣分
        special_chars = re.findall(r'[^\w\s\u4e00-\u9fff：:、，。！？—《》（）【】]', text)
        if len(special_chars) > 4:
            score -= 0.25
            reasons.append("特殊符號過多")
        
        # 重複出現加分（書名可能在封面出現多次）
        occurrences = context.lower().count(text.lower())
        if occurrences >= 2:
            score += min(0.2, occurrences * 0.08)
            reasons.append(f"重複出現{occurrences}次")
        
        # ===== 英文標題大小寫檢查 =====
        if english_count > chinese_count and english_count >= 5:
            words = text.split()
            if len(words) >= 2:
                # 統計首字母大寫的單詞數
                capitalized = sum(1 for w in words if w and w[0].isupper())
                if capitalized >= len(words) * 0.6:
                    score += 0.2
                    reasons.append("英文標題大小寫")
        
        # ===== 最終分數限制在 0-1 之間 =====
        final_score = max(0.0, min(1.0, score))
        reason_str = ", ".join(reasons) if reasons else "無特殊特徵"
        
        return final_score, reason_str

    # ========================================================================
    # 輔助函數：文字處理
    # ========================================================================

    def _normalize_for_comparison(self, text: str) -> str:
        """
        標準化文字用於比較和去重
        移除所有非文字字元，轉為小寫
        """
        text = text.lower()
        text = re.sub(r'[^\w\u4e00-\u9fff]', '', text)
        return text.strip()

    def _get_context_window(self, text: str, full_text: str, window_size: int) -> str:
        """
        獲取文字周圍的上下文（前後各 window_size 字元）
        用於分析書名附近是否有作者、出版社等資訊
        """
        try:
            pos = full_text.lower().find(text.lower())
            if pos == -1:
                return ""
            
            start = max(0, pos - window_size)
            end = min(len(full_text), pos + len(text) + window_size)
            return full_text[start:end]
        except:
            return ""

    # ========================================================================
    # 智能搜尋與驗證
    # ========================================================================

    def _smart_search_and_verify_v2(self, candidates: List[Dict], ocr_text: str, 
                                     is_textbook: bool = False) -> Dict:
        """
        智能搜尋與驗證書名候選
        
        流程:
            1. 逐一搜尋前 8 個候選
            2. 計算每個結果的匹配信心度
            3. 選擇信心度最高的結果
            4. 信心度閾值判斷：
               - > 0.4: 接受
               - 0.3-0.4: 低信心度警告
               - < 0.3: 拒絕
        """
        results = []
        
        # 逐一搜尋候選
        for i, candidate in enumerate(candidates[:8], 1):  # 最多搜尋 8 個
            title = candidate['text']
            candidate_score = candidate['score']
            
            TerminalUI.print_info(f"搜尋候選 {i}: '{title}' (分數: {candidate_score:.2f})", 2)
            logger.info(f"搜尋候選: '{title}' (分數: {candidate_score:.2f})")
            
            TerminalUI.simulate_processing(0.5, "搜尋中")
            
            # 教科書優先搜尋台灣資料庫（目前未實作）
            if is_textbook:
                search_result = self._search_taiwan_by_title(title, ocr_text)
                if search_result.get('success'):
                    book_data = search_result['data']
                    confidence = self._calculate_match_confidence(
                        title, book_data, ocr_text, candidate_score
                    )
                    
                    if confidence > 0.35:
                        results.append({
                            'data': book_data,
                            'confidence': confidence
                        })
                        continue
            
            # 搜尋國際書籍資料庫
            search_result = self._search_by_title(title)
            
            if not search_result.get('success'):
                TerminalUI.print_warning("未找到結果")
                continue
            
            book_data = search_result['data']
            
            # 計算匹配信心度
            confidence = self._calculate_match_confidence(
                title, book_data, ocr_text, candidate_score
            )
            
            if confidence > 0.3:
                results.append({
                    'data': book_data,
                    'confidence': confidence
                })
                TerminalUI.print_success(f"找到匹配結果 (信心度: {confidence:.2%})")
        
        # 沒有找到任何結果
        if not results:
            return {'success': False, 'error': '未找到匹配結果'}
        
        # 選擇信心度最高的結果
        best = max(results, key=lambda x: x['confidence'])
        
        # 信心度閾值判斷
        if best['confidence'] > 0.4:
            logger.info(f"✓ 接受結果 (信心度: {best['confidence']:.2f})")
            return {
                'success': True,
                'data': best['data'],
                'confidence': best['confidence']
            }
        elif best['confidence'] > 0.3:
            logger.info(f"⚠ 低信心度結果 (信心度: {best['confidence']:.2f})")
            best['data']['low_confidence'] = True
            return {
                'success': True,
                'data': best['data'],
                'confidence': best['confidence'],
                'warning': '識別信心度較低，請確認資訊是否正確'
            }
        
        # 信心度太低，拒絕結果
        return {
            'success': False,
            'error': '匹配信心度不足',
            'best_match': best['data'].get('title'),
            'confidence': best['confidence']
        }

    def _calculate_match_confidence(self, query_title: str, book_data: Dict, 
                                    ocr_text: str, candidate_score: float) -> float:
        """
        計算搜尋結果與 OCR 的匹配信心度
        
        三個評分維度:
            1. 標題相似度（45%）: 查詢標題 vs 結果標題
            2. 上下文評分（35%）: 作者、出版社、ISBN 是否在 OCR 文字中
            3. 候選評分（20%）: 原始候選的評分
        """
        result_title = book_data.get('title', '')
        
        # ===== 1. 標題相似度 =====
        exact_similarity = self._calculate_similarity(
            self._normalize_title(query_title),
            self._normalize_title(result_title)
        )
        
        query_norm = self._normalize_title(query_title)
        result_norm = self._normalize_title(result_title)
        
        # 子字串包含關係
        contains_score = 0.0
        if query_norm in result_norm:
            contains_score = 0.7
        elif result_norm in query_norm:
            contains_score = 0.6
        
        title_similarity = max(exact_similarity, contains_score)
        
        logger.info(f"  標題相似度: {title_similarity:.2f} (查詢: '{query_title}' vs 結果: '{result_title}')")
        
        # ===== 2. 上下文評分 =====
        context_score = 0.0
        
        # 檢查作者
        authors = book_data.get('authors', [])
        for author in authors:
            author_parts = re.split(r'[\s,，]', author)
            for part in author_parts:
                if len(part) >= 2 and part in ocr_text:
                    context_score += 0.15
                    logger.info(f"  ✓ 找到作者: {part}")
                    break
        
        # 檢查出版社
        publisher = book_data.get('publisher', '')
        if publisher:
            publisher_clean = re.sub(
                r'(出版社|出版|社|press|publishing)', 
                '', 
                publisher, 
                flags=re.IGNORECASE
            )
            if len(publisher_clean) >= 2:
                if publisher_clean in ocr_text or publisher in ocr_text:
                    context_score += 0.2
                    logger.info(f"  ✓ 找到出版社: {publisher}")
        
        # 檢查 ISBN
        isbn = book_data.get('isbn', '')
        if isbn:
            isbn_clean = re.sub(r'[-\s]', '', isbn)
            ocr_clean = re.sub(r'[-\s]', '', ocr_text)
            if isbn_clean in ocr_clean:
                context_score += 0.25
                logger.info(f"  ✓ 找到 ISBN: {isbn}")
        
        # ===== 3. 綜合計算 =====
        confidence = (
            title_similarity * 0.45 +
            context_score * 0.35 +
            candidate_score * 0.2
        )
        
        logger.info(f"  綜合信心度: {confidence:.2f}")
        return confidence

    def _search_and_verify_isbn(self, isbn: str, ocr_text: str) -> Dict:
        """
        搜尋並驗證 ISBN 結果
        ISBN 搜尋基礎信心度為 0.75（高）
        如果書名或作者也在 OCR 中找到，信心度進一步提升
        """
        result = self._search_by_isbn(isbn)
        
        if not result.get('success'):
            return result
        
        book_data = result['data']
        confidence = 0.75  # ISBN 搜尋基礎信心度
        
        # 書名驗證
        title = book_data.get('title', '')
        if title:
            title_parts = re.split(r'[\s:：]+', title)
            for part in title_parts:
                if len(part) >= 3 and part in ocr_text:
                    confidence += 0.05
        
        # 作者驗證
        authors = book_data.get('authors', [])
        for author in authors:
            if author in ocr_text:
                confidence += 0.05
        
        book_data['confidence'] = min(1.0, confidence)
        return {
            'success': True,
            'data': book_data,
            'confidence': book_data['confidence']
        }

    # ========================================================================
    # 文字標準化與相似度計算
    # ========================================================================

    def _normalize_title(self, title: str) -> str:
        """
        標準化書名用於比較
        移除版本號、特殊字元等干擾因素
        """
        title = title.lower()
        title = re.sub(r'第?\d+版', '', title)  # 移除版本號
        title = re.sub(r'\d+th\s+edition', '', title)
        title = re.sub(r'revised\s+edition', '', title)
        title = re.sub(r'[^\w\u4e00-\u9fff]', '', title)  # 只保留文字
        return title.strip()

    def _calculate_similarity(self, text1: str, text2: str) -> float:
        """
        計算兩個文字的相似度（0-1）
        使用 SequenceMatcher 算法（基於最長公共子序列）
        """
        return SequenceMatcher(None, text1, text2).ratio()

    # ========================================================================
    # API 搜尋函數
    # ========================================================================

    def _search_by_isbn(self, isbn: str) -> Dict:
        """
        通過 ISBN 搜尋書籍
        優先 Google Books，失敗則嘗試 Open Library
        """
        result = self._search_google_books_by_isbn(isbn)
        if result:
            return {'success': True, 'data': result}
        
        result = self._search_openlibrary_by_isbn(isbn)
        if result:
            return {'success': True, 'data': result}
        
        return {'success': False, 'error': f'未找到 ISBN: {isbn}'}

    def _search_by_title(self, title: str) -> Dict:
        """
        通過書名搜尋書籍
        優先 Google Books，失敗則嘗試 Open Library
        如果標題有副標題，也嘗試只用主標題搜尋
        """
        result = self._search_google_books_by_title(title)
        if result:
            return {'success': True, 'data': result}
        
        result = self._search_openlibrary_by_title(title)
        if result:
            return {'success': True, 'data': result}
        
        # 嘗試只用主標題搜尋（去除副標題）
        if '：' in title or ':' in title:
            main_title = re.split('[：:]', title)[0].strip()
            if len(main_title) >= 3:
                result = self._search_google_books_by_title(main_title)
                if result:
                    return {'success': True, 'data': result}
        
        return {'success': False, 'error': f'未找到書名: {title}'}

    # ========================================================================
    # Google Books API
    # ========================================================================

    def _search_google_books_by_isbn(self, isbn: str) -> Optional[Dict]:
        """
        使用 Google Books API 通過 ISBN 搜尋
        API 文檔: https://developers.google.com/books
        """
        try:
            params = {'q': f'isbn:{isbn}', 'maxResults': 1}
            if self.google_books_api['key']:
                params['key'] = self.google_books_api['key']
            
            response = requests.get(
                self.google_books_api['base_url'],
                params=params,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('totalItems', 0) > 0:
                    return self._parse_google_books_item(data['items'][0])
        except Exception as e:
            logger.error(f"Google Books ISBN 搜尋錯誤: {e}")
        
        return None

    def _search_google_books_by_title(self, title: str) -> Optional[Dict]:
        """
        使用 Google Books API 通過書名搜尋
        
        搜尋策略:
            1. 先用 intitle 精確搜尋
            2. 失敗則用普通搜尋
            3. 從結果中選擇相似度最高的
        """
        try:
            search_queries = [
                f'intitle:"{title}"',  # 精確書名搜尋
                f'{title}'             # 普通搜尋
            ]
            
            for query in search_queries:
                params = {
                    'q': query,
                    'maxResults': 10,
                    'orderBy': 'relevance',
                    'langRestrict': 'zh-TW|zh-CN|en'  # 限制語言
                }
                if self.google_books_api['key']:
                    params['key'] = self.google_books_api['key']
                
                response = requests.get(
                    self.google_books_api['base_url'],
                    params=params,
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('totalItems', 0) > 0:
                        best_match = None
                        best_score = 0
                        
                        # 從結果中選擇最匹配的書籍
                        for item in data['items'][:10]:
                            result_title = item.get('volumeInfo', {}).get('title', '')
                            
                            # 計算標題相似度
                            exact_similarity = self._calculate_similarity(
                                self._normalize_title(title),
                                self._normalize_title(result_title)
                            )
                            
                            # 檢查包含關係
                            contains_score = 0
                            if self._normalize_title(title) in self._normalize_title(result_title):
                                contains_score = 0.6
                            elif self._normalize_title(result_title) in self._normalize_title(title):
                                contains_score = 0.5
                            
                            score = max(exact_similarity, contains_score)
                            
                            if score > best_score:
                                best_score = score
                                best_match = item
                        
                        # 只接受相似度 > 0.2 的結果
                        if best_match and best_score > 0.2:
                            return self._parse_google_books_item(best_match)
        except Exception as e:
            logger.error(f"Google Books 搜尋錯誤: {e}")
        
        return None

    def _parse_google_books_item(self, item: Dict) -> Dict:
        """
        解析 Google Books API 回傳的書籍資料
        轉換為標準格式
        """
        vol = item.get('volumeInfo', {})
        
        # 提取 ISBN
        isbn = ''
        for identifier in vol.get('industryIdentifiers', []):
            if identifier.get('type') in ['ISBN_13', 'ISBN_10']:
                isbn = identifier.get('identifier', '')
                break
        
        return {
            'title': vol.get('title', ''),
            'authors': vol.get('authors', []),
            'publisher': vol.get('publisher', ''),
            'publishedDate': vol.get('publishedDate', ''),
            'isbn': isbn,
            'description': vol.get('description', ''),
            'page_count': vol.get('pageCount', 0),
            'categories': vol.get('categories', []),
            'thumbnail': vol.get('imageLinks', {}).get('thumbnail', ''),
            'source': 'Google Books'
        }

    # ========================================================================
    # Open Library API
    # ========================================================================

    def _search_openlibrary_by_isbn(self, isbn: str) -> Optional[Dict]:
        """
        使用 Open Library API 通過 ISBN 搜尋
        API 文檔: https://openlibrary.org/dev/docs/api/books
        """
        try:
            url = f"{self.open_library_api['books_url']}?bibkeys=ISBN:{isbn}&format=json&jscmd=data"
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if f"ISBN:{isbn}" in data:
                    book = data[f"ISBN:{isbn}"]
                    return {
                        'title': book.get('title', ''),
                        'authors': [a.get('name', '') for a in book.get('authors', [])],
                        'publisher': ', '.join([p.get('name', '') for p in book.get('publishers', [])]),
                        'publishedDate': book.get('publish_date', ''),
                        'isbn': isbn,
                        'description': book.get('description', ''),
                        'page_count': book.get('number_of_pages', 0),
                        'categories': [],
                        'thumbnail': '',
                        'source': 'Open Library'
                    }
        except Exception as e:
            logger.error(f"Open Library 搜尋錯誤: {e}")
        
        return None

    def _search_openlibrary_by_title(self, title: str) -> Optional[Dict]:
        """
        使用 Open Library API 通過書名搜尋
        API 文檔: https://openlibrary.org/dev/docs/api/search
        """
        try:
            params = {'title': title, 'limit': 10}
            response = requests.get(
                self.open_library_api['search_url'],
                params=params,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('docs'):
                    best_match = None
                    best_score = 0
                    
                    # 從結果中選擇最匹配的書籍
                    for doc in data['docs'][:10]:
                        result_title = doc.get('title', '')
                        
                        # 計算標題相似度
                        exact_similarity = self._calculate_similarity(
                            self._normalize_title(title),
                            self._normalize_title(result_title)
                        )
                        
                        # 檢查包含關係
                        contains_score = 0
                        if self._normalize_title(title) in self._normalize_title(result_title):
                            contains_score = 0.6
                        elif self._normalize_title(result_title) in self._normalize_title(title):
                            contains_score = 0.5
                        
                        score = max(exact_similarity, contains_score)
                        
                        if score > best_score:
                            best_score = score
                            best_match = doc
                    
                    # 只接受相似度 > 0.2 的結果
                    if best_match and best_score > 0.2:
                        return {
                            'title': best_match.get('title', ''),
                            'authors': best_match.get('author_name', []),
                            'publisher': ', '.join(best_match.get('publisher', [])[:3]),
                            'publishedDate': str(best_match.get('first_publish_year', '')),
                            'isbn': best_match.get('isbn', [''])[0] if best_match.get('isbn') else '',
                            'description': '',
                            'page_count': best_match.get('number_of_pages_median', 0),
                            'categories': best_match.get('subject', [])[:5],
                            'thumbnail': '',
                            'source': 'Open Library'
                        }
        except Exception as e:
            logger.error(f"Open Library 搜尋錯誤: {e}")
        
        return None

    # ========================================================================
    # 台灣書籍資料庫（預留接口，未實作）
    # ========================================================================

    def _search_taiwan_by_title(self, title: str, ocr_text: str) -> Dict:
        """
        搜尋台灣書籍（目前未實作，預留接口）
        
        可擴充資料源:
            - 國家圖書館 ISBN 中心
            - 博客來
            - 誠品
            - 各教科書出版社 API
        """
        info = self._extract_taiwan_book_info(ocr_text)
        
        logger.info(f"台灣書籍搜尋: {title}")
        logger.info(f"  提取資訊: {info}")
        
        # TODO: 實作台灣書籍資料庫查詢
        return {'success': False}

    def _extract_taiwan_book_info(self, text: str) -> Dict:
        """
        從 OCR 文字提取台灣書籍特徵資訊
        用於輔助台灣書籍搜尋
        """
        info = {
            'publisher': None,
            'grade': None,
            'subject': None,
            'volume': None
        }
        
        # 提取出版社
        all_publishers = []
        for publishers in self.taiwan_publishers.values():
            all_publishers.extend(publishers)
        
        for pub in all_publishers:
            if pub in text:
                info['publisher'] = pub
                break
        
        # 提取年級（如：國中1、高中2）
        grade_match = re.search(r'(國|高)(中|小|職)\s*(\d+)', text)
        if grade_match:
            info['grade'] = grade_match.group(0)
        
        # 提取科目
        subjects = ['數學', '國文', '英文', '理化', '生物', '物理', 
                   '化學', '歷史', '地理', '公民', '社會', '自然']
        for subject in subjects:
            if subject in text:
                info['subject'] = subject
                break
        
        # 提取冊數（如：第一冊、上冊）
        volume_match = re.search(r'第?[一二三四五六1-6]冊|[上下]冊', text)
        if volume_match:
            info['volume'] = volume_match.group(0)
        
        return info

    # ========================================================================
    # ISBN 驗證
    # ========================================================================

    def _validate_isbn(self, isbn: str) -> bool:
        """
        驗證 ISBN 格式是否正確
        支援 ISBN-10 和 ISBN-13
        """
        if len(isbn) == 10:
            return self._validate_isbn10(isbn)
        elif len(isbn) == 13:
            return self._validate_isbn13(isbn)
        return False

    def _validate_isbn10(self, isbn: str) -> bool:
        """
        ISBN-10 校驗碼驗證
        算法: 每位數字乘以權重(10-位置)，總和需被11整除
        最後一位可能是 X (代表10)
        """
        try:
            total = sum(int(d) * (10 - i) for i, d in enumerate(isbn[:9]))
            check = 10 if isbn[9].upper() == 'X' else int(isbn[9])
            return (total + check) % 11 == 0
        except:
            return False

    def _validate_isbn13(self, isbn: str) -> bool:
        """
        ISBN-13 校驗碼驗證
        算法: 奇數位×1 + 偶數位×3，總和需被10整除
        """
        try:
            total = sum(int(d) * (1 if i % 2 == 0 else 3) for i, d in enumerate(isbn[:12]))
            check_digit = (10 - (total % 10)) % 10
            return check_digit == int(isbn[12])
        except:
            return False

    # ========================================================================
    # 公開 API
    # ========================================================================

    def search_book_by_isbn(self, isbn: str) -> Dict:
        """
        公開 API: 通過 ISBN 搜尋書籍
        
        參數:
            isbn: ISBN 號碼（可包含連字符）
            
        返回:
            Dict: {'success': bool, 'data': Dict} 或 {'success': False, 'error': str}
        """
        isbn_clean = re.sub(r'[-\s]', '', isbn)
        if not self._validate_isbn(isbn_clean):
            return {'success': False, 'error': 'ISBN 格式不正確'}
        return self._search_by_isbn(isbn_clean)

    def search_book_by_title(self, title: str) -> Dict:
        """
        公開 API: 通過書名搜尋書籍
        
        參數:
            title: 書名
            
        返回:
            Dict: {'success': bool, 'data': Dict} 或 {'success': False, 'error': str}
        """
        if len(title.strip()) < 2:
            return {'success': False, 'error': '書名太短'}
        return self._search_by_title(title.strip())


# ============================================================================
# 全局實例（單例模式）
# ============================================================================

# 創建全局服務實例，供其他模組使用
book_recognition_service = ImprovedBookRecognitionService()