// 監聽滾動事件
window.addEventListener('scroll', function() {
    const navbar = document.getElementById('navbar');
    
    // 當滾動超過50px時，切換到滾動狀態的導航欄
    if (window.scrollY > 50) {
        navbar.classList.remove('navbar-initial');
        navbar.classList.add('navbar-scrolled');
    } else {
        navbar.classList.add('navbar-initial');
        navbar.classList.remove('navbar-scrolled');
    }
});
