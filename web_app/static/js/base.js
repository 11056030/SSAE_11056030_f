// 下拉菜單功能
document.addEventListener('DOMContentLoaded', function() {
  // 獲取用戶圖標元素
  const userCircle = document.querySelector('.user-circle');
  const userDropdown = document.querySelector('.user-dropdown');
  
  if (userCircle && userDropdown) {
    // 點擊用戶圖標時顯示/隱藏下拉菜單
    userCircle.addEventListener('click', function(event) {
      // 只阻止事件冒泡，不阻止默認行為
      event.stopPropagation();
      
      // 切換顯示狀態
      if (userDropdown.style.display === 'block') {
        userDropdown.style.display = 'none';
      } else {
        userDropdown.style.display = 'block';
      }
    });
    
    // 確保下拉菜單中的鏈接可以正常工作
    const dropdownLinks = userDropdown.querySelectorAll('a');
    dropdownLinks.forEach(link => {
      link.addEventListener('click', function(event) {
        // 不阻止默認行為，允許鏈接跳轉
        window.location.href = this.href;
      });
    });
    
    // 點擊頁面其他區域時關閉下拉菜單
    document.addEventListener('click', function(event) {
      if (!userCircle.contains(event.target)) {
        userDropdown.style.display = 'none';
      }
    });
  } else {
    console.error('找不到用戶圖標或下拉菜單元素');
  }
});
