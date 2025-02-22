document.addEventListener('DOMContentLoaded', function () {
  const transitionPage = document.querySelector('.transition-page');
  const door1 = document.querySelector('.door1');
  const doorFrameExpand = document.querySelector('.door-frame-expand');

  // Step 1: 1 秒後觸發門打開動畫
  setTimeout(function () {
    transitionPage.classList.add('animate');
  }, 1000);

  // Step 2: 約 1.3 秒後（門還在轉，但接近結束）啟動門框放大動畫
  setTimeout(function () {
    doorFrameExpand.classList.add('active');

    // Step 3: 動畫完成後轉跳頁面
    setTimeout(function () {
      window.location.href = '/index/';
    }, 1500); // 根據你的 scale transition duration 設定
  }, 2300); // 調整成比原本 3500 提早

  // ✅ 可選：點擊直接跳過動畫
  transitionPage.addEventListener('click', function () {
    doorFrameExpand.classList.add('active');

    setTimeout(function () {
      window.location.href = '/index/';
    }, 1000);
  });
});
// 設定延遲後自動跳轉
setTimeout(function() {
    // 啟動淡出動畫
    document.querySelector('.transition-page').classList.add('fade-out');
    
    // 等待動畫結束後進行跳轉
    setTimeout(function() {
        window.location.href = "welcome_s.html";  // 更改為你的第二個頁面的網址
    }, 1500);  // 動畫時間是 1.5 秒，所以這裡延遲相同時間
}, 3000);  // 延遲時間：3000毫秒 (即3秒)
