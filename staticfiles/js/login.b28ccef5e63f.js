document.addEventListener('DOMContentLoaded', function() {
    // Toggle password visibility
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            // Change the eye icon based on password visibility
            const eyeIcon = this.querySelector('img');
            if (eyeIcon) {
                if (type === 'password') {
                    eyeIcon.src = '../static/image/eye.svg';
                } else {
                    eyeIcon.src = '../static/image/eye-slash.svg';
                }
            }
        });
    }
    
    // Form submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            // Show error message when form is submitted
            const errorMessage = document.getElementById('errorMessage');
            if (errorMessage) {
                errorMessage.style.display = 'block';
            }
            
            // Here you would typically send the data to a server
            console.log('Login attempt:', username);
            
            // For demo purposes, simulate a successful login
            // Uncomment for actual implementation
            // alert('登入成功！');
            // Redirect to home page or dashboard
            // window.location.href = '/dashboard';
        });
    }
    
    // Cancel button
    const cancelButton = document.querySelector('.btn-cancel');
    if (cancelButton) {
        cancelButton.addEventListener('click', function() {
            // Clear form fields
            document.getElementById('username').value = '';
            document.getElementById('password').value = '';
            
            // Hide error message when cancel is clicked
            const errorMessage = document.getElementById('errorMessage');
            if (errorMessage) {
                errorMessage.style.display = 'none';
            }
            
            // Or redirect to home page
            // window.location.href = '/';
        });
    }
    
    // Animated background effect enhancement
    const waves = document.querySelectorAll('.wave');
    
    // Add random movement to waves for more natural effect
    waves.forEach((wave, index) => {
        // Apply slight random variations to each wave's animation
        const randomDelay = Math.random() * 5;
        const randomDuration = 15 + Math.random() * 10;
        
        wave.style.animationDelay = `${randomDelay}s`;
        wave.style.animationDuration = `${randomDuration}s`;
    });
});
