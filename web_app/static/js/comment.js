// comment_rating_modal.js

document.addEventListener('DOMContentLoaded', function() {
    console.log('評分模態框 JS 已加載');
    
    // 初始化星級評分顯示
    initializeStarRatings();
    
    // 設置搜尋和過濾功能
    setupSearchAndFilters();
    
    // 設置分頁
    setupPagination();
    
    // 初始化交互元素
    initializeInteractions();

    // 新增評論按鈕點擊事件處理
    setupRatingModal();
});

// 初始化星級評分顯示
function initializeStarRatings() {
    document.querySelectorAll('.stars').forEach(starsContainer => {
        const rating = parseFloat(starsContainer.getAttribute('data-rating'));
        const stars = Array.from(starsContainer.querySelectorAll('i'));
        
        // 根據評分更新星級圖標
        stars.forEach((star, index) => {
            const position = index + 1;
            
            if (rating >= position) {
                // 全星
                star.className = 'fas fa-star';
            } else if (rating > position - 0.5 && rating < position) {
                // 半星
                star.className = 'fas fa-star-half-alt';
            } else {
                // 空星
                star.className = 'far fa-star';
            }
        });
    });
}

// 設置搜尋和過濾功能
function setupSearchAndFilters() {
    const filterItems = document.querySelectorAll('.filter-item');
    const searchBox = document.querySelector('.search-box');
    const courseItems = document.querySelectorAll('.course-item');
    
    // 組合過濾功能
    function filterCourses() {
        // 搜尋和過濾邏輯實現...
    }
    
    // 添加事件監聽器
    if (searchBox) {
        searchBox.addEventListener('input', filterCourses);
    }
    
    filterItems.forEach(item => {
        item.addEventListener('change', filterCourses);
    });
}

// 設置分頁
function setupPagination() {
    const pageButtons = document.querySelectorAll('.page-btn');
    const nextButton = document.querySelector('.page-next');
    
    // 添加頁面按鈕點擊事件
    pageButtons.forEach(button => {
        button.addEventListener('click', function() {
            // 移除所有按鈕的活躍狀態
            pageButtons.forEach(btn => btn.classList.remove('active'));
            // 添加活躍狀態到被點擊的按鈕
            this.classList.add('active');
            
            // 滾動到頁面頂部
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
    
    // 下一頁按鈕功能
    if (nextButton) {
        nextButton.addEventListener('click', function() {
            const activeButton = document.querySelector('.page-btn.active');
            if (activeButton) {
                const nextPageButton = activeButton.nextElementSibling;
                if (nextPageButton && nextPageButton.classList.contains('page-btn')) {
                    nextPageButton.click();
                }
            }
        });
    }
}

// 初始化其他交互元素
function initializeInteractions() {
    // 滾動時的統計數據動畫
    const statItems = document.querySelectorAll('.stat-item');
    
    if (statItems.length > 0) {
        // 當統計項目進入視窗時的動畫
        function animateStats() {
            statItems.forEach(item => {
                const position = item.getBoundingClientRect();
                
                // 如果統計項目在視窗內
                if (position.top < window.innerHeight && position.bottom >= 0) {
                    item.classList.add('animated');
                }
            });
        }
        
        // 添加動畫類到統計項目
        statItems.forEach(item => {
            item.style.opacity = '0';
            item.style.transform = 'translateY(20px)';
            item.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        });
        
        // 檢查初始位置並在滾動時檢查
        animateStats();
        window.addEventListener('scroll', animateStats);
        
        // 稍有延遲後，動畫統計數據
        setTimeout(() => {
            statItems.forEach((item, index) => {
                setTimeout(() => {
                    item.style.opacity = '1';
                    item.style.transform = 'translateY(0)';
                }, index * 100);
            });
        }, 300);
    }
}

// 設置評分模態框
function setupRatingModal() {
    // 創建模態框 HTML
    createRatingModal();
    
    // 綁定新增評論按鈕點擊事件
    const createBtns = document.querySelectorAll('.create-btn');
    createBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 獲取課程信息
            const courseItem = this.closest('.course-item');
            const courseName = courseItem.querySelector('.course-name').textContent;
            const courseTeacher = courseItem.querySelector('.course-teacher').textContent.replace('教授', '').trim();
            
            // 顯示模態框並填充課程信息
            const modal = document.getElementById('rating-modal');
            modal.querySelector('.modal-course-name').textContent = courseName;
            modal.querySelector('.modal-course-teacher').textContent = courseTeacher + ' 教授';
            
            // 重置星級評分
            const modalStars = modal.querySelectorAll('.modal-stars i');
            modalStars.forEach(star => {
                star.className = 'far fa-star';
            });
            modal.querySelector('#modal-rating-value').value = '0';
            modal.querySelector('.rating-display').textContent = '0.0';
            
            // 顯示模態框
            modal.style.display = 'block';
            
            // 保存課程 ID 到模態框
            const courseId = courseItem.getAttribute('data-course-id') || '1'; // 默認為 1，如果沒有設置
            modal.setAttribute('data-course-id', courseId);
        });
    });
    
    // 初始化模態框事件處理
    initializeModalEvents();
}

