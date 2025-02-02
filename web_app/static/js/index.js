//圓圈線條
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
  
    // 顯示初始的 5% 線段
    const initialVisiblePercentage = 0.02; // 5%
    const initialDrawLength = pathLength * (1 - initialVisiblePercentage);
  
    // 設置初始狀態 - 顯示一小段線條
    path.style.strokeDasharray = pathLength;
    path.style.strokeDashoffset = initialDrawLength;
  
    // 監聽滾動事件
    window.addEventListener("scroll", function() {
      // 計算滾動百分比
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrollPercentage = scrollTop / height;
  
      // 根據滾動百分比更新線條長度（從初始狀態繼續）
      const drawLength = pathLength * (1 - scrollPercentage);
      path.style.strokeDashoffset = Math.min(drawLength, initialDrawLength); // 防止倒退
    });
  });
  


//背景
const MIN_SPEED = 0.5
const MAX_SPEED = 2

function randomNumber(min, max) {
  return Math.random() * (max - min) + min
}
  
class Blob {
  constructor(el) {
    this.el = el
    const boundingRect = this.el.getBoundingClientRect()
    this.size = boundingRect.width
    // 隨機初始位置
    this.initialX = randomNumber(0, window.innerWidth - this.size)
    this.initialY = randomNumber(0, window.innerHeight - this.size)
    this.el.style.top = `${this.initialY}px`
    this.el.style.left = `${this.initialX}px`
    // 速度
    this.vx =
      randomNumber(MIN_SPEED, MAX_SPEED) * (Math.random() > 0.5 ? 1 : -1)
    this.vy =
      randomNumber(MIN_SPEED, MAX_SPEED) * (Math.random() > 0.5 ? 1 : -1)
    this.x = this.initialX
    this.y = this.initialY
  }

  update() {
    this.x += this.vx
    this.y += this.vy
    if (this.x >= window.innerWidth - this.size) {
      this.x = window.innerWidth - this.size
      this.vx *= -1
    }
    if (this.y >= window.innerHeight - this.size) {
      this.y = window.innerHeight - this.size
      this.vy *= -1
    }
    if (this.x <= 0) {
      this.x = 0
      this.vx *= -1
    }
    if (this.y <= 0) {
      this.y = 0
      this.vy *= -1
    }

    this.el.style.transform =
      `translate(${this.x - this.initialX}px, ${this.y - this.initialY
      }px)`
  }
}

function initBlobs() {
  const blobEls = document.querySelectorAll('.blob')
  const blobs = Array.from(blobEls).map((blobEl) => new Blob(blobEl))

  function update() {
    requestAnimationFrame(update)
    blobs.forEach((blob) => blob.update()
    )
  }
  requestAnimationFrame(update)
}

document.addEventListener("DOMContentLoaded", () => {
    initBlobs()
  });
  

document.addEventListener("DOMContentLoaded", function () {
  const path = document.querySelector("#circle-stroke path");
  const strokeGroup = document.querySelector(".stroke-group");
  const strokeGroupR = document.querySelector(".stroke-group-r");

  const pathLength = path.getTotalLength();
  path.style.strokeDasharray = pathLength;
  path.style.strokeDashoffset = pathLength;

  // 播放圓圈動畫
  path.style.animation = "drawCircle 3s ease-in-out forwards";

  // 初始化粒子效果
  tsParticles.load("tsparticles", {
    fpsLimit: 60,
    fullScreen: {
      enable: false
    },
    particles: {
      number: {
        value: 120,
        density: {
          enable: true,
          value_area: 800
        }
      },
      color: {
        value: ["#D1C5D1", "#AA9DA9", "#e0d3e0"]
      },
      shape: {
        type: "circle"
      },
      opacity: {
        value: 0.6,
        random: true,
        anim: {
          enable: true,
          speed: 1,
          opacity_min: 0.3,
          sync: false
        }
      },
      size: {
        value: 4,
        random: true,
        anim: {
          enable: true,
          speed: 2,
          size_min: 1,
          sync: false
        }
      },
      line_linked: {
        enable: true,
        distance: 80,
        color: "#D1C5D1",
        opacity: 0.4,
        width: 1
      },
      move: {
        enable: true,
        speed: 3,
        direction: "none",
        random: true,
        straight: false,
        out_mode: "bounce",
        bounce: true,
        attract: {
          enable: true,
          rotateX: 600,
          rotateY: 1200
        }
      }
    },
    interactivity: {
      detect_on: "canvas",
      events: {
        onhover: {
          enable: true,
          mode: "grab"
        },
        onclick: {
          enable: true,
          mode: "push"
        },
        resize: true
      },
      modes: {
        grab: {
          distance: 100,
          line_linked: {
            opacity: 0.8
          }
        },
        bubble: {
          distance: 100,
          size: 5,
          duration: 2,
          opacity: 0.8,
          speed: 3
        },
        repulse: {
          distance: 100,
          duration: 0.4
        },
        push: {
          particles_nb: 4
        },
        remove: {
          particles_nb: 2
        }
      }
    },
    retina_detect: true
  });

  // 當圓圈動畫完成後才啟用觀察器
  path.addEventListener("animationend", function () {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (entry.target.classList.contains("stroke-group")) {
            entry.target.classList.add("animate-stroke-left");
          } else if (entry.target.classList.contains("stroke-group-r")) {
            entry.target.classList.add("animate-stroke-right");
          }
          observer.unobserve(entry.target); // 只觸發一次
        }
      });
    }, {
      threshold: 0.5 // 超過一半才觸發
    });

    observer.observe(strokeGroup);
    observer.observe(strokeGroupR);
  });
});
