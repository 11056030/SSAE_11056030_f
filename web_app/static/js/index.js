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
  const blobs = document.querySelectorAll('.blob');
  
  blobs.forEach((blob, index) => {
    // 設置初始位置
    const randomX = Math.random() * 100;
    const randomY = Math.random() * 100;
    blob.style.left = `${randomX}%`;
    blob.style.top = `${randomY}%`;
    
    // 創建動畫
    blob.animate(
      [
        { transform: `translate(${Math.random() * 50 - 25}%, ${Math.random() * 50 - 25}%)` },
        { transform: `translate(${Math.random() * 50 - 25}%, ${Math.random() * 50 - 25}%)` },
        { transform: `translate(${Math.random() * 50 - 25}%, ${Math.random() * 50 - 25}%)` },
        { transform: `translate(${Math.random() * 50 - 25}%, ${Math.random() * 50 - 25}%)` }
      ],
      {
        duration: 20000 + index * 2000,
        iterations: Infinity,
        direction: 'alternate',
        easing: 'ease-in-out'
      }
    );
  });
}

function initTechParticles() {
  const particleContainer = document.getElementById('tsparticles');
  if (!particleContainer) return;
  
  // 創建自定義流場函數 - 模擬流體動力學
  const customFlowField = {
    resolution: 20, // 流場網格解析度
    points: [],
    time: 0,
    
    // 初始化流場
    initialize: function() {
      this.points = [];
      
      // 建立流場網格
      for (let y = 0; y < this.resolution; y++) {
        for (let x = 0; x < this.resolution; x++) {
          // 將座標正規化到 0-1 範圍
          const nx = x / this.resolution;
          const ny = y / this.resolution;
          
          // 使用某種函數生成初始流場向量
          const angle = this.simplex2(nx * 5, ny * 5 + this.time) * Math.PI * 2;
          
          // 均勻的微小流動，沒有整體向右的偏移
          const vx = Math.cos(angle) * 0.3;
          const vy = Math.sin(angle) * 0.3;
          
          this.points.push({ vx, vy });
        }
      }
    },
    
    update: function() {
      this.time += 0.002;
      
      // 更新流場向量
      for (let i = 0; i < this.points.length; i++) {
        const p = this.points[i];
        const nx = i % this.resolution / this.resolution;
        const ny = Math.floor(i / this.resolution) / this.resolution;
        
        const angle = this.simplex2(nx * 5, ny * 5 + this.time) * Math.PI * 2;
        
        p.vx = Math.cos(angle) * 0.3;
        p.vy = Math.sin(angle) * 0.3;
      }
    },
    
    // 簡化的柏林噪聲函數
    simplex2: function(x, y) {
      const dot = (x, y, vx, vy) => x * vx + y * vy;
      const F2 = 0.5 * (Math.sqrt(3) - 1);
      const G2 = (3 - Math.sqrt(3)) / 6;
      
      const s = (x + y) * F2;
      const i = Math.floor(x + s);
      const j = Math.floor(y + s);
      const t = (i + j) * G2;
      
      const X0 = i - t;
      const Y0 = j - t;
      const x0 = x - X0;
      const y0 = y - Y0;
      
      const i1 = x0 > y0 ? 1 : 0;
      const j1 = x0 > y0 ? 0 : 1;
      
      const x1 = x0 - i1 + G2;
      const y1 = y0 - j1 + G2;
      const x2 = x0 - 1 + 2 * G2;
      const y2 = y0 - 1 + 2 * G2;
      
      // 使用哈希函數生成偽隨機梯度向量
      const hash = (x, y) => {
        return Math.sin(x * 12.9898 + y * 78.233) * 43758.5453 % 1;
      };
      
      const n0 = this.gradientDot(hash(i, j), hash(i + 1, j), x0, y0);
      const n1 = this.gradientDot(hash(i + i1, j + j1), hash(i + i1 + 1, j + j1), x1, y1);
      const n2 = this.gradientDot(hash(i + 1, j + 1), hash(i + 2, j + 1), x2, y2);
      
      // 混合結果
      return 0.5 * (n0 + n1 + n2);
    },
    
    gradientDot: function(h1, h2, x, y) {
      const angle1 = h1 * Math.PI * 2;
      const angle2 = h2 * Math.PI * 2;
      const vx1 = Math.cos(angle1);
      const vy1 = Math.sin(angle1);
      const vx2 = Math.cos(angle2);
      const vy2 = Math.sin(angle2);
      
      return x * vx1 + y * vy1 + x * vx2 + y * vy2;
    },
    
    // 獲取指定位置的流場向量
    getFlowVector: function(x, y) {
      // 將座標歸一化到 0-1 範圍
      const nx = Math.max(0, Math.min(1, x));
      const ny = Math.max(0, Math.min(1, y));
      
      // 找到最近的流場點
      const gridX = Math.floor(nx * this.resolution);
      const gridY = Math.floor(ny * this.resolution);
      const index = gridY * this.resolution + gridX;
      
      if (index >= 0 && index < this.points.length) {
        return this.points[index];
      }
      
      return { vx: 0, vy: 0 };
    }
  };
  
  // 初始化流場
  customFlowField.initialize();
  
  // 粒子系統配置 - 超高密度粒子效果，充滿整個圓形
  const particleConfig = {
    particles: {
      number: {
        value: 1500, // 大幅增加粒子數量使圓形充滿
        density: {
          enable: true,
          value_area: 400 // 降低面積使粒子更密集
        }
      },
      color: {
        value: ["#D1C5D1", "#AA9DA9", "#e0d3e0", "#c8b8c8", "#d8d0d8", "#ffffff", "#f0e8f0"] // 紫色系粒子
      },
      shape: {
        type: "circle"
      },
      opacity: {
        value: 0.65, // 增加不透明度
        random: true,
        anim: {
          enable: true,
          speed: 0.3,
          opacity_min: 0.2,
          sync: false
        }
      },
      size: {
        value: 2.8, // 使粒子大小適中
        random: true,
        anim: {
          enable: true,
          speed: 0.5,
          size_min: 1.2, // 增加最小尺寸
          sync: false
        }
      },
      line_linked: {
        enable: true,
        distance: 40, // 增加連線距離以創建更多連接
        color: "#D1C5D1", // 紫色系連線
        opacity: 0.25, // 增加線條不透明度
        width: 1.0 // 調整線條粗細
      },
      move: {
        enable: true,
        speed: 0.6,
        direction: "none",
        random: false,
        straight: false,
        out_mode: "bounce", // 確保粒子不會離開容器
        bounce: true, // 開啟反彈效果
        attract: {
          enable: false
        }
      }
    },
    interactivity: {
      detect_on: "canvas",
      events: {
        onhover: {
          enable: true,
          mode: "repulse"
        },
        onclick: {
          enable: true,
          mode: "push"
        },
        resize: true
      },
      modes: {
        repulse: {
          distance: 120,
          duration: 0.8,
          speed: 10,
          easing: "ease-out-cubic"
        },
        push: {
          particles_nb: 6
        }
      }
    },
    retina_detect: true,
    fpsLimit: 60,
    fullScreen: {
      enable: false
    }
  };

  // 初始化粒子系統
  const particles = tsParticles.load("tsparticles", particleConfig);
  
  // 添加自定義更新函數，實現流體動力學效果
  let lastTime = 0;
  let mouseX = 0, mouseY = 0;
  let isMouseInteracting = false;
  let mouseInteractionTimeout;
  
  // 追蹤滑鼠位置和互動
  let isMouseOver = false;
  let lastMouseMove = Date.now();
  let flowAnimation;
  
  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    lastMouseMove = Date.now();
    
    const circle = document.querySelector('.circle-particles');
    if (!circle) return;
    
    const rect = circle.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distance = Math.sqrt(Math.pow(mouseX - centerX, 2) + Math.pow(mouseY - centerY, 2));
    
    // 檢測滑鼠是否在圓形附近
    if (distance < rect.width) {
      isMouseInteracting = true;
      isMouseOver = true;
      // 不再使用延遲恢復，當滑鼠離開區域時會立即重設狀態
      
      // 停止自動流動動畫
      if (flowAnimation) {
        cancelAnimationFrame(flowAnimation);
        flowAnimation = null;
      }
    } else if (isMouseOver) {
      isMouseOver = false;
      isMouseInteracting = false; // 立即停止互動狀態
      // 立即恢復圓形狀態，不再有任何延遲
      startFlowAnimation(); // 直接啟動流動動畫，無需等待
    }
  });
  
  // 圓形容器上的互動事件
  const circleContainer = document.querySelector('.circle-particles');
  if (circleContainer) {
    circleContainer.addEventListener('mouseover', () => {
      isMouseOver = true;
      if (flowAnimation) {
        cancelAnimationFrame(flowAnimation);
        flowAnimation = null;
      }
    });
    
    circleContainer.addEventListener('mouseout', () => {
      isMouseOver = false;
      isMouseInteracting = false; // 立即停止互動狀態
      // 立即恢復圓形狀態，不再有任何延遲
      startFlowAnimation(); // 直接啟動流動動畫，無需等待
    });
  }
  
  // 自定義粒子更新函數
  function customParticleUpdate(container) {
    const currentTime = Date.now();
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    
    if (!container || !container.particles) return;
    
    // 更新流場
    customFlowField.update();
    
    // 獲取圓形容器
    const circle = document.querySelector('.circle-particles');
    if (!circle) return;
    const rect = circle.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const radius = rect.width / 2;
    
    // 更新每個粒子
    container.particles.array.forEach(particle => {
      // 計算粒子在畫布中的相對位置 (0-1)
      const canvasWidth = container.canvas.size.width;
      const canvasHeight = container.canvas.size.height;
      const relX = particle.position.x / canvasWidth;
      const relY = particle.position.y / canvasHeight;
      
      // 獲取流場向量
      const flowVector = customFlowField.getFlowVector(relX, relY);
      
      // 計算粒子到圓心的距離
      const particleScreenX = rect.left + relX * rect.width;
      const particleScreenY = rect.top + relY * rect.height;
      const distToCenter = Math.sqrt(Math.pow(particleScreenX - centerX, 2) + Math.pow(particleScreenY - centerY, 2));
      
      // 計算粒子到滑鼠的距離
      const distToMouse = Math.sqrt(Math.pow(particleScreenX - mouseX, 2) + Math.pow(particleScreenY - mouseY, 2));
      
      // 基本流場影響
      let vx = flowVector.vx * 0.3;
      let vy = flowVector.vy * 0.3;
      
      // 計算到圓心的正規化距離
      const normalizedDist = distToCenter / radius;
      
      // 根據是否有滑鼠互動來調整粒子行為
      if (isMouseInteracting) {
        // 滑鼠互動時，讓粒子更分散
        if (normalizedDist > 0.85) { // 提前在接觸邊緣前就開始反彈
          // 從圓形外圈引導粒子回到中心
          const angleToCenter = Math.atan2(centerY - particleScreenY, centerX - particleScreenX);
          const pullStrength = Math.pow(Math.min(1, (normalizedDist - 0.85) / 0.15), 2) * 3.5;
          vx += Math.cos(angleToCenter) * pullStrength;
          vy += Math.sin(angleToCenter) * pullStrength;
        }
        
        // 增加隨機性使粒子更分散，但保持在圓形內
        vx += (Math.random() - 0.5) * 0.6;
        vy += (Math.random() - 0.5) * 0.6;
      } else {
        // 滑鼠沒有互動時，讓粒子回到初始圓形分布位置（且速度歸零）
        if (!particle.basePosition) {
          // 初始化 basePosition 為初始位置
          particle.basePosition = { x: particle.position.x, y: particle.position.y };
        }
        // 讓 basePosition.x 隨時間小幅度左右晃動
        if (!particle.baseOrigin) {
          particle.baseOrigin = { x: particle.basePosition.x, y: particle.basePosition.y };
        }
        const t = Date.now() * 0.002 + (particle.baseOrigin.x % 100); // 每個粒子 phase 不同
        const swing = Math.sin(t) * 6; // 晃動幅度 6px
        const swingX = particle.baseOrigin.x + swing;
        // 計算回歸向量（x 軸晃動，y 軸靜止）
        const dx = swingX - particle.position.x;
        const dy = particle.baseOrigin.y - particle.position.y;
        const distToBase = Math.sqrt(dx * dx + dy * dy);
        const returnSpeed = 0.18;
        if (distToBase > 0.5) {
          vx = dx * returnSpeed;
          vy = dy * returnSpeed;
        } else {
          particle.position.x = swingX;
          particle.position.y = particle.baseOrigin.y;
          particle.velocity.x = 0;
          particle.velocity.y = 0;
          vx = 0;
          vy = 0;
        }
      }
      
      // 滑鼠互動 - 逃離效果，減少互動範圍
      if (isMouseInteracting && distToMouse < 80) { // 減少影響半徑從 150 到 80
        const repulseFactor = Math.max(0, 1 - distToMouse / 80) * 6; // 增強逃離力度
        const angleFromMouse = Math.atan2(particleScreenY - mouseY, particleScreenX - mouseX);
        vx += Math.cos(angleFromMouse) * repulseFactor;
        vy += Math.sin(angleFromMouse) * repulseFactor;
      }
      
      // 應用速度（滑鼠不在時，直接設為 vx/vy）
      if (!isMouseInteracting) {
        particle.velocity.x = vx;
        particle.velocity.y = vy;
      } else {
        particle.velocity.x = particle.velocity.x * 0.92 + vx * 0.08;
        particle.velocity.y = particle.velocity.y * 0.92 + vy * 0.08;
      }
      
      // 限制最大速度
      const speed = Math.sqrt(particle.velocity.x * particle.velocity.x + particle.velocity.y * particle.velocity.y);
      if (speed > 2) {
        particle.velocity.x = (particle.velocity.x / speed) * 2;
        particle.velocity.y = (particle.velocity.y / speed) * 2;
      }
    });
  }
  
  // 添加自定義更新函數到粒子系統
  particles.then(container => {
    if (container) {
      // 覆蓋默認更新函數
      const originalUpdate = container.particles.update.bind(container.particles);
      container.particles.update = (delta) => {
        originalUpdate(delta);
        customParticleUpdate(container);
      };
    }
  });
  
  // 自動流動動畫函數 - 小幅度均勻流動
  function startFlowAnimation() {
    if (isMouseOver || flowAnimation) return;
    
    const circle = document.querySelector('.circle-particles');
    if (!circle) return;
    
    let time = 0;
    const animate = () => {
      time += 0.003; // 降低速度，使運動更柔和
      
      // 創建均勻的圓形路徑運動，不往任何特定方向偏移
      const x = Math.sin(time) * 3;
      const y = Math.cos(time * 1.2) * 3; // 使用不同的频率使運動更自然
      
      circle.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
      
      flowAnimation = requestAnimationFrame(animate);
    };
    
    flowAnimation = requestAnimationFrame(animate);
  }
  
  // 圓形容器的輕微移動效果
  function animateCircleContainer() {
    const circle = document.querySelector('.circle-particles');
    if (!circle) return;
    
    // 初始化圓形狀態 - 將容器置中
    circle.style.transform = 'translate(-50%, -50%)';
    
    // 立即啟動均勻的微小流動，不會往任何特定方向偏移
    startFlowAnimation();
  }
  
  // 啟動圓形容器動畫
  animateCircleContainer();
}

document.addEventListener("DOMContentLoaded", () => {
  initBlobs();
  initTechParticles();
});
  

document.addEventListener("DOMContentLoaded", function () {
  const path = document.querySelector("#circle-stroke path");
  const strokeGroup = document.querySelector(".stroke-group");
  const strokeGroupR = document.querySelector(".stroke-group-r");

  if (path) {
    const pathLength = path.getTotalLength();
    path.style.strokeDasharray = pathLength;
    path.style.strokeDashoffset = pathLength;

    // 播放圓圈動畫
    path.style.animation = "drawCircle 3s ease-in-out forwards";

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

      if (strokeGroup) observer.observe(strokeGroup);
      if (strokeGroupR) observer.observe(strokeGroupR);
    });
  }
});

