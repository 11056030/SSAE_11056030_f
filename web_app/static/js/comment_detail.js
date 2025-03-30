document.addEventListener('DOMContentLoaded', function() {
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
                const currentCount = parseInt(likeCount.textContent);
                const isLiked = this.classList.contains('liked');
                
                if (isLiked) {
                    likeCount.textContent = currentCount - 1;
                    this.classList.remove('liked');
                    this.querySelector('.like-icon').textContent = '👍';
                } else {
                    likeCount.textContent = currentCount + 1;
                    this.classList.add('liked');
                    this.querySelector('.like-icon').textContent = '👍';
                    
                    // Add animation
                    const icon = this.querySelector('.like-icon');
                    icon.style.transform = 'scale(1.3)';
                    setTimeout(() => {
                        icon.style.transform = 'scale(1)';
                    }, 200);
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
                form.style.display = 'none';
            }
            
            // Submit reply button click
            if (e.target.closest('.submit-reply-btn')) {
                const submitBtn = e.target.closest('.submit-reply-btn');
                const form = submitBtn.closest('.reply-form');
                const textarea = form.querySelector('textarea');
                const replyText = textarea.value.trim();
                
                if (replyText) {
                    const repliesContainer = form.closest('.replies-container') || 
                                           form.closest('.comment-card').querySelector('.replies-container');
                    
                    // Create new reply element
                    const newReply = document.createElement('div');
                    newReply.className = 'reply';
                    newReply.innerHTML = `
                        <div class="user-avatar small">
                            <img src="{% static 'images/default-avatar.png' %}" alt="使用者頭像">
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
                    repliesContainer.insertBefore(newReply, form);
                    
                    // Clear and hide form
                    textarea.value = '';
                    form.style.display = 'none';
                    
                    // Show success message
                    const successMsg = document.createElement('div');
                    successMsg.className = 'success-message';
                    successMsg.textContent = '回覆已送出！';
                    form.parentNode.insertBefore(successMsg, form.nextSibling);
                    
                    // Remove success message after 3 seconds
                    setTimeout(() => {
                        successMsg.remove();
                    }, 3000);
                }
            }
        });
    }

    // Initialize all functionality
    function init() {
        initializeRatings();
        initializeLikeButtons();
        initializeReplyButtons();
        
        // Example of setting a rating programmatically
        // setRating(4.5); // This would be called when you want to update the rating
    }
    
    // Run initialization
    init();
});

// Function to handle adding a new comment (to be called from the add comment page)
function submitComment(commentData) {
    // This function would be called from the add comment page
    // after the form is submitted successfully
    console.log('New comment submitted:', commentData);
    // Here you would typically make an AJAX request to save the comment
    // and then update the UI with the new comment
}
