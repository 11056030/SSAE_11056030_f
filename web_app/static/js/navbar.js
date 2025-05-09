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

// 使用者菜單和登入模態視窗功能
document.addEventListener('DOMContentLoaded', function() {
    // 獲取元素
    const userMenuButton = document.getElementById('userMenuButton');
    const userDropdown = document.getElementById('userDropdown');
    const loginButton = document.getElementById('loginButton');
    const loginModal = document.getElementById('loginModal');
    const cancelLoginButton = document.getElementById('cancelLogin');
    const closeModalButton = document.querySelector('.close-modal');
    
    // 點擊用戶圖標顯示下拉菜單
    userMenuButton.addEventListener('click', function(e) {
        e.stopPropagation(); // 防止點擊事件傳播
        userDropdown.classList.toggle('show');
    });
    
    // 點擊登入按鈕顯示登入模態視窗
    loginButton.addEventListener('click', function(e) {
        e.preventDefault();
        userDropdown.classList.remove('show'); // 隱藏下拉菜單
        loginModal.classList.add('show'); // 顯示登入模態視窗
    });
    
    // 點擊取消按鈕關閉登入模態視窗
    if (cancelLoginButton) {
        cancelLoginButton.addEventListener('click', function() {
            loginModal.classList.remove('show');
        });
    }
    
    // 點擊關閉按鈕關閉登入模態視窗
    if (closeModalButton) {
        closeModalButton.addEventListener('click', function() {
            loginModal.classList.remove('show');
        });
    }
    
    // 點擊模態視窗外部關閉模態視窗
    loginModal.addEventListener('click', function(e) {
        if (e.target === loginModal) {
            loginModal.classList.remove('show');
        }
    });
    
    // 點擊頁面其他部分關閉下拉菜單
    document.addEventListener('click', function(e) {
        if (!userMenuButton.contains(e.target) && !userDropdown.contains(e.target)) {
            userDropdown.classList.remove('show');
        }
    });
});