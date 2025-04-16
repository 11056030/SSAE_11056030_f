
document.addEventListener('DOMContentLoaded', function() {
    // 篩選標籤點擊效果
    const filterItems = document.querySelectorAll('.filter-item');
    
    filterItems.forEach(item => {
        item.addEventListener('click', function() {
            // 移除所有active類
            filterItems.forEach(i => i.classList.remove('active'));
            // 添加當前點擊項目的active類
            this.classList.add('active');
            
            // 這裡可以添加實際篩選功能
            const filterType = this.textContent;
            console.log('篩選類型:', filterType);
            
            // 模擬篩選效果
            const bookCards = document.querySelectorAll('.book-card');
            bookCards.forEach(card => {
                card.style.opacity = '0.6';
                card.style.transform = 'scale(0.98)';
                
                setTimeout(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'scale(1)';
                }, 300);
            });
        });
    });
    
    // 書籍卡片點擊效果
    const bookCards = document.querySelectorAll('.book-card');
    bookCards.forEach(card => {
        card.addEventListener('click', function() {
            this.style.transform = 'scale(0.98)';
            setTimeout(() => {
                this.style.transform = '';
                // 這裡可以添加點擊後的導航邏輯
                console.log('查看書籍:', this.querySelector('.book-title').textContent);
            }, 150);
        });
    });
    
    // 上傳功能相關
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadForm = document.getElementById('uploadForm');
    const closeFormBtn = document.getElementById('closeFormBtn');
    const imagePreview = document.getElementById('imagePreview');
    const imageUpload = document.getElementById('imageUpload');
    const previewImage = document.getElementById('previewImage');
    const previewPlaceholder = document.getElementById('previewPlaceholder');
    const submitBtn = document.getElementById('submitBtn');
    
    // 打開上傳表單
    uploadBtn.addEventListener('click', function() {
        uploadForm.style.display = 'flex';
    });
    
    // 關閉上傳表單
    closeFormBtn.addEventListener('click', function() {
        uploadForm.style.display = 'none';
    });
    
    // 點擊預覽區域觸發文件選擇
    imagePreview.addEventListener('click', function() {
        imageUpload.click();
    });
    
    // 文件選擇後預覽
    imageUpload.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                previewImage.src = e.target.result;
                previewImage.style.display = 'block';
                previewPlaceholder.style.display = 'none';
            }
            
            reader.readAsDataURL(this.files[0]);
        }
    });
    
    // 提交表單
    submitBtn.addEventListener('click', function() {
        const bookTitle = document.getElementById('bookTitle').value;
        const bookDescription = document.getElementById('bookDescription').value;
        const bookCategory = document.getElementById('bookCategory').value;
        
        if (!bookTitle) {
            alert('請輸入書名');
            return;
        }
        
        if (!imageUpload.files || !imageUpload.files[0]) {
            alert('請選擇書籍圖片');
            return;
        }
        
        // 這裡可以添加實際的表單提交邏輯
        console.log('提交書籍:', {
            title: bookTitle,
            description: bookDescription,
            category: bookCategory,
            // 實際應用中，這裡會有圖片上傳邏輯
        });
        
        alert('書籍已成功發布！');
        uploadForm.style.display = 'none';
        
        // 重置表單
        document.getElementById('bookTitle').value = '';
        document.getElementById('bookDescription').value = '';
        imageUpload.value = '';
        previewImage.src = '';
        previewImage.style.display = 'none';
        previewPlaceholder.style.display = 'block';
        
        // 模擬添加新卡片
        const booksGrid = document.querySelector('.books-grid');
        const newCard = document.createElement('div');
        newCard.classList.add('book-card');
        newCard.innerHTML = `
            <div class="book-image">
                <img src="/api/placeholder/400/320" alt="${bookTitle}" class="book-cover">
            </div>
            <h3 class="book-title">${bookTitle}</h3>
            <p class="book-description">${bookDescription}</p>
            <div class="tag-container">
                <span class="tag">#${bookCategory === 'textbook' ? '教科書' : bookCategory === 'novel' ? '小說文學' : '其他'}</span>
            </div>
        `;
        booksGrid.prepend(newCard);
    });
});
