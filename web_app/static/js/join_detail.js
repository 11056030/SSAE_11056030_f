// 報名按鈕功能
const ctaButtons = document.querySelectorAll('.fixed-cta');
ctaButtons.forEach(button => {
    button.addEventListener('click', function() {
        alert('報名成功！請於 4/5 前完成繳費，活動詳情將發送到您的個人儀表板。');
    });
});

// 留言功能
const commentForm = document.querySelector('.comment-form');
const commentInput = document.querySelector('.comment-input');
const submitBtn = document.querySelector('.submit-btn');

submitBtn.addEventListener('click', function() {
    if (commentInput.value.trim()) {
        alert('留言已提交！');
        commentInput.value = '';
    }
});
