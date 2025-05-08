document.addEventListener('DOMContentLoaded', function() {
// 滾動時 動畫卡片
const allCards = document.querySelectorAll('.activity-card, .student-card');

function checkVisibility() {
    const windowHeight = window.innerHeight;
    
    allCards.forEach((card, index) => {
        const cardTop = card.getBoundingClientRect().top;
        
        if (cardTop < windowHeight - 100) {
            setTimeout(() => {
                card.classList.add('visible');
            }, index * 100); // Staggered animation
        }
    });
}

// 背景文字的視差效果
const bgText = document.querySelector('.bg-text');

function parallaxScroll() {
    const scrollPosition = window.pageYOffset;
    if (bgText) {
        bgText.style.transform = `translateX(${scrollPosition * -0.1}px)`;
    }
}

// Initial check
checkVisibility();

// Event listeners
window.addEventListener('scroll', checkVisibility);
window.addEventListener('scroll', parallaxScroll);

// Add random floating clouds
function addRandomClouds() {
    const mainContainer = document.querySelector('.main-container');
    const numClouds = 5;
    
    for (let i = 0; i < numClouds; i++) {
        const cloud = document.createElement('div');
        cloud.classList.add('cloud-shape');
        
        // Random size
        const size = Math.random() * 80 + 40;
        cloud.style.width = `${size}px`;
        cloud.style.height = `${size}px`;
        
        // Random position
        const posX = Math.random() * 90 + 5;
        const posY = Math.random() * 1200 + 200;
        cloud.style.left = `${posX}%`;
        cloud.style.top = `${posY}px`;
        
        // Styling
        cloud.style.opacity = '0.15';
        cloud.style.animationDelay = `${Math.random() * 2}s`;
        
        document.body.appendChild(cloud);
    }
}

addRandomClouds();
});



// 上傳按鈕功能
document.addEventListener('DOMContentLoaded', function() {
// 獲取元素
const uploadBtn = document.getElementById('uploadBtn');
const uploadForm = document.getElementById('uploadForm');
const closeUploadBtn = document.getElementById('closeUploadBtn');
const imageUpload = document.getElementById('imageUpload');

// 打開上傳表單
if (uploadBtn) {
    uploadBtn.addEventListener('click', function() {
        if (uploadForm) {
            uploadForm.style.display = 'flex';
        }
    });
}

// 關閉上傳表單
if (closeUploadBtn) {
    closeUploadBtn.addEventListener('click', function() {
        if (uploadForm) {
            uploadForm.style.display = 'none';
        }
    });
}

// 當點擊上傳區域時，觸發文件選擇
document.querySelector('.upload-container').addEventListener('click', function(e) {
    if (e.target === this || e.target.classList.contains('upload-title')) {
        imageUpload.click();
    }
});

// 處理文件選擇
if (imageUpload) {
    imageUpload.addEventListener('change', function() {
        // 在這裡處理文件上傳邏輯
        console.log('文件已選擇:', this.files[0]);
        // 您可以添加預覽圖片或上傳到伺服器的代碼
    });
}
});


// 新增活動
document.addEventListener('DOMContentLoaded', function() {
    // 滾動時 動畫卡片
    const allCards = document.querySelectorAll('.activity-card, .student-card');
    
    function checkVisibility() {
        const windowHeight = window.innerHeight;
        
        allCards.forEach((card, index) => {
            const cardTop = card.getBoundingClientRect().top;
            
            if (cardTop < windowHeight - 100) {
                setTimeout(() => {
                    card.classList.add('visible');
                }, index * 100); // Staggered animation
            }
        });
    }
    
    // 背景文字的視差效果
    const bgText = document.querySelector('.bg-text');
    
    function parallaxScroll() {
        const scrollPosition = window.pageYOffset;
        if (bgText) {
            bgText.style.transform = `translateX(${scrollPosition * -0.1}px)`;
        }
    }
    
    // Initial check
    checkVisibility();
    
    // Event listeners
    window.addEventListener('scroll', checkVisibility);
    window.addEventListener('scroll', parallaxScroll);
    
    // Add random floating clouds
    function addRandomClouds() {
        const mainContainer = document.querySelector('.main-container');
        const numClouds = 5;
        
        for (let i = 0; i < numClouds; i++) {
            const cloud = document.createElement('div');
            cloud.classList.add('cloud-shape');
            
            // Random size
            const size = Math.random() * 80 + 40;
            cloud.style.width = `${size}px`;
            cloud.style.height = `${size}px`;
            
            // Random position
            const posX = Math.random() * 90 + 5;
            const posY = Math.random() * 1200 + 200;
            cloud.style.left = `${posX}%`;
            cloud.style.top = `${posY}px`;
            
            // Styling
            cloud.style.opacity = '0.15';
            cloud.style.animationDelay = `${Math.random() * 2}s`;
            
            document.body.appendChild(cloud);
        }
    }
    
    addRandomClouds();
    
    // 發起揪團按鈕功能
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadForm = document.getElementById('uploadForm');
    const closeUploadBtn = document.getElementById('closeUploadBtn');
    const cancelCreateBtn = document.getElementById('cancel-create-btn');
    
    // 打開發起揪團表單
    if (uploadBtn) {
        uploadBtn.addEventListener('click', function() {
            if (uploadForm) {
                uploadForm.style.display = 'flex';
            }
        });
    }
    
    // 關閉發起揪團表單
    if (closeUploadBtn) {
        closeUploadBtn.addEventListener('click', function() {
            if (uploadForm) {
                uploadForm.style.display = 'none';
            }
        });
    }
    
    // 取消按鈕關閉表單
    if (cancelCreateBtn) {
        cancelCreateBtn.addEventListener('click', function() {
            if (uploadForm) {
                uploadForm.style.display = 'none';
            }
        });
    }
    
    // 表單提交處理
    const createGroupForm = document.getElementById('create-group-form');
    if (createGroupForm) {
        createGroupForm.addEventListener('submit', function(e) {
            e.preventDefault();
            // 處理表單提交邏輯
            alert('活動已成功發布！');
            uploadForm.style.display = 'none';
        });
    }
});