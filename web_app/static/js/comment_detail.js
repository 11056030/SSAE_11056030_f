// comment_detail.js - 更新版本

document.addEventListener('DOMContentLoaded', function() {
    // 初始化星級評分顯示
    initializeRatings();
    
    // 按讚按鈕功能
    initializeLikeButtons();
    
    // 回覆功能
    initializeReplyButtons();
    
    // Initialize star ratings with Font Awesome icons
    function initializeRatings() {
        document.querySelectorAll('.stars').forEach(starsContainer => {
            const rating = parseFloat(starsContainer.getAttribute('data-rating'));
            const stars = Array.from(starsContainer.querySelectorAll('i'));
            
            // Set initial rating display
            updateStarIcons(stars, rating);
            
            // Make stars clickable for rating input (if needed)
            if (starsContainer.closest('.editable-rating')) {
                stars.forEach((star, index) => {
                    star.addEventListener('click', () => {
                        const newRating = index + 1;
                        starsContainer.setAttribute('data-rating', newRating);
                        updateStarIcons(stars, newRating);
                    });
                });
            }
        });
    }
    
    function updateStarIcons(stars, rating) {
        stars.forEach((star, index) => {
            const starValue = index + 1;
            
            if (rating >= starValue) {
                // Full star
                star.className = 'fa-solid fa-star';
            } else if (rating > starValue - 1 && rating < starValue) {
                // Half star (for decimal values like 4.5, 3.5, etc.)
                star.className = 'fa-solid fa-star-half-stroke';
            } else {
                // Empty star
                star.className = 'fa-regular fa-star';
            }
        });
    }
    
    // Like button functionality
    function initializeLikeButtons() {
        const likeButtons = document.querySelectorAll('.like-btn');
        likeButtons.forEach(button => {
            button.addEventListener('click', function() {
                const likeCount = this.querySelector('.like-count');
                if (!likeCount) return;
                
                const currentCount = parseInt(likeCount.textContent);
                const isLiked = this.classList.contains('liked');
                const likeIcon = this.querySelector('.like-icon');
                
                if (isLiked) {
                    likeCount.textContent = currentCount - 1;
                    this.classList.remove('liked');
                    if (likeIcon) {
                        likeIcon.innerHTML = '<i class="fa-solid fa-thumbs-up"></i>';
                    }
                } else {
                    likeCount.textContent = currentCount + 1;
                    this.classList.add('liked');
                    if (likeIcon) {
                        likeIcon.innerHTML = '<i class="fa-solid fa-thumbs-up"></i>';
                        
                        // Add animation
                        const icon = likeIcon.querySelector('i');
                        if (icon) {
                            icon.style.transform = 'scale(1.3)';
                            setTimeout(() => {
                                icon.style.transform = 'scale(1)';
                            }, 200);
                        }
                    }
                }
            });
        });
    }

    // Reply functionality
    function initializeReplyButtons() {
        // Handle main reply buttons
        document.addEventListener('click', function(e) {
            // Reply button click
            if (e.target.closest('.reply-btn')) {
                const button = e.target.closest('.reply-btn');
                const commentCard = button.closest('.comment-card');
                const replyForm = commentCard.querySelector('.reply-form');
                
                if (!replyForm) return;
                
                // Hide all other reply forms
                document.querySelectorAll('.reply-form').forEach(form => {
                    if (form !== replyForm) {
                        form.style.display = 'none';
                    }
                });
                
                // Toggle current reply form
                if (replyForm.style.display === 'block') {
                    replyForm.style.display = 'none';
                } else {
                    replyForm.style.display = 'block';
                    replyForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }
            
            // Reply to reply button click
            if (e.target.closest('.reply-to-reply')) {
                const replyBtn = e.target.closest('.reply-to-reply');
                const replyContainer = replyBtn.closest('.replies-container');
                if (!replyContainer) return;
                
                const replyForm = replyContainer.querySelector('.reply-form');
                
                if (replyForm) {
                    replyForm.style.display = replyForm.style.display === 'block' ? 'none' : 'block';
                    if (replyForm.style.display === 'block') {
                        replyForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                }
            }
            
            // Cancel reply button click
            if (e.target.closest('.cancel-reply-btn')) {
                const cancelBtn = e.target.closest('.cancel-reply-btn');
                const form = cancelBtn.closest('.reply-form');
                if (form) {
                    form.style.display = 'none';
                }
            }
            
            // Submit reply button click
            if (e.target.closest('.submit-reply-btn')) {
                const submitBtn = e.target.closest('.submit-reply-btn');
                const form = submitBtn.closest('.reply-form');
                if (!form) return;
                
                const textarea = form.querySelector('textarea');
                if (!textarea) return;
                
                const replyText = textarea.value.trim();
                
                if (replyText) {
                    let repliesContainer = form.closest('.replies-container');
                    
                    // If not inside a replies-container, look for one in the parent comment-card
                    if (!repliesContainer) {
                        const commentCard = form.closest('.comment-card');
                        if (commentCard) {
                            repliesContainer = commentCard.querySelector('.replies-container');
                            
                            // Create a replies-container if it doesn't exist
                            if (!repliesContainer) {
                                repliesContainer = document.createElement('div');
                                repliesContainer.className = 'replies-container';
                                commentCard.appendChild(repliesContainer);
                            }
                        }
                    }
                    
                    if (repliesContainer) {
                        // Create new reply element
                        const newReply = document.createElement('div');
                        newReply.className = 'reply';
                        newReply.innerHTML = `
                            <div class="user-avatar small">
                                <img src="/static/images/default-avatar.png" alt="使用者頭像">
                            </div>
                            <div class="reply-content">
                                <div class="reply-header">
                                    <span class="user-name">匿名用戶</span>
                                    <span class="reply-date">剛剛</span>
                                </div>
                                <p>${replyText}</p>
                                <div class="reply-actions">
                                    <button class="reply-to-reply">回覆</button>
                                </div>
                            </div>
                        `;
                        
                        // Insert new reply
                        repliesContainer.appendChild(newReply);
                        
                        // Clear and hide form
                        textarea.value = '';
                        form.style.display = 'none';
                        
                        // Show success message
                        const successMsg = document.createElement('div');
                        successMsg.className = 'success-message';
                        successMsg.textContent = '回覆已送出！';
                        successMsg.style.textAlign = 'center';
                        successMsg.style.padding = '10px';
                        successMsg.style.color = '#4CAF50';
                        successMsg.style.margin = '10px 0';
                        
                        form.parentNode.insertBefore(successMsg, form.nextSibling);
                        
                        // Remove success message after 3 seconds
                        setTimeout(() => {
                            successMsg.remove();
                        }, 3000);
                    }
                }
            }
        });
    }
});

// Function to handle adding a new comment (to be called from the add comment page)
function submitComment(commentData) {
    // This function would be called from the add comment page
    // after the form is submitted successfully
    console.log('New comment submitted:', commentData);
    // Here you would typically make an AJAX request to save the comment
    // and then update the UI with the new comment
}



// rating_modal.js
document.addEventListener('DOMContentLoaded', function() {
    // 初始化評分模態框功能
    initializeRatingModal();
    
    // 評分模態框功能
    function initializeRatingModal() {
        console.log('初始化評分模態框');
        const modal = document.getElementById('rating-modal');
        if (!modal) {
            console.error('找不到評分模態框');
            return;
        }
        
        // 獲取元素引用
        const addCommentBtn = document.getElementById('add-comment-btn');
        const closeBtn = modal.querySelector('.modal-close');
        const stars = modal.querySelectorAll('.modal-stars i');
        const ratingValue = modal.querySelector('#modal-rating-value');
        const ratingDisplay = modal.querySelector('.rating-display');
        const submitBtn = modal.querySelector('.submit-rating-btn');
        const fullCommentBtn = document.getElementById('full-comment-btn');
        
        // 點擊"新增評論"按鈕顯示模態框
        if (addCommentBtn) {
            console.log('綁定新增評論按鈕點擊事件');
            addCommentBtn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('新增評論按鈕點擊');
                
                // 獲取課程信息
                const courseName = document.querySelector('.course-title')?.textContent || '';
                const courseTeacherEl = document.querySelector('.course-teacher');
                const courseTeacher = courseTeacherEl ? 
                    courseTeacherEl.textContent.replace('授課教師：', '').trim() : '';
                
                // 從URL獲取課程ID
                let courseId = '1'; // 默認值
                // URL中可能包含課程ID，如 /course/123/ 或 ?course=123
                const urlPath = window.location.pathname;
                const urlMatch = urlPath.match(/\/course\/(\d+)/);
                if (urlMatch && urlMatch[1]) {
                    courseId = urlMatch[1];
                } else {
                    // 嘗試從查詢參數獲取
                    const urlParams = new URLSearchParams(window.location.search);
                    const paramCourseId = urlParams.get('course') || urlParams.get('id');
                    if (paramCourseId) {
                        courseId = paramCourseId;
                    }
                }
                
                // 填充模態框信息
                modal.querySelector('.modal-course-name').textContent = courseName;
                modal.querySelector('.modal-course-teacher').textContent = courseTeacher;
                
                // 設置課程ID
                modal.setAttribute('data-course-id', courseId);
                
                // 更新"前往評論頁面"按鈕的URL
                if (fullCommentBtn) {
                    fullCommentBtn.href = `/add_comment/?course=${courseId}`;
                }
                
                // 重置星級評分
                stars.forEach(star => {
                    star.className = 'far fa-star';
                });
                if (ratingValue) ratingValue.value = '0';
                if (ratingDisplay) ratingDisplay.textContent = '0.0';
                
                // 顯示模態框
                modal.style.display = 'block';
                console.log('評分模態框已顯示');
            });
        } else {
            console.error('找不到新增評論按鈕');
        }
        
        // 關閉模態框
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                modal.style.display = 'none';
                console.log('關閉模態框');
            });
        }
        
        // 點擊模態框外部關閉
        window.addEventListener('click', function(event) {
            if (event.target == modal) {
                modal.style.display = 'none';
                console.log('點擊外部關閉模態框');
            }
        });
        
        // 星級評分點擊
        stars.forEach(star => {
            star.addEventListener('click', function() {
                const value = parseInt(this.getAttribute('data-value'));
                console.log(`選擇 ${value} 星評分`);
                
                if (ratingValue) ratingValue.value = value;
                if (ratingDisplay) ratingDisplay.textContent = value + '.0';
                
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
                    } else {
                        s.className = 'far fa-star';
                    }
                });
            });
            
            star.addEventListener('mouseout', function() {
                const currentValue = parseInt(ratingValue?.value || '0');
                
                stars.forEach(s => {
                    const starValue = parseInt(s.getAttribute('data-value'));
                    s.className = starValue <= currentValue ? 'fas fa-star' : 'far fa-star';
                });
            });
        });
        
        // 提交評分
        if (submitBtn) {
            submitBtn.addEventListener('click', function() {
                const value = parseInt(ratingValue?.value || '0');
                const courseId = modal.getAttribute('data-course-id') || '1';
                
                if (value > 0) {
                    console.log(`提交評分：課程ID=${courseId}, 評分=${value}`);
                    // 這裡可以添加 AJAX 請求來提交評分
                    submitRating(courseId, value);
                } else {
                    alert('請選擇評分！');
                }
            });
        }
    }
    
    // 提交評分 (模擬)
    function submitRating(courseId, rating) {
        console.log(`提交評分: 課程ID=${courseId}, 評分=${rating}`);
        
        // 模擬 AJAX 請求
        setTimeout(() => {
            // 顯示成功消息
            const modal = document.getElementById('rating-modal');
            if (!modal) return;
            
            const modalContent = modal.querySelector('.modal-content');
            
            modalContent.innerHTML = `
            <div class="success-message">
                <i class="fas fa-check-circle"></i>
                <h2>評分成功！</h2>
                <p>感謝您的評分，您給出了 ${rating} 星評價。</p>
                <button class="close-modal-btn">關閉</button>
            </div>`;
            
            // 關閉按鈕事件
            const closeBtn = modalContent.querySelector('.close-modal-btn');
            if (closeBtn) {
                closeBtn.addEventListener('click', function() {
                    modal.style.display = 'none';
                    
                    // 重新載入頁面或更新評分顯示
                    setTimeout(() => {
                        window.location.reload();
                    }, 500);
                });
            }
        }, 800); // 模擬網路延遲
    }
});