// 創建評分模態框
function createRatingModal() {
    // 檢查模態框是否已存在
    if (document.getElementById('rating-modal')) {
        return;
    }
    
    // 創建模態框 HTML
    const modalHtml = `
    <div id="rating-modal" class="modal">
        <div class="modal-content">
            <span class="modal-close">&times;</span>
            <h2>評分選項</h2>
            <div class="modal-course-info">
                <h3 class="modal-course-name"></h3>
                <p class="modal-course-teacher"></p>
            </div>
            <div class="modal-options">
                <div class="modal-rating-option">
                    <h4>快速五星評分</h4>
                    <div class="modal-rating">
                        <div class="modal-stars">
                            <i class="far fa-star" data-value="1"></i>
                            <i class="far fa-star" data-value="2"></i>
                            <i class="far fa-star" data-value="3"></i>
                            <i class="far fa-star" data-value="4"></i>
                            <i class="far fa-star" data-value="5"></i>
                        </div>
                        <div class="rating-display">0.0</div>
                        <input type="hidden" id="modal-rating-value" value="0">
                    </div>
                    <button class="submit-rating-btn">提交評分</button>
                </div>
                <div class="modal-divider"></div>
                <div class="modal-full-option">
                    <h4>撰寫完整評論</h4>
                    <p>前往評論頁面撰寫詳細的課程評價</p>
                    <a id="full-comment-btn" href="/add_comment/" class="full-comment-btn">前往評論頁面</a>
                </div>
            </div>
        </div>
    </div>`;
    
    // 添加模態框到頁面
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // 添加模態框樣式
    const style = document.createElement('style');
    style.textContent = `
    .modal {
        display: none;
        position: fixed;
        z-index: 1000;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        overflow: auto;
    }
    
    .modal-content {
        background-color: white;
        margin: 15% auto;
        padding: 30px;
        border-radius: 15px;
        width: 80%;
        max-width: 500px;
        position: relative;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        animation: modalSlideIn 0.3s ease;
    }
    
    @keyframes modalSlideIn {
        from {
            transform: translateY(-50px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
    
    .modal-close {
        position: absolute;
        top: 15px;
        right: 20px;
        color: #aaa;
        font-size: 28px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s;
    }
    
    .modal-close:hover {
        color: #333;
    }
    
    .modal h2 {
        font-size: 24px;
        margin-top: 0;
        margin-bottom: 20px;
        color: var(--primary-color);
        text-align: center;
    }
    
    .modal-course-info {
        background-color: var(--light-gray);
        padding: 15px;
        border-radius: 10px;
        margin-bottom: 20px;
        text-align: center;
    }
    
    .modal-course-name {
        font-size: 20px;
        margin: 0 0 5px 0;
    }
    
    .modal-course-teacher {
        font-size: 16px;
        color: var(--dark-gray);
        margin: 0;
    }
    
    .modal-options {
        display: flex;
        gap: 20px;
    }
    
    .modal-rating-option,
    .modal-full-option {
        flex: 1;
        padding: 20px;
        background-color: var(--light-gray);
        border-radius: 10px;
        text-align: center;
    }
    
    .modal-divider {
        width: 1px;
        background-color: #ddd;
    }
    
    .modal h4 {
        font-size: 18px;
        margin-top: 0;
        margin-bottom: 10px;
    }
    
    .modal-rating {
        margin: 15px 0;
    }
    
    .modal-stars {
        display: flex;
        justify-content: center;
        gap: 5px;
        margin-bottom: 10px;
    }
    
    .modal-stars i {
        font-size: 24px;
        color: #e0e0e0;
        cursor: pointer;
        transition: all 0.2s;
    }
    
    .modal-stars i.fas {
        color: #ffc107;
    }
    
    .modal-stars i:hover {
        transform: scale(1.2);
    }
    
    .rating-display {
        font-size: 24px;
        font-weight: bold;
        color: var(--primary-color);
    }
    
    .submit-rating-btn,
    .full-comment-btn {
        display: inline-block;
        padding: 10px 20px;
        background-color: var(--primary-color);
        color: white;
        border: none;
        border-radius: 50px;
        font-size: 16px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s;
        margin-top: 10px;
        text-decoration: none;
    }
    
    .submit-rating-btn:hover,
    .full-comment-btn:hover {
        background-color: var(--primary-dark);
        transform: translateY(-3px);
        box-shadow: 0 6px 15px rgba(0, 0, 0, 0.1);
    }
    
    .modal-full-option p {
        color: var(--dark-gray);
        margin-bottom: 40px;
    }
    
    @media (max-width: 768px) {
        .modal-options {
            flex-direction: column;
        }
        
        .modal-divider {
            width: 100%;
            height: 1px;
            margin: 10px 0;
        }
    }`;
    
    document.head.appendChild(style);
}

