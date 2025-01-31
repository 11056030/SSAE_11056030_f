//圓圈
document.addEventListener("DOMContentLoaded", function() {
    // 獲取圓形路徑元素
    const path = document.querySelector("#circle-stroke path");
    
    // 獲取路徑的實際長度
    const pathLength = path.getTotalLength();
    console.log("圓形路徑長度:", pathLength);
    
    // 設置初始狀態 - 線條完全不可見
    path.style.strokeDasharray = pathLength;
    path.style.strokeDashoffset = pathLength;
    
    // 兩種方法實現動畫：
    
    // 方法1：使用CSS動畫（推薦，更平滑）
    // 設置keyframe動畫的起始值
    const styleSheet = document.styleSheets[0];
    for (let i = 0; i < styleSheet.cssRules.length; i++) {
        if (styleSheet.cssRules[i].name === 'drawCircle') {
            // 找到drawCircle動畫規則
            const keyframes = styleSheet.cssRules[i];
            for (let j = 0; j < keyframes.cssRules.length; j++) {
                if (keyframes.cssRules[j].keyText === 'from') {
                    // 更新from關鍵幀的值為實際路徑長度
                    keyframes.cssRules[j].style.strokeDashoffset = pathLength + 'px';
                    break;
                }
            }
            break;
        }
    }});



//線條
document.addEventListener("DOMContentLoaded", function() {
    const path = document.querySelector("#animated-line path");
    
    // 獲取路徑的實際長度
    const pathLength = path.getTotalLength();
    console.log("SVG路徑長度:", pathLength);
    
    // 設置初始狀態 - 線條完全不可見
    path.style.strokeDasharray = pathLength;
    path.style.strokeDashoffset = pathLength;
    
    // 監聽滾動事件
    window.addEventListener("scroll", function() {
      // 計算滾動百分比
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrollPercentage = scrollTop / height;
      
      // 根據滾動百分比設置線條的顯示長度
      const drawLength = pathLength * (1 - scrollPercentage);
      path.style.strokeDashoffset = drawLength;
    });
  });

