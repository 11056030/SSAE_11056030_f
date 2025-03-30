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