// 初始化模態框事件處理
function initializeModalEvents() {
    const modal = document.getElementById('rating-modal');
    const closeBtn = modal.querySelector('.modal-close');
    const stars = modal.querySelectorAll('.modal-stars i');
    const ratingValue = modal.querySelector('#modal-rating-value');
    const ratingDisplay = modal.querySelector('.rating-display');
    const submitBtn = modal.querySelector('.submit-rating-btn');
    const fullCommentBtn = modal.querySelector('#full-comment-btn');
    
    // 關閉模態框
    closeBtn.addEventListener('click', function() {
        modal.style.display = 'none';
    });
    
    // 點擊模態框外部關閉
    window.addEventListener('click', function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    });
    
    // 星級評分點擊
    stars.forEach(star => {
        star.addEventListener('click', function() {
            const value = parseInt(this.getAttribute('data-value'));
            ratingValue.value = value;
            ratingDisplay.textContent = value + '.0';
            
            // 更新星星顯示
            stars.forEach(s => {
                const starValue = parseInt(s.getAttribute('data-value'));
                s.className = starValue <= value ? 'fas fa-star' : 'far fa-star';
            });
        });
        
        // 懸停效果
        star.addEventListener('mouseover', function() {
            const value = parseInt(this.getAttribute('data-value'));
            
            stars.forEach(s => {
                const starValue = parseInt(s.getAttribute('data-value'));
                if (starValue <= value) {
                    s.className = 'fas fa-star';
                }
            });
        });
        
        star.addEventListener('mouseout', function() {
            const currentValue = parseInt(ratingValue.value);
            
            stars.forEach(s => {
                const starValue = parseInt(s.getAttribute('data-value'));
                s.className = starValue <= currentValue ? 'fas fa-star' : 'far fa-star';
            });
        });
    });
    
    // 提交評分
    submitBtn.addEventListener('click', function() {
        const value = parseInt(ratingValue.value);
        const courseId = modal.getAttribute('data-course-id');
        
        if (value > 0) {
            // 這裡可以添加 AJAX 請求來提交評分
            submitRating(courseId, value);
        } else {
            alert('請選擇評分！');
        }
    });
    
    // 修改前往完整評論頁面的 URL
    fullCommentBtn.addEventListener('click', function(e) {
        const courseId = modal.getAttribute('data-course-id');
        fullCommentBtn.href = `/add_comment/?course=${courseId}`;
    });
}

// 提交評分 (模擬)
function submitRating(courseId, rating) {
    // 模擬 AJAX 請求
    console.log(`提交評分: 課程ID=${courseId}, 評分=${rating}`);
    
    // 顯示成功消息
    const modal = document.getElementById('rating-modal');
    const modalContent = modal.querySelector('.modal-content');
    
    modalContent.innerHTML = `
    <div class="success-message">
        <i class="fas fa-check-circle"></i>
        <h2>評分成功！</h2>
        <p>感謝您的評分，您給出了 ${rating} 星評價。</p>
        <button class="close-modal-btn">關閉</button>
    </div>`;
    
    // 添加成功消息樣式
    const style = document.createElement('style');
    style.textContent = `
    .success-message {
        text-align: center;
        padding: 20px;
    }
    
    .success-message i {
        font-size: 60px;
        color: #4CAF50;
        margin-bottom: 20px;
    }
    
    .success-message h2 {
        color: #4CAF50;
    }
    
    .close-modal-btn {
        display: inline-block;
        padding: 10px 20px;
        background-color: var(--primary-color);
        color: white;
        border: none;
        border-radius: 50px;
        font-size: 16px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s;
        margin-top: 20px;
    }
    
    .close-modal-btn:hover {
        background-color: var(--primary-dark);
        transform: translateY(-3px);
        box-shadow: 0 6px 15px rgba(0, 0, 0, 0.1);
    }`;
    
    document.head.appendChild(style);
    
    // 關閉按鈕事件
    const closeBtn = modalContent.querySelector('.close-modal-btn');
    closeBtn.addEventListener('click', function() {
        modal.style.display = 'none';
        
        // 重新載入頁面或更新評分顯示
        setTimeout(() => {
            window.location.reload();
        }, 500);
    });
}