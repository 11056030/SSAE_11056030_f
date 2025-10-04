# utils/improved_book_recognition.py
"""
書籍圖像辨識服務
功能：透過 OCR 和多個書籍資料庫 API，自動識別書籍封面並填入書籍資訊
主要技術：
  - Google Cloud Vision API (OCR 文字識別)
  - Google Books API (書籍資料查詢)
  - Open Library API (備用書籍資料查詢)
"""

import re
import requests
import logging
from typing import Dict, List, Optional, Tuple
from difflib import SequenceMatcher
from collections import Counter
from .google_vision_service import google_vision_service

logger = logging.getLogger(__name__)


class ImprovedBookRecognitionService:
    """改進版書籍辨識服務類別"""
    
    def __init__(self):
        """初始化：設定各種 API 端點和辨識規則"""
        
        # === Google Books API 設定 ===
        self.google_books_api = {
            'base_url': 'https://www.googleapis.com/books/v1/volumes',
            'key': None  # 可選：設定 API Key 可提高請求配額
        }
        
        # === Open Library API 設定 ===
        self.open_library_api = {
            'search_url': 'https://openlibrary.org/search.json',
            'books_url': 'https://openlibrary.org/api/books'
        }
        
        # === 台灣書籍資料源（目前未實作，預留接口）===
        self.taiwan_sources = {
            'ncl_isbn': 'https://isbn.ncl.edu.tw/NCL_ISBNNet/C00_index.php',  # 國家圖書館
            'books_com_tw': 'https://search.books.com.tw/search/query/key/',  # 博客來
            'eslite': 'https://www.eslite.com/search?searchType=keyword&keyword=',  # 誠品
        }
        
        # === 台灣出版社資料庫 ===
        # 用於識別台灣本土書籍，特別是教科書
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
        
        # === 無效書名模式（正則表達式）===
        # 這些模式會被排除，因為它們不可能是書名
        self.invalid_title_patterns = [
            # ISBN 相關
            r'^ISBN[-:\s]*[\d\-Xx]+$',  # 單純的 ISBN 標籤
            r'^\d{10,13}$',  # 純數字（可能是 ISBN）
            
            # 版次資訊
            r'^第?\d+版$',  # 第1版、第2版
            r'^初版$',
            r'^修訂版$',
            r'^增訂版$',
            r'^\d+刷$',  # 第3刷
            r'^\d+印$',
            
            # 價格
            r'^定價[:：\s]*[\d\$￥元]+',  # 定價: 300元
            r'^NT\$?\d+',  # NT$300
            r'^[\d\$￥元,]+元?$',  # 300元
            
            # 日期
            r'^\d{4}年\d{1,2}月',  # 2024年1月
            r'^\d{4}/\d{1,2}',  # 2024/01
            r'^\d{4}-\d{1,2}',  # 2024-01
            
            # 頁數
            r'^頁數[:：]\d+',  # 頁數:300
            r'^\d+頁$',  # 300頁
            r'^\d+p\.?$',  # 300p
            
            # 作者/出版社標籤
            r'^作者[:：]',
            r'^著者[:：]',
            r'^編者[:：]',
            r'^譯者[:：]',
            r'^出版社?[:：]',
            r'^發行[:：]',
            
            # 版權資訊
            r'^copyright',
            r'^©\s*\d{4}',
            r'^All Rights Reserved',
            r'^版權所有',
            
            # 網址
            r'www\.',
            r'http[s]?://',
            r'\.com',
            r'\.tw',
            r'\.org',
            
            # 條碼
            r'^\d{8,}$',  # 8位以上純數字
            
            # 單純的數字或符號
            r'^[\d\s\-_\.]+$',
            r'^[^\w\u4e00-\u9fff]+$',  # 沒有中英文字元
            
            # 太短
            r'^.{1,2}$',  # 只有1-2個字元
        ]
        
        # === 台灣教科書特徵關鍵字 ===
        self.textbook_keywords = [
            '國中', '高中', '國小', '高職',
            '數學', '國文', '英文', '理化', '生物', '物理', '化學',
            '歷史', '地理', '公民', '社會',
            '上冊', '下冊', '第.*冊',
            '學習手冊', '習作', '講義', '自修',
            '康軒版', '南一版', '翰林版', '龍騰版'
        ]
        
        # === 出版社關鍵字 ===
        self.publisher_keywords = [
            '出版社', '出版', '出版者', '發行',
            'publishing', 'press', 'publisher',
            '印刷', '書局', '文化', '圖書', '書房'
        ]
        
        # === 作者關鍵字 ===
        self.author_keywords = [
            '作者', '著', '編著', '主編', '譯者', '編譯', '撰',
            'author', 'by', 'written by', 'edited by', 'translator'
        ]

    # ==================== 主要處理流程 ====================
    
    def process_book_image(self, image_data: bytes) -> Dict:
        """
        完整的書籍圖像處理流程（主入口）
        
        參數:
            image_data: 圖片的二進制數據
            
        返回:
            Dict: 包含書籍資訊的字典
            {
                "success": bool,
                "book_info": {
                    "title": str,
                    "authors": List[str],
                    "publisher": str,
                    "publishedDate": str,
                    "isbn": str
                },
                "ocr_text": str,
                "search_method": str,
                "confidence": float
            }
        """
        try:
            logger.info("=== 開始書籍識別流程 ===")

            # 預設回傳模板（失敗時使用）
            result_template = {
                "title": "未知",
                "authors": ["未知"],
                "publisher": "未知",
                "publishedDate": "未知",
                "isbn": "未知"
            }

            # ===== 步驟 1: OCR 文字識別 =====
            logger.info("步驟 1: 執行 OCR 文字識別")
            ocr_result = google_vision_service.detect_text_with_preprocessing(image_data)
            
            if not ocr_result.get('success'):
                return {
                    "success": False,
                    "book_info": result_template,
                    "error": "無法提取文字"
                }

            # 提取 OCR 結果
            extracted_text = ocr_result.get('text', '').strip()
            text_blocks = ocr_result.get('text_blocks', [])  # 文字塊（含位置資訊）
            isbn_candidates = ocr_result.get('isbn_candidates', [])  # ISBN 候選

            if not extracted_text:
                return {
                    "success": False,
                    "book_info": result_template,
                    "error": "未檢測到有效文字"
                }

            logger.info(f"OCR 成功，提取文字長度: {len(extracted_text)}")
            logger.info(f"找到 {len(isbn_candidates)} 個 ISBN 候選")

            # ===== 步驟 2: ISBN 優先搜尋（最準確）=====
            logger.info("步驟 2: 嘗試 ISBN 搜尋")
            for isbn in isbn_candidates:
                result = self._search_and_verify_isbn(isbn, extracted_text)
                if result.get("success"):
                    logger.info(f"✓ ISBN 搜尋成功: {isbn}")
                    enriched = self._enrich_book_info(result["data"])
                    return {
                        "success": True,
                        "book_info": enriched,
                        "ocr_text": extracted_text,
                        "search_method": "isbn",
                        "confidence": result["confidence"]
                    }

            # ===== 步驟 3: 書名候選搜尋 =====
            logger.info("步驟 3: 提取書名候選並搜尋")
            title_candidates = self._extract_title_candidates_v2(text_blocks, extracted_text)
            logger.info(f"找到 {len(title_candidates)} 個書名候選")
            
            if title_candidates:
                result = self._smart_search_and_verify_v2(title_candidates, extracted_text)
                if result.get("success"):
                    logger.info("✓ 書名搜尋成功")
                    enriched = self._enrich_book_info(result["data"])
                    return {
                        "success": True,
                        "book_info": enriched,
                        "ocr_text": extracted_text,
                        "search_method": "title",
                        "confidence": result["confidence"]
                    }

            # ===== 步驟 4: 全文搜尋（最後手段）=====
            logger.info("步驟 4: 嘗試全文搜尋")
            result = self._search_by_title(extracted_text[:80])  # 只用前80字避免太長
            if result.get("success"):
                logger.info("✓ 全文搜尋成功")
                enriched = self._enrich_book_info(result["data"])
                return {
                    "success": True,
                    "book_info": enriched,
                    "ocr_text": extracted_text,
                    "search_method": "fulltext",
                    "confidence": 0.4  # 全文搜尋信心度較低
                }

            # ===== 步驟 5: 全部失敗 =====
            logger.warning("所有搜尋方法均失敗")
            return {
                "success": False,
                "book_info": result_template,
                "ocr_text": extracted_text
            }

        except Exception as e:
            logger.error(f"書籍識別錯誤: {e}", exc_info=True)
            return {
                "success": False,
                "book_info": {
                    "title": "未知",
                    "authors": ["未知"],
                    "publisher": "未知",
                    "publishedDate": "未知",
                    "isbn": "未知"
                },
                "error": str(e),
                "ocr_text": ""
            }

    # ==================== 資料補齊與驗證 ====================

    def _enrich_book_info(self, book_data: Dict) -> Dict:
        """
        補齊書籍資訊，確保所有欄位都有值
        
        參數:
            book_data: 從 API 獲取的原始書籍資料
            
        返回:
            Dict: 補齊後的書籍資料
        """
        title = book_data.get("title") or "未知"
        authors = book_data.get("authors") or ["未知"]
        publisher = book_data.get("publisher") or "未知"
        published_date = book_data.get("publishedDate") or "未知"
        
        # 如果沒有 ISBN，嘗試用書名去 API 查詢
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
        
        參數:
            title: 書名
            
        返回:
            Optional[str]: ISBN 或 None
        """
        try:
            r = requests.get(
                f"{self.google_books_api['base_url']}?q={title}",
                timeout=10
            )
            if r.status_code == 200:
                items = r.json().get("items", [])
                if items:
                    identifiers = items[0]["volumeInfo"].get("industryIdentifiers", [])
                    for iden in identifiers:
                        if iden.get("type") in ["ISBN_10", "ISBN_13"]:
                            return iden.get("identifier")
        except Exception as e:
            logger.error(f"查詢 ISBN 失敗: {e}")
        return None

    # ==================== 台灣教科書檢測 ====================

    def _detect_taiwan_textbook(self, text: str) -> bool:
        """
        檢測是否為台灣教科書
        
        參數:
            text: OCR 提取的文字
            
        返回:
            bool: 是否為台灣教科書
        """
        score = 0
        
        # 檢查教科書關鍵字（每個加1分）
        for keyword in self.textbook_keywords:
            if re.search(keyword, text):
                score += 1
        
        # 檢查台灣出版社（每個加2分）
        all_publishers = []
        for publishers in self.taiwan_publishers.values():
            all_publishers.extend(publishers)
        
        for publisher in all_publishers:
            if publisher in text:
                score += 2
        
        # 檢查年級/冊數模式（加2分）
        if re.search(r'(國|高)(中|小|職)\s*\d+', text):
            score += 2
        
        if re.search(r'第[一二三四五六1-6]冊', text):
            score += 1
        
        logger.info(f"台灣教科書特徵分數: {score}")
        return score >= 3  # 分數 >= 3 判定為教科書

    # ==================== 書名候選提取 ====================

    def _extract_title_candidates_v2(self, text_blocks: List[Dict], 
                                     full_text: str, 
                                     is_textbook: bool = False) -> List[Dict]:
        """
        從 OCR 結果提取可能的書名候選
        使用多種方法：文字塊位置、行分析、字體大小
        
        參數:
            text_blocks: OCR 返回的文字塊（含位置資訊）
            full_text: 完整 OCR 文字
            is_textbook: 是否為教科書
            
        返回:
            List[Dict]: 書名候選列表，每個包含 text, score, method, reason
        """
        candidates = []
        lines = full_text.split('\n')
        
        # === 方法1: 使用文字塊（有位置資訊）===
        if text_blocks:
            logger.info("方法1: 從文字塊提取")
            for idx, block in enumerate(text_blocks[:20]):  # 只看前20個塊
                text = block.get('text', '').strip()
                confidence = block.get('confidence', 0.5)
                position = idx
                
                # 計算這個文字塊作為書名的分數
                score, reason = self._score_title_candidate_v2(
                    text, full_text, confidence, position, is_textbook
                )
                
                if score > 0.25:  # 分數閾值
                    candidates.append({
                        'text': text,
                        'score': score,
                        'method': 'block',
                        'reason': reason,
                        'position': position
                    })
        
        # === 方法2: 從文字行提取（備用）===
        logger.info("方法2: 從文字行提取")
        for i, line in enumerate(lines[:20]):
            line = line.strip()
            
            if not line or len(line) < 3:
                continue
            
            # 位置權重（越前面權重越高）
            position_weight = 1.0 - (i * 0.03)
            
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
        
        # === 方法3: 尋找最大字體的文字（通常是書名）===
        if text_blocks:
            logger.info("方法3: 尋找大字體文字")
            largest_texts = self._find_largest_text_blocks(text_blocks)
            for text in largest_texts:
                score, reason = self._score_title_candidate_v2(
                    text, full_text, 0.9, 0, is_textbook
                )
                if score > 0.2:
                    candidates.append({
                        'text': text,
                        'score': score + 0.2,  # 大字體額外加分
                        'method': 'largest',
                        'reason': f'大字體 + {reason}',
                        'position': 0
                    })
        
        # === 去重並排序 ===
        seen = set()
        unique_candidates = []
        for c in candidates:
            # 標準化文字用於去重
            text_normalized = self._normalize_for_comparison(c['text'])
            if text_normalized not in seen and len(text_normalized) >= 3:
                seen.add(text_normalized)
                unique_candidates.append(c)
        
        # 按分數排序（高到低）
        sorted_candidates = sorted(unique_candidates, key=lambda x: x['score'], reverse=True)
        
        # 記錄前幾名候選
        for i, c in enumerate(sorted_candidates[:5]):
            logger.info(f"  候選 {i+1}: '{c['text']}' (分數: {c['score']:.2f}, 原因: {c['reason']})")
        
        return sorted_candidates

    def _find_largest_text_blocks(self, text_blocks: List[Dict]) -> List[str]:
        """
        尋找字體最大的文字塊
        根據 bounding box 計算高度
        
        參數:
            text_blocks: 文字塊列表
            
        返回:
            List[str]: 最大字體的文字列表（前3名）
        """
        texts_with_height = []
        
        for block in text_blocks:
            text = block.get('text', '').strip()
            if not text:
                continue
            
            # 計算 bounding box 高度
            bbox = block.get('boundingBox', {})
            if bbox and 'vertices' in bbox:
                vertices = bbox['vertices']
                if len(vertices) >= 4:
                    # 計算第一個和第三個頂點的 Y 座標差（高度）
                    height = abs(vertices[2].get('y', 0) - vertices[0].get('y', 0))
                    texts_with_height.append((text, height))
        
        if not texts_with_height:
            return []
        
        # 排序並返回前3大
        texts_with_height.sort(key=lambda x: x[1], reverse=True)
        return [t[0] for t in texts_with_height[:3]]

    # ==================== 書名評分系統 ====================

    def _score_title_candidate_v2(self, text: str, context: str, 
                                   base_confidence: float, position: int, 
                                   is_textbook: bool) -> Tuple[float, str]:
        """
        為書名候選評分（核心評分邏輯）
        綜合考慮長度、字元類型、位置、上下文等多個因素
        
        參數:
            text: 候選文字
            context: 完整 OCR 文字（用於上下文分析）
            base_confidence: OCR 基礎信心度
            position: 文字位置索引
            is_textbook: 是否為教科書
            
        返回:
            Tuple[float, str]: (分數, 評分原因)
        """
        if not text or len(text) < 3:
            return 0.0, "太短"
        
        reasons = []  # 記錄評分原因
        score = base_confidence * 0.2  # 基礎分數
        
        # ===== 第一階段：嚴格排除 =====
        
        # 檢查無效模式
        for pattern in self.invalid_title_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                return 0.0, f"匹配無效模式: {pattern}"
        
        # 包含明顯的非書名關鍵字
        strict_negative = [
            ('出版社', 0.8), ('印刷', 0.8), ('發行', 0.7),
            ('定價', 0.9), ('價格', 0.9), ('NT$', 0.9),
            ('ISBN', 0.9), ('版權', 0.8), ('copyright', 0.9),
            ('頁數', 0.8), ('www.', 0.9), ('http', 0.9),
            ('.com', 0.9), ('.tw', 0.9), ('.org', 0.9),
        ]
        
        for keyword, penalty in strict_negative:
            if re.search(keyword, text, re.IGNORECASE):
                score -= penalty
                if score <= 0:
                    return 0.0, f"包含排除關鍵字: {keyword}"
        
        # ===== 第二階段：正面評分 =====
        
        # 1. 長度評分
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
        
        # 2. 字元類型評分
        chinese_count = len(re.findall(r'[\u4e00-\u9fff]', text))
        english_count = len(re.findall(r'[a-zA-Z]', text))
        digit_count = len(re.findall(r'\d', text))
        
        # 主要是中文或英文（書名通常以文字為主）
        if chinese_count >= length * 0.5:
            score += 0.3
            reasons.append("中文為主")
        elif english_count >= length * 0.5:
            score += 0.3
            reasons.append("英文為主")
        
        # 數字佔比（數字太多可能不是書名）
        if digit_count > length * 0.4:
            score -= 0.4
            reasons.append("數字過多")
        elif 0 < digit_count <= 3:
            score += 0.05  # 少量數字可能是版次或系列
        
        # ===== 教科書特殊評分 =====
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
        
        # ===== 位置評分 =====
        if position <= 2:
            score += 0.25
            reasons.append("位置靠前")
        elif position <= 5:
            score += 0.15
            reasons.append("位置較前")
        
        # ===== 上下文評分 =====
        context_window = self._get_context_window(text, context, 150)
        
        # 檢查周圍是否有作者資訊
        for kw in self.author_keywords:
            if kw in context_window:
                score += 0.15
                reasons.append("附近有作者資訊")
                break
        
        # 檢查周圍是否有出版社資訊
        for kw in self.publisher_keywords:
            if kw in context_window:
                score += 0.1
                reasons.append("附近有出版社資訊")
                break
        
        # ===== 標點符號評分 =====
        if '：' in text or ':' in text:
            parts = re.split('[：:]', text)
            if len(parts) == 2 and all(len(p.strip()) >= 3 for p in parts):
                score += 0.15
                reasons.append("有副標題格式")
        
        # 特殊符號太多
        special_chars = re.findall(r'[^\w\s\u4e00-\u9fff：:、，。！？—《》（）【】]', text)
        if len(special_chars) > 4:
            score -= 0.25
            reasons.append("特殊符號過多")
        
        # ===== 重複出現評分 =====
        occurrences = context.lower().count(text.lower())
        if occurrences >= 2:
            score += min(0.2, occurrences * 0.08)
            reasons.append(f"重複出現{occurrences}次")
        
        # ===== 英文標題特殊處理 =====
        if english_count > chinese_count and english_count >= 5:
            words = text.split()
            if len(words) >= 2:
                # Title Case 檢查（每個單詞首字母大寫）
                capitalized = sum(1 for w in words if w and w[0].isupper())
                if capitalized >= len(words) * 0.6:
                    score += 0.2
                    reasons.append("英文標題大小寫")
        
        # ===== 最終調整 =====
        final_score = max(0.0, min(1.0, score))  # 限制在 0-1 之間
        reason_str = ", ".join(reasons) if reasons else "無特殊特徵"
        
        return final_score, reason_str

    # ==================== 輔助函式 ====================

    def _normalize_for_comparison(self, text: str) -> str:
        """
        標準化文字用於比較（去除空格、標點）
        
        參數:
            text: 原始文字
            
        返回:
            str: 標準化後的文字
        """
        text = text.lower()  # 轉小寫
        text = re.sub(r'[^\w\u4e00-\u9fff]', '', text)  # 只保留中英文和數字
        return text.strip()

    def _get_context_window(self, text: str, full_text: str, window_size: int) -> str:
        """
        獲取文字周圍的上下文（前後各 window_size 個字元）
        
        參數:
            text: 目標文字
            full_text: 完整文字
            window_size: 窗口大小
            
        返回:
            str: 上下文文字
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

    # ==================== 智能搜尋與驗證 ====================

    def _smart_search_and_verify_v2(self, candidates: List[Dict], ocr_text: str, 
                                     is_textbook: bool = False) -> Dict:
        """
        智能搜尋與驗證（對多個書名候選進行搜尋並驗證）
        
        參數:
            candidates: 書名候選列表
            ocr_text: 完整 OCR 文字
            is_textbook: 是否為教科書
            
        返回:
            Dict: 搜尋結果
        """
        results = []
        
        # 對每個候選進行搜尋
        for candidate in candidates[:8]:  # 最多搜尋前8個候選
            title = candidate['text']
            candidate_score = candidate['score']
            
            logger.info(f"搜尋候選: '{title}' (分數: {candidate_score:.2f})")
            
            # 如果是台灣教科書，優先使用台灣資料源
            if is_textbook:
                search_result = self._search_taiwan_by_title(title, ocr_text)
                if search_result.get('success'):
                    book_data = search_result['data']
                    confidence = self._calculate_match_confidence(
                        title, book_data, ocr_text, candidate_score
                    )
                    
                    if confidence > 0.35:  # 台灣教科書降低閾值
                        results.append({
                            'data': book_data,
                            'confidence': confidence
                        })
                        continue
            
            # 一般搜尋（Google Books + Open Library）
            search_result = self._search_by_title(title)
            
            if not search_result.get('success'):
                continue
            
            book_data = search_result['data']
            
            # 計算匹配信心度
            confidence = self._calculate_match_confidence(
                title, book_data, ocr_text, candidate_score
            )
            
            if confidence > 0.3:  # 信心度閾值
                results.append({
                    'data': book_data,
                    'confidence': confidence
                })
        
        if not results:
            return {'success': False, 'error': '未找到匹配結果'}
        
        # 選擇信心度最高的結果
        best = max(results, key=lambda x: x['confidence'])
        
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
        綜合考慮：標題相似度、作者匹配、出版社匹配、ISBN 匹配
        
        參數:
            query_title: 查詢的書名
            book_data: 搜尋到的書籍資料
            ocr_text: 完整 OCR 文字
            candidate_score: 書名候選的原始分數
            
        返回:
            float: 匹配信心度（0-1）
        """
        result_title = book_data.get('title', '')
        
        # 1. 標題相似度
        exact_similarity = self._calculate_similarity(
            self._normalize_title(query_title),
            self._normalize_title(result_title)
        )
        
        # 包含關係檢查
        query_norm = self._normalize_title(query_title)
        result_norm = self._normalize_title(result_title)
        
        contains_score = 0.0
        if query_norm in result_norm:
            contains_score = 0.7
        elif result_norm in query_norm:
            contains_score = 0.6
        
        title_similarity = max(exact_similarity, contains_score)
        
        logger.info(f"  標題相似度: {title_similarity:.2f} (查詢: '{query_title}' vs 結果: '{result_title}')")
        
        # 2. 上下文匹配分數
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
            # 去除常見的「出版社」等後綴
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
        
        # 3. 綜合評分（加權平均）
        confidence = (
            title_similarity * 0.45 +      # 標題相似度佔 45%
            context_score * 0.35 +         # 上下文匹配佔 35%
            candidate_score * 0.2          # 原始候選分數佔 20%
        )
        
        logger.info(f"  綜合信心度: {confidence:.2f}")
        return confidence

    # ==================== ISBN 搜尋 ====================

    def _search_and_verify_isbn(self, isbn: str, ocr_text: str) -> Dict:
        """
        搜尋並驗證 ISBN 結果
        
        參數:
            isbn: ISBN 號碼
            ocr_text: 完整 OCR 文字
            
        返回:
            Dict: 搜尋結果
        """
        result = self._search_by_isbn(isbn)
        
        if not result.get('success'):
            return result
        
        book_data = result['data']
        confidence = 0.75  # ISBN 搜尋基礎信心度較高
        
        # 驗證書名（在 OCR 文字中找到書名的部分）
        title = book_data.get('title', '')
        if title:
            title_parts = re.split(r'[\s:：]+', title)
            for part in title_parts:
                if len(part) >= 3 and part in ocr_text:
                    confidence += 0.05
        
        # 驗證作者
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

    def _normalize_title(self, title: str) -> str:
        """
        標準化書名（去除版本、版次等資訊）
        
        參數:
            title: 原始書名
            
        返回:
            str: 標準化後的書名
        """
        title = title.lower()
        # 去除版本資訊
        title = re.sub(r'第?\d+版', '', title)
        title = re.sub(r'\d+th\s+edition', '', title)
        title = re.sub(r'revised\s+edition', '', title)
        # 只保留中英文和數字
        title = re.sub(r'[^\w\u4e00-\u9fff]', '', title)
        return title.strip()

    def _calculate_similarity(self, text1: str, text2: str) -> float:
        """
        計算兩個文字的相似度（使用 SequenceMatcher）
        
        參數:
            text1: 文字1
            text2: 文字2
            
        返回:
            float: 相似度（0-1）
        """
        return SequenceMatcher(None, text1, text2).ratio()

    # ==================== 搜尋 API 呼叫 ====================

    def _search_by_isbn(self, isbn: str) -> Dict:
        """
        通過 ISBN 搜尋書籍（嘗試多個資料源）
        
        參數:
            isbn: ISBN 號碼
            
        返回:
            Dict: 搜尋結果
        """
        # 優先使用 Google Books
        result = self._search_google_books_by_isbn(isbn)
        if result:
            return {'success': True, 'data': result}
        
        # 備用：Open Library
        result = self._search_openlibrary_by_isbn(isbn)
        if result:
            return {'success': True, 'data': result}
        
        return {'success': False, 'error': f'未找到 ISBN: {isbn}'}

    def _search_by_title(self, title: str) -> Dict:
        """
        通過書名搜尋書籍（嘗試多個資料源）
        
        參數:
            title: 書名
            
        返回:
            Dict: 搜尋結果
        """
        # 優先使用 Google Books
        result = self._search_google_books_by_title(title)
        if result:
            return {'success': True, 'data': result}
        
        # 備用：Open Library
        result = self._search_openlibrary_by_title(title)
        if result:
            return {'success': True, 'data': result}
        
        # 嘗試移除副標題（如果有）
        if '：' in title or ':' in title:
            main_title = re.split('[：:]', title)[0].strip()
            if len(main_title) >= 3:
                result = self._search_google_books_by_title(main_title)
                if result:
                    return {'success': True, 'data': result}
        
        return {'success': False, 'error': f'未找到書名: {title}'}

    # ==================== Google Books API ====================

    def _search_google_books_by_isbn(self, isbn: str) -> Optional[Dict]:
        """
        使用 Google Books API 通過 ISBN 搜尋
        
        參數:
            isbn: ISBN 號碼
            
        返回:
            Optional[Dict]: 書籍資料或 None
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
        
        參數:
            title: 書名
            
        返回:
            Optional[Dict]: 書籍資料或 None
        """
        try:
            # 嘗試兩種查詢方式
            search_queries = [
                f'intitle:"{title}"',  # 精確書名搜尋
                f'{title}'             # 一般搜尋
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
                        # 從結果中選擇最匹配的
                        best_match = None
                        best_score = 0
                        
                        for item in data['items'][:10]:
                            result_title = item.get('volumeInfo', {}).get('title', '')
                            
                            # 計算相似度
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
                        
                        if best_match and best_score > 0.2:
                            return self._parse_google_books_item(best_match)
        except Exception as e:
            logger.error(f"Google Books 搜尋錯誤: {e}")
        
        return None

    def _parse_google_books_item(self, item: Dict) -> Dict:
        """
        解析 Google Books API 回傳的書籍資料
        
        參數:
            item: Google Books API 回傳的原始資料
            
        返回:
            Dict: 標準化的書籍資料
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
            'published_date': vol.get('publishedDate', ''),
            'isbn': isbn,
            'description': vol.get('description', ''),
            'page_count': vol.get('pageCount', 0),
            'categories': vol.get('categories', []),
            'thumbnail': vol.get('imageLinks', {}).get('thumbnail', ''),
            'source': 'Google Books'
        }

    # ==================== Open Library API ====================

    def _search_openlibrary_by_isbn(self, isbn: str) -> Optional[Dict]:
        """
        使用 Open Library API 通過 ISBN 搜尋
        
        參數:
            isbn: ISBN 號碼
            
        返回:
            Optional[Dict]: 書籍資料或 None
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
                        'published_date': book.get('publish_date', ''),
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
        
        參數:
            title: 書名
            
        返回:
            Optional[Dict]: 書籍資料或 None
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
                    # 選擇最匹配的結果
                    best_match = None
                    best_score = 0
                    
                    for doc in data['docs'][:10]:
                        result_title = doc.get('title', '')
                        
                        exact_similarity = self._calculate_similarity(
                            self._normalize_title(title),
                            self._normalize_title(result_title)
                        )
                        
                        contains_score = 0
                        if self._normalize_title(title) in self._normalize_title(result_title):
                            contains_score = 0.6
                        elif self._normalize_title(result_title) in self._normalize_title(title):
                            contains_score = 0.5
                        
                        score = max(exact_similarity, contains_score)
                        
                        if score > best_score:
                            best_score = score
                            best_match = doc
                    
                    if best_match and best_score > 0.2:
                        return {
                            'title': best_match.get('title', ''),
                            'authors': best_match.get('author_name', []),
                            'publisher': ', '.join(best_match.get('publisher', [])[:3]),
                            'published_date': str(best_match.get('first_publish_year', '')),
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

    # ==================== 台灣書籍搜尋（預留）====================

    def _search_taiwan_by_title(self, title: str, ocr_text: str) -> Dict:
        """
        搜尋台灣書籍（目前未實作，預留接口）
        
        參數:
            title: 書名
            ocr_text: 完整 OCR 文字
            
        返回:
            Dict: 搜尋結果
        """
        # 嘗試從 OCR 文字提取更多資訊
        info = self._extract_taiwan_book_info(ocr_text)
        
        logger.info(f"台灣書籍搜尋: {title}")
        logger.info(f"  提取資訊: {info}")
        
        # TODO: 實作博客來、誠品等台灣書店搜尋
        return {'success': False}

    def _extract_taiwan_book_info(self, text: str) -> Dict:
        """
        從 OCR 文字提取台灣書籍特徵資訊
        
        參數:
            text: OCR 文字
            
        返回:
            Dict: 提取的資訊
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
        
        # 提取年級
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
        
        # 提取冊數
        volume_match = re.search(r'第?[一二三四五六1-6]冊|[上下]冊', text)
        if volume_match:
            info['volume'] = volume_match.group(0)
        
        return info

    # ==================== ISBN 驗證 ====================

    def _validate_isbn(self, isbn: str) -> bool:
        """
        驗證 ISBN 格式是否正確
        
        參數:
            isbn: ISBN 號碼
            
        返回:
            bool: 是否有效
        """
        if len(isbn) == 10:
            return self._validate_isbn10(isbn)
        elif len(isbn) == 13:
            return self._validate_isbn13(isbn)
        return False

    def _validate_isbn10(self, isbn: str) -> bool:
        """
        ISBN-10 校驗碼驗證
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
        """
        try:
            total = sum(int(d) * (1 if i % 2 == 0 else 3) for i, d in enumerate(isbn[:12]))
            check_digit = (10 - (total % 10)) % 10
            return check_digit == int(isbn[12])
        except:
            return False

    # ==================== 公開 API ====================

    def search_book_by_isbn(self, isbn: str) -> Dict:
        """
        公開 API: 通過 ISBN 搜尋書籍
        
        參數:
            isbn: ISBN 號碼（可包含連字符）
            
        返回:
            Dict: 搜尋結果
        """
        isbn_clean = re.sub(r'[-\s]', '', isbn)  # 移除連字符和空格
        if not self._validate_isbn(isbn_clean):
            return {'success': False, 'error': 'ISBN 格式不正確'}
        return self._search_by_isbn(isbn_clean)

    def search_book_by_title(self, title: str) -> Dict:
        """
        公開 API: 通過書名搜尋書籍
        
        參數:
            title: 書名
            
        返回:
            Dict: 搜尋結果
        """
        if len(title.strip()) < 2:
            return {'success': False, 'error': '書名太短'}
        return self._search_by_title(title.strip())


# ==================== 創建全局實例 ====================
# 在其他模組中可以直接 import 使用
book_recognition_service = ImprovedBookRecognitionService()