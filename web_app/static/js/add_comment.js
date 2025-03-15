// add_comment.js

document.addEventListener('DOMContentLoaded', function() {
    const commentTextarea = document.getElementById('comment_text');
    const previewTextarea = document.getElementById('preview_text');
    const convertBtn = document.getElementById('convert_btn');
    const anonymousRadio = document.getElementById('anonymous_no');
    const realNameRadio = document.getElementById('anonymous_yes');
    const usernameElement = document.querySelector('.username');
    
    // Store the original username
    const originalUsername = usernameElement.textContent;
    
    // Make sure preview is initially empty
    previewTextarea.value = '';
    
    // Handle anonymous/real name selection
    anonymousRadio.addEventListener('change', function() {
        if (this.checked) {
            usernameElement.textContent = '匿名';
        }
    });
    
    realNameRadio.addEventListener('change', function() {
        if (this.checked) {
            usernameElement.textContent = originalUsername;
        }
    });
    
    // Allow editing in both textareas independently
    commentTextarea.addEventListener('input', function() {
        // Optional: You can add real-time sync here if desired
        // previewTextarea.value = this.value;
    });
    
    previewTextarea.addEventListener('input', function() {
        // Optional: You can add real-time sync here if desired
        // commentTextarea.value = this.value;
    });
    
    // Handle convert button click - transfer content from left to right with filtering
    convertBtn.addEventListener('click', function() {
        // This is a placeholder for text conversion functionality
        // You could implement text formatting, censoring, or other transformations here
        const originalText = commentTextarea.value;
        
        // Example transformation: replace bad words with asterisks
        const badWords = ['幹', '媽的', '靠北'];
        let convertedText = originalText;
        
        badWords.forEach(word => {
            const replacement = '*'.repeat(word.length);
            const regex = new RegExp(word, 'g');
            convertedText = convertedText.replace(regex, replacement);
        });
        
        // Update preview with converted text
        previewTextarea.value = convertedText;
    });
    
    // Form submission handling
    const commentForm = document.querySelector('.comment-form');
    commentForm.addEventListener('submit', function(e) {
        // You can add form validation here
        const commentText = commentTextarea.value.trim();
        
        if (!commentText) {
            e.preventDefault();
            alert('請輸入評論內容');
            return;
        }
        
        // If using the converted text for submission, you can update the original textarea
        // commentTextarea.value = previewTextarea.value;
    });
});
