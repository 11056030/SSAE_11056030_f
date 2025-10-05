function initializeParallax() {
    const bgText = document.querySelector('.bg-text');

    function parallaxScroll() {
        const scrollPosition = window.pageYOffset;
        if (bgText) {
            bgText.style.transform = `translateX(${scrollPosition * -0.7}px)`;
        }
    }

    window.addEventListener('scroll', parallaxScroll);
}

window.addEventListener('DOMContentLoaded', function () {
    initializeParallax(); // <== 確保執行初始化
});


// ===== 編輯姓名 =====
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    const row   = document.querySelector('.user-name-row');
    if (!row) return;
    let nameEl  = row.querySelector('.user-name');
    const btn   = row.querySelector('#editNameBtn');

    let editing = false;
    let inputEl = null;
    const pencilSVG = `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/>
      </svg>`;
    const checkSVG  = `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M20 6 9 17l-5-5"/>
      </svg>`;

    function startEdit() {
      const current = nameEl.textContent.trim();
      inputEl = document.createElement('input');
      inputEl.type = 'text';
      inputEl.className = 'user-name-input';
      inputEl.maxLength = 20;
      inputEl.value = current;

      nameEl.replaceWith(inputEl);     // 直接用 input 取代顯示
      inputEl.focus();
      btn.innerHTML = checkSVG;        // 鉛筆 → 勾勾（代表儲存）
      btn.setAttribute('title','儲存');
      row.style.gap = '2px';
      editing = true;
    }

    function saveEdit() {
      const newVal = (inputEl.value || '').trim();
      const display = document.createElement('div');
      display.className = 'user-name';
      display.textContent = newVal || nameEl?.textContent?.trim() || '';
      inputEl.replaceWith(display);
      nameEl = display;

      btn.innerHTML = pencilSVG;       // 勾勾 → 鉛筆
      btn.setAttribute('title','編輯姓名');
      row.style.gap = '25px';
      editing = false;

      // TODO: 在這裡用 fetch/POST 傳到後端保存（如果要即時存 DB）
      // fetch('/profile/update-name/', { method:'POST', headers:{'Content-Type':'application/json','X-CSRFToken': csrftoken}, body: JSON.stringify({ name: newVal }) })
    }

    function cancelEdit() {            // 按 Esc 還原
      const display = document.createElement('div');
      display.className = 'user-name';
      display.textContent = nameEl?.textContent?.trim() || '';
      if (inputEl && inputEl.parentNode) {
        inputEl.replaceWith(display);
        nameEl = display;
      }
      btn.innerHTML = pencilSVG;
      btn.setAttribute('title','編輯姓名');
      editing = false;
    }

    btn.addEventListener('click', () => {
      if (!editing) startEdit();
      else saveEdit();
    });

    // Enter 儲存、Esc 取消
    document.addEventListener('keydown', (e) => {
      if (!editing) return;
      if (e.key === 'Enter') saveEdit();
      if (e.key === 'Escape') cancelEdit();
    });
  });
})();


(function(){
try {
    var node = document.getElementById('calendar-events');
    window.calendarEventsData = node ? JSON.parse(node.textContent || '[]') : [];
} catch (e) { window.calendarEventsData = []; }
})();


// ===== Books modal =====
(function(){
  const modal = document.getElementById('cshelfBookModal');
  if (!modal) return;
  const closeBtn = document.getElementById('cshelfCloseBtn');
  const tTitle = document.getElementById('cshelfBookTitle');
  const tAuthor = document.getElementById('cshelfBookAuthor');
  const tPublisher = document.getElementById('cshelfBookPublisher');
  const tISBN = document.getElementById('cshelfBookISBN');
  const tDesc = document.getElementById('cshelfBookDesc');

  document.querySelectorAll('.cshelf__book').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      tTitle.textContent = btn.dataset.title || '';
      tAuthor.textContent = btn.dataset.author || '—';
      tPublisher.textContent = btn.dataset.publisher || '—';
      tISBN.textContent = btn.dataset.isbn || '—';
      tDesc.textContent = btn.dataset.desc || '';
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden','false');
    });
  });

  const close = ()=>{
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden','true');
  };
  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', (e)=>{ if (e.target === modal) close(); });
})();


// ===== Tickets flip & gentle float =====
(function(){
  const tickets = document.querySelectorAll('.cticket');
  tickets.forEach((el, idx)=>{
    const inner = el.querySelector('.cticket__inner');

    // 點擊 -> 翻面
    el.addEventListener('click', ()=>{
      el.classList.toggle('flipped');
    });

    // 設定初始角度（基礎角度 + 隨機）
    const base = (parseFloat(el.dataset.baseDeg || '0') || 0) + (Math.random() * 8 - 4); // -4~+4度
    el.style.setProperty('--tilt', `${base.toFixed(2)}deg`);

    // 每隔幾秒微微晃動（隨機 ±1 度）
    setInterval(()=>{
      const random = (Math.random() - 0.5) * 2; // -1~+1 度
      const next = (base + random).toFixed(2);
      el.style.setProperty('--tilt', `${next}deg`);
    }, 3000 + idx*400);
  });
})();

// ===== 小三角旗 modal 開啟（全頁） =====
(function(){
  let modal = document.getElementById('cflagModal');
  if (!modal) return;

  // 確保 modal 在 body 直層（避免被祖先 overflow/transform 影響）
  if (modal.parentElement !== document.body) {
    document.body.appendChild(modal);
  }

  const closeBtn = document.getElementById('cflagCloseBtn');
  const elTitle = document.getElementById('cflagTitle');
  const elWhen  = document.getElementById('cflagWhen');
  const elWhere = document.getElementById('cflagWhere');
  const elPeople= document.getElementById('cflagPeople');
  const elDesc  = document.getElementById('cflagDesc');

  const open = () => { modal.classList.add('is-open'); modal.setAttribute('aria-hidden','false'); };
  const close = () => { modal.classList.remove('is-open'); modal.setAttribute('aria-hidden','true'); };

  document.querySelectorAll('.gflag').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const title = btn.dataset.title || '活動';
      const weekday = btn.dataset.weekday || '';
      const month = btn.dataset.month || '';
      const date = btn.dataset.date || '';
      const time = btn.dataset.time || '';
      const location = btn.dataset.location || '—';
      const total = btn.dataset.total || '0';
      const max = btn.dataset.max || '0';
      const desc = btn.dataset.desc || '';

      elTitle.textContent = title;
      elWhen.textContent  = `${month}/${date} ${weekday} ${time}`;
      elWhere.textContent = location;
      elPeople.textContent= `${total}/${max} 人`;
      elDesc.textContent  = desc;

      open();
    });
  });

  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', (e)=>{ if (e.target === modal) close(); });
})();



// 學分進度條
const segments = document.querySelectorAll('.progress-segment');
const tooltip = document.getElementById('tooltip');

segments.forEach(segment => {
    segment.addEventListener('mouseenter', function(e) {
        const tooltipText = this.getAttribute('data-tooltip');
        if (tooltipText && this.style.width !== '0%') {
            tooltip.textContent = tooltipText;
            tooltip.classList.add('show');
            
            // 计算tooltip位置
            const rect = this.getBoundingClientRect();
            const containerRect = this.closest('.profile-item').getBoundingClientRect();
            
            const left = rect.left - containerRect.left + (rect.width / 2);
            tooltip.style.left = left + 'px';
            tooltip.style.transform = `translateX(-90%) translateY(6px)`;
        }
    });
    
    segment.addEventListener('mouseleave', function() {
        tooltip.classList.remove('show');
    });
});

// 页面加载时触发动画
window.addEventListener('load', function() {
    const segments = document.querySelectorAll('.progress-segment.animate');
    segments.forEach((segment, index) => {
        setTimeout(() => {
            segment.style.animationDelay = `${index * 0.2}s`;
        }, 100);
    });
});
document.addEventListener('DOMContentLoaded', function() {
    segments.forEach(segment => {
        if (segment.style.width === '0%') {
            segment.style.pointerEvents = 'none';
        }
    });
});



// 日期相關函數
// 全域狀態
let calendarYear, calendarMonth;
let todoEvents = [];

// ===== API 工具函數 =====
function getCSRFToken() {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'csrftoken') {
            return value;
        }
    }
    return null;
}

async function apiCall(url, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken() || ''
        }
    };
    
    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    try {
        const response = await fetch(url, mergedOptions);
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || `HTTP ${response.status}`);
        }
        return data;
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

// ===== Todo API 函數 =====
async function loadTodos() {
    try {
        const data = await apiCall('/api/todos/');
        
        // 保留活動事件，只更新待辦事項
        const activityEvents = todoEvents.filter(ev => ev.source === 'activity');
        const todoEventsFromAPI = data.todos.map(todo => ({
            id: todo.id,
            year: new Date(todo.date).getFullYear(),
            month: new Date(todo.date).getMonth() + 1,
            day: new Date(todo.date).getDate(),
            text: todo.title,
            title: todo.title,
            description: todo.description,
            completed: todo.completed,
            source: 'todo',
            created_at: todo.created_at
        }));
        
        // 合併活動和待辦事項，並按時間排序
        todoEvents = [...activityEvents, ...todoEventsFromAPI];
        
        // 按日期和時間排序
        todoEvents.sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            if (a.month !== b.month) return a.month - b.month;
            if (a.day !== b.day) return a.day - b.day;
            
            // 同一天內，如果有時間資訊就按時間排序
            if (a.time && b.time) {
                return a.time.localeCompare(b.time);
            }
            
            // 如果有創建時間就按創建時間排序
            if (a.created_at && b.created_at) {
                return new Date(a.created_at) - new Date(b.created_at);
            }
            
            return 0;
        });
        
        // 重新渲染
        updateTodoList();
        renderCalendarEvents();
        console.log('[personal] Loaded todos from API:', todoEvents);
    } catch (error) {
        console.error('[personal] Failed to load todos:', error);
        alert('載入待辦事項失敗：' + error.message);
    }
}

async function createTodoAPI(title, description, date) {
    try {
        const data = await apiCall('/api/todos/create/', {
            method: 'POST',
            body: JSON.stringify({ title, description, date })
        });
        console.log('[personal] Created todo:', data.todo);
        return data.todo;
    } catch (error) {
        console.error('[personal] Failed to create todo:', error);
        throw error;
    }
}

async function updateTodoAPI(todoId, updates) {
    try {
        const data = await apiCall(`/api/todos/${todoId}/update/`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
        console.log('[personal] Updated todo:', data.todo);
        return data.todo;
    } catch (error) {
        console.error('[personal] Failed to update todo:', error);
        throw error;
    }
}

async function deleteTodoAPI(todoId) {
    try {
        await apiCall(`/api/todos/${todoId}/delete/`, {
            method: 'DELETE'
        });
        console.log('[personal] Deleted todo:', todoId);
    } catch (error) {
        console.error('[personal] Failed to delete todo:', error);
        throw error;
    }
}

function pad2(n) { return n < 10 ? '0' + n : '' + n; }

function getCurrentMonthYearObj() {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function getMonthYearText(year, month) {
    return `${year}年${month}月`;
}

function updateCurrentMonth() {
    document.getElementById('currentMonth').textContent = getMonthYearText(calendarYear, calendarMonth);
}

function renderCalendar(year, month) {
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const prevMonthDays = new Date(year, month - 1, 0).getDate();
    const calendarBody = document.getElementById('calendarBody');
    calendarBody.innerHTML = '';

    let row = document.createElement('tr');
    // 上月補空格
    for (let i = 0; i < firstDay; i++) {
        const td = document.createElement('td');
        td.className = 'other-month';
        td.textContent = prevMonthDays - firstDay + i + 1;
        row.appendChild(td);
    }

    let day = 1;
    for (let i = firstDay; i < 7; i++) {
        const td = document.createElement('td');
        td.textContent = day++;
        row.appendChild(td);
    }
    calendarBody.appendChild(row);

    // 其餘日期
    let nextMonthDay = 1;
    while (day <= daysInMonth) {
        row = document.createElement('tr');
        for (let i = 0; i < 7; i++) {
            const td = document.createElement('td');
            if (day > daysInMonth) {
                td.className = 'other-month';
                td.textContent = nextMonthDay++;
            } else {
                td.textContent = day++;
            }
            row.appendChild(td);
        }
        calendarBody.appendChild(row);
    }

    // 填入事件
    renderCalendarEvents();
}


function renderCalendarEvents() {
    // 新增：點擊事件讓點擊有事件的td滾動到詳細卡片
    setTimeout(function() {
        const calendarBody = document.getElementById('calendarBody');
        if (!calendarBody) return;
        calendarBody.querySelectorAll('td').forEach(td => {
            td.removeEventListener('click', td.__scrollToDetailHandler);
            td.__scrollToDetailHandler = function(e) {
                // 只對本月且有 .event 的 td 作用
                if (td.classList.contains('other-month')) return;
                if (!td.querySelector('.event')) return;
                const detailCard = document.querySelector('.detail-card');
                if (detailCard) {
                    detailCard.style.display = '';
                    detailCard.scrollIntoView({behavior: 'smooth'});
                }
            };
            td.addEventListener('click', td.__scrollToDetailHandler);
        });
    }, 0);

    // 只顯示當月事件
    const calendarBody = document.getElementById('calendarBody');
    if (!calendarBody) return;
    const tds = calendarBody.querySelectorAll('td');
    tds.forEach(td => {
        // 移除舊事件
        td.querySelectorAll('.event').forEach(ev => ev.remove());
        // 只處理本月
        if (td.classList.contains('other-month')) return;
        const day = parseInt(td.childNodes[0]?.nodeValue?.trim());
        if (!day) return;
        const events = todoEvents.filter(ev => ev.year === calendarYear && ev.month === calendarMonth && ev.day === day);
        events.forEach(ev => {
            const eventDiv = document.createElement('div');
            eventDiv.className = 'event';
            eventDiv.textContent = ev.text;
            
            // 活動和待辦事項使用不同的樣式
            if (ev.source === 'activity') {
                eventDiv.classList.add('event-activity');
            } else {
                // 待辦事項：檢查是否已完成
                if (ev.completed) {
                    eventDiv.classList.add('event-completed');
                }
            }
            td.appendChild(eventDiv);
        });
    });
}

function setCalendarMonth(year, month) {
    calendarYear = year;
    calendarMonth = month;
    updateCurrentMonth();
    renderCalendar(year, month);
    updateTaskDatePickerMonth(year, month);
}

function updateTaskDatePickerMonth(year, month) {
    const monthDisplay = document.getElementById('taskDateMonth');
    if (monthDisplay) {
        monthDisplay.textContent = getMonthYearText(year, month);
    }
    // 設定 input[type=date] min/max
    const min = `${year}-${pad2(month)}-01`;
    const max = `${year}-${pad2(month)}-${pad2(new Date(year, month, 0).getDate())}`;
    const dateInput = document.getElementById('taskDate');
    if (dateInput) {
        dateInput.setAttribute('min', min);
        dateInput.setAttribute('max', max);
        // 若目前日期不在範圍，重設
        if (dateInput.value < min || dateInput.value > max) dateInput.value = '';
    }
}

// 初始化月份狀態
(function() {
    const now = getCurrentMonthYearObj();
    calendarYear = now.year;
    calendarMonth = now.month;
})();

// 初始化頁面
let selectedDay = null;
function initCalendarPage() {
    updateCurrentMonth();
    renderCalendar(calendarYear, calendarMonth);

    // 日曆左右切換
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    
    if (prevMonthBtn) {
        prevMonthBtn.onclick = () => {
            if (calendarMonth === 1) {
                calendarYear--;
                calendarMonth = 12;
            } else {
                calendarMonth--;
            }
            setCalendarMonth(calendarYear, calendarMonth);
            selectedDay = null;
            updateSelectedDateDisplay();
            bindCalendarDayClick();
        };
    }
    
    if (nextMonthBtn) {
        nextMonthBtn.onclick = () => {
            if (calendarMonth === 12) {
                calendarYear++;
                calendarMonth = 1;
            } else {
                calendarMonth++;
            }
            setCalendarMonth(calendarYear, calendarMonth);
            selectedDay = null;
            updateSelectedDateDisplay();
            bindCalendarDayClick();
        };
    }
    
    bindCalendarDayClick();
}

function bindCalendarDayClick() {
    // 只給本月的 td 綁定點擊
    document.querySelectorAll('#calendarBody td').forEach(td => {
        if (!td.classList.contains('other-month')) {
            td.style.cursor = 'pointer';
            td.onclick = function() {
                selectedDay = parseInt(td.childNodes[0]?.nodeValue?.trim());
                updateSelectedDateDisplay();
                // 高亮顯示
                document.querySelectorAll('#calendarBody td').forEach(t => t.classList.remove('selected-calendar-day'));
                td.classList.add('selected-calendar-day');
                showDetailCard();
                // 動畫：確保卡片顯示後再滾動
                setTimeout(function() {
                    const detailCard = document.querySelector('.detail-card');
                    if (detailCard) {
                        detailCard.scrollIntoView({behavior: 'smooth'});
                    }
                }, 100);
            };
        } else {
            td.onclick = null;
            td.style.cursor = '';
        }
    });
}



// 顯示詳細資訊卡片，隱藏待辦事項卡片，並載入該天事項
function showDetailCard() {
    const todoCard = document.querySelector('.todo-card');
    const detailCard = document.querySelector('.detail-card');

    if (todoCard) todoCard.style.display = 'none';
    if (detailCard) detailCard.style.display = 'block';

    const titleElement = document.getElementById('detailCardTitle');
    const dateElement = document.getElementById('detailCardDate');

    if (titleElement) titleElement.textContent = '詳細資訊';
    if (dateElement) dateElement.textContent = `${calendarYear}.${calendarMonth}.${selectedDay}`;

    const ul = document.querySelector('.detail-todo-list');
    if (ul) {
        ul.innerHTML = '';
        const events = todoEvents.filter(ev => ev.year === calendarYear && ev.month === calendarMonth && ev.day === selectedDay);
        
        // 按類型和時間排序：活動在前，待辦事項在後，同類型內按創建時間排序
        events.sort((a, b) => {
            // 活動優先顯示
            if (a.source === 'activity' && b.source !== 'activity') return -1;
            if (a.source !== 'activity' && b.source === 'activity') return 1;
            
            // 同類型按創建時間排序（如果有的話）
            if (a.created_at && b.created_at) {
                return new Date(a.created_at) - new Date(b.created_at);
            }
            
            // 預設按標題排序
            return (a.title || a.text || '').localeCompare(b.title || b.text || '');
        });
        if (events.length === 0) {
            ul.innerHTML = '<li style="padding: 20px; text-align: center; color: #999;">尚無事項</li>';
        } else {
            events.forEach((ev, idx) => {
            const taskId = `detail-task-${idx}`;

            // 建立 li 待辦項目
            const li = document.createElement('li');
            li.className = 'todo-item';
            
            // 活動項目不能勾選完成或刪除
            if (ev.source === 'activity') {
                li.innerHTML = `
                    <span class="activity-indicator">📅</span>
                    <label class="activity-label">${ev.title || ev.text}</label>
                    <span class="todo-status activity-status">${ev.month}/${ev.day}</span>
                `;
                li.classList.add('activity-item');
            } else {
                li.innerHTML = `
                    <input type="checkbox" id="${taskId}">
                    <label for="${taskId}">${ev.title || ev.text}</label>
                    <span class="todo-status" data-original="${ev.month}/${ev.day}">${ev.month}/${ev.day}</span>
                    <button class="delete-task-btn" title="刪除事項">×</button>
                `;
            }
            ul.appendChild(li);

            // 建立說明容器（分開 append）
            let detailDiv = null;
            if (ev.description) {
                detailDiv = document.createElement('div');
                detailDiv.className = 'todo-detail-container';
                detailDiv.innerHTML = `
                    <div class="todo-detail-label">詳細說明</div>
                    <div class="todo-detail-box">${ev.description}</div>
                `;
                ul.appendChild(detailDiv);

                // 是否預設收起（若已完成）
                if (ev.completed) {
                    detailDiv.classList.add('collapsed');
                }

                // 點擊 todo-item 時 toggle 展開/收起
                li.addEventListener('click', function (e) {
                    // 避免點到 checkbox、刪除鍵時也觸發 toggle
                    if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
                    detailDiv.classList.toggle('collapsed');
                });
            }

            // 只有待辦事項才有互動功能，活動項目只是顯示
            if (ev.source !== 'activity') {
                const checkbox = li.querySelector('input[type="checkbox"]');
                const statusSpan = li.querySelector('.todo-status');
                const deleteBtn = li.querySelector('.delete-task-btn');

                deleteBtn.addEventListener('click', async function () {
                    if (confirm('確定要刪除此待辦事項嗎？')) {
                        try {
                            await deleteTodoAPI(ev.id);
                            await loadTodos();
                            showDetailCard();
                        } catch (error) {
                            alert('刪除待辦事項失敗：' + error.message);
                        }
                    }
                });

                if (ev.completed) {
                    li.classList.add('completed');
                    checkbox.checked = true;
                    statusSpan.textContent = '已完成';
                }

                checkbox.addEventListener('change', async function () {
                    const completed = this.checked;
                    try {
                        await updateTodoAPI(ev.id, { completed });
                        
                        if (completed) {
                            // 更新資料
                            updateTaskCompletion(ev.text, true);
                            renderCalendarEvents();
                            
                            // 添加完成動畫
                            li.classList.add('completing');
                            
                            // 為其他項目添加向上移動動畫
                            const allItems = Array.from(ul.querySelectorAll('.todo-item'));
                            const currentIndex = allItems.indexOf(li);
                            
                            // 為當前項目之後的所有項目添加向上移動動畫
                            allItems.slice(currentIndex + 1).forEach((item, index) => {
                                setTimeout(() => {
                                    item.classList.add('slide-up');
                                    // 移除動畫類別，以便下次使用
                                    setTimeout(() => {
                                        item.classList.remove('slide-up');
                                    }, 400);
                                }, 100 + index * 50); // 錯開動畫時間
                            });
                            
                            // 動畫結束後重新載入詳細卡片
                            setTimeout(() => {
                                loadTodos().then(() => {
                                    showDetailCard();
                                });
                            }, 600);
                            
                        } else {
                            li.classList.remove('completed');
                            statusSpan.textContent = statusSpan.getAttribute('data-original');
                            updateTaskCompletion(ev.text, false);
                            renderCalendarEvents();
                        }
                    } catch (error) {
                        // 回復 checkbox 狀態
                        this.checked = !completed;
                        alert('更新待辦事項失敗：' + error.message);
                    }
                });
            }
        });

        }
    }

    updateTodoList();
}



// 重新渲染主待辦事項卡片的列表
function updateTodoList() {
    const todoUl = document.querySelector('.todo-list');
    if (!todoUl) return;
    todoUl.innerHTML = '';

    // 只保留「今天之後（含今天）」的項目
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth() + 1, d = now.getDate();
    const isTodayOrFuture = (ev) => {
        // 無日期的項目不顯示在待辦
        if (!ev || !ev.year || !ev.month || !ev.day) return false;
        
        // 已完成的待辦事項不顯示（但活動仍然顯示）
        if (ev.source === 'todo' && ev.completed) return false;
        
        if (ev.year > y) return true;
        if (ev.year < y) return false;
        if (ev.month > m) return true;
        if (ev.month < m) return false;
        return ev.day >= d; // 同年同月需 >= 今天（含今天）
    };

    const list = (todoEvents || []).filter(isTodayOrFuture);
    
    // 按日期和時間排序（最近的在前面）
    list.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        if (a.month !== b.month) return a.month - b.month;
        if (a.day !== b.day) return a.day - b.day;
        
        // 同一天內，如果有時間資訊就按時間排序
        if (a.time && b.time) {
            return a.time.localeCompare(b.time);
        }
        
        // 如果有創建時間就按創建時間排序
        if (a.created_at && b.created_at) {
            return new Date(a.created_at) - new Date(b.created_at);
        }
        
        return 0;
    });

    if (list.length === 0) {
        todoUl.innerHTML = '<li class="todo-item" style="padding: 20px; text-align: center; color: #999;">尚無待辦事項</li>';
        return;
    }

    list.forEach((ev, idx) => {
        const taskId = 'task' + (idx + 1);
        const li = document.createElement('li');
        li.className = 'todo-item';
        
        // 活動項目不能勾選完成或刪除
        if (ev.source === 'activity') {
            li.innerHTML = `
                <span class="activity-indicator">📅</span>
                <label class="activity-label">${ev.text}</label>
                <span class="todo-status activity-status">${ev.month}/${ev.day}</span>
            `;
            li.classList.add('activity-item');
        } else {
            li.innerHTML = `
                <input type="checkbox" id="${taskId}">
                <label for="${taskId}">${ev.text}</label>
                <span class="todo-status" data-original="${ev.month}/${ev.day}">${ev.month}/${ev.day}</span>
                <button class="delete-task-btn" title="刪除事項">×</button>
            `;
        }
        todoUl.appendChild(li);

        // 只有待辦事項才有互動功能，活動項目只是顯示
        if (ev.source !== 'activity') {
            const checkbox = li.querySelector('input[type="checkbox"]');
            const statusSpan = li.querySelector('.todo-status');
            const deleteBtn = li.querySelector('.delete-task-btn');

            deleteBtn.addEventListener('click', async function () {
                if (confirm('確定要刪除此待辦事項嗎？')) {
                    try {
                        await deleteTodoAPI(ev.id);
                        await loadTodos();
                    } catch (error) {
                        alert('刪除待辦事項失敗：' + error.message);
                    }
                }
            });

            if (ev.completed) {
                li.classList.add('completed');
                checkbox.checked = true;
                statusSpan.textContent = '已完成';
            }

            checkbox.addEventListener('change', async function () {
                const completed = this.checked;
                try {
                    await updateTodoAPI(ev.id, { completed });
                    
                    if (completed) {
                        // 更新資料
                        updateTaskCompletion(ev.text, true);
                        renderCalendarEvents();
                        
                        // 添加完成動畫
                        li.classList.add('completing');
                        
                        // 為其他項目添加向上移動動畫
                        const allItems = Array.from(todoUl.querySelectorAll('.todo-item'));
                        const currentIndex = allItems.indexOf(li);
                        
                        // 為當前項目之後的所有項目添加向上移動動畫
                        allItems.slice(currentIndex + 1).forEach((item, index) => {
                            setTimeout(() => {
                                item.classList.add('slide-up');
                                // 移除動畫類別，以便下次使用
                                setTimeout(() => {
                                    item.classList.remove('slide-up');
                                }, 400);
                            }, 100 + index * 50); // 錯開動畫時間
                        });
                        
                        // 動畫結束後重新載入列表
                        setTimeout(() => {
                            loadTodos();
                        }, 600);
                        
                    } else {
                        li.classList.remove('completed');
                        statusSpan.textContent = statusSpan.getAttribute('data-original');
                        updateTaskCompletion(ev.text, false);
                        renderCalendarEvents();
                    }
                } catch (error) {
                    // 回復 checkbox 狀態
                    this.checked = !completed;
                    alert('更新待辦事項失敗：' + error.message);
                }
            });
        }
    });
}

// 標記行事曆事件完成/取消
function markCalendarEventCompleted(eventText, completed) {
    const calendarBody = document.getElementById('calendarBody');
    if (!calendarBody) return;
    const tds = calendarBody.querySelectorAll('td');
    tds.forEach(td => {
        td.querySelectorAll('.event').forEach(ev => {
            if (ev.textContent === eventText) {
                if (completed) {
                    ev.classList.add('event-completed');
                } else {
                    ev.classList.remove('event-completed');
                }
            }
        });
    });
}
function updateTaskCompletion(taskText, completed) {
    for (let ev of todoEvents) {
        if (ev.text === taskText) {
            ev.completed = completed;
            break;
        }
    }
}

function updateSelectedDateDisplay() {
    const display = document.getElementById('selectedDateDisplay');
    const newTaskInput = document.getElementById('newTask');
    if (selectedDay) {
        if (display) {
            display.style.display = 'block';
            display.textContent = `${calendarYear}.${calendarMonth}.${selectedDay}`;
        }
        if (newTaskInput) newTaskInput.placeholder = '添加新的待辦事項...';
    } else {
        if (display) display.style.display = 'none';
        if (newTaskInput) newTaskInput.placeholder = '請點選左方日期';
    }
    if (newTaskInput) newTaskInput.value = '';
}


// 待辦事項相關函數
async function addNewTask() {
    const newTaskInput = document.getElementById('newTask');
    if (!newTaskInput) return;

    const taskText = newTaskInput.value.trim();
    if (!selectedDay) {
        alert('請先點選左側日曆日期');
        return;
    }
    if (taskText === '') return;

    const dateStr = `${calendarYear}-${String(calendarMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    
    try {
        await createTodoAPI(taskText, '', dateStr);
        newTaskInput.value = '';
        await loadTodos(); // 重新載入所有待辦事項
    } catch (error) {
        alert('新增待辦事項失敗：' + error.message);
    }
}

// 新增詳細資訊卡片的待辦事項
// 確保 DOMContentLoaded 後再綁定事件
window.addEventListener('DOMContentLoaded', function () {
    const addDetailBtn = document.getElementById('addDetailTask');
    if (addDetailBtn) {
        addDetailBtn.addEventListener('click', async function () {
            // 新增：點擊新增事項後滾動回行事曆
            setTimeout(function() {
                const calendarCard = document.querySelector('.calendar-card');
                if (calendarCard) {
                    calendarCard.scrollIntoView({behavior: 'smooth'});
                }
            }, 350); // 稍微延遲，讓新增動畫/渲染完成

            const titleInput = document.getElementById('newDetailTaskTitle');
            const descriptionInput = document.getElementById('newDetailTaskDescription');

            if (!titleInput) {
                console.error('找不到標題輸入框');
                return;
            }

            const title = titleInput.value.trim();
            const description = descriptionInput ? descriptionInput.value.trim() : '';

            if (!selectedDay) {
                alert('請先點選左側日曆日期');
                return;
            }
            if (!title) {
                alert('請輸入待辦事項標題');
                return;
            }

            let taskText = title;

            const dateStr = `${calendarYear}-${String(calendarMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
            
            try {
                await createTodoAPI(title, description, dateStr);
                titleInput.value = '';
                if (descriptionInput) descriptionInput.value = '';
                await loadTodos(); // 重新載入
                showDetailCard(); // 重新顯示詳細卡片
            } catch (error) {
                alert('新增待辦事項失敗：' + error.message);
            }
        });
    }

    const backBtn = document.getElementById('backToTodo');
    if (backBtn) {
        backBtn.addEventListener('click', function () {
            const detailCard = document.querySelector('.detail-card');
            const todoCard = document.querySelector('.todo-card');
            if (detailCard) detailCard.style.display = 'none';
            if (todoCard) todoCard.style.display = 'block';

            updateTodoList();
        });
    }

    const clearBtn = document.getElementById('clearDetailForm');
    if (clearBtn) {
        clearBtn.addEventListener('click', function () {
            const titleInput = document.getElementById('newDetailTaskTitle');
            const descriptionInput = document.getElementById('newDetailTaskDescription');
            if (titleInput) titleInput.value = '';
            if (descriptionInput) descriptionInput.value = '';
            if (titleInput) titleInput.focus();
        });
    }

    const titleInput = document.getElementById('newDetailTaskTitle');
    if (titleInput) {
        titleInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                const descriptionInput = document.getElementById('newDetailTaskDescription');
                if (descriptionInput) {
                    descriptionInput.focus();
                }
            }
        });
    }

    const descriptionInput = document.getElementById('newDetailTaskDescription');
    if (descriptionInput) {
        descriptionInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter' && e.ctrlKey) {
                const addBtn = document.getElementById('addDetailTask');
                if (addBtn) {
                    addBtn.click();
                }
            }
        });
    }

    // 導後端傳來的活動事件注入行事曆（需在 initCalendarPage 之前）
    try {
        var evs = (window.calendarEventsData || []);
        console.log('[personal] calendarEventsData:', evs);
        evs.forEach(function(e){
            if (!e || !e.date) return;
            var d = new Date(e.date);
            if (isNaN(d)) return;
            todoEvents.push({
                year: d.getFullYear(),
                month: d.getMonth() + 1,
                day: d.getDate(),
                text: e.title || '活動',
                title: e.title || '活動',
                completed: false,
                source: 'activity',
                activityId: e.id, // 保存活動 ID
                created_at: e.created_at || new Date().toISOString(), // 活動創建時間
                time: e.time || null // 活動時間
            });
        });
        
        // 注入後立即排序（按日期和時間）
        todoEvents.sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            if (a.month !== b.month) return a.month - b.month;
            if (a.day !== b.day) return a.day - b.day;
            
            // 同一天內，如果有時間資訊就按時間排序
            if (a.time && b.time) {
                return a.time.localeCompare(b.time);
            }
            
            // 如果有創建時間就按創建時間排序
            if (a.created_at && b.created_at) {
                return new Date(a.created_at) - new Date(b.created_at);
            }
            
            return 0;
        });
        console.log('[personal] todoEvents after inject:', todoEvents);

        // 若本月沒有任何事件，則自動切換到最近的一筆活動月份
        if (todoEvents.length > 0) {
            var hasInCurrentMonth = todoEvents.some(function(ev){
                return ev.year === calendarYear && ev.month === calendarMonth;
            });
            if (!hasInCurrentMonth) {
                // 選擇未來最近的活動，若都在過去則取第一筆
                var now = new Date();
                var upcoming = todoEvents
                    .map(function(ev){ return new Date(ev.year, ev.month - 1, ev.day); })
                    .sort(function(a, b){ return a - b; })
                    .find(function(d){ return d >= new Date(now.getFullYear(), now.getMonth(), 1); }) ||
                    new Date(todoEvents[0].year, todoEvents[0].month - 1, todoEvents[0].day);
                calendarYear = upcoming.getFullYear();
                calendarMonth = upcoming.getMonth() + 1;
                console.log('[personal] switch calendar to', calendarYear, calendarMonth);
            }
        }
    } catch (err) { console.warn('[personal] inject events error:', err); }

    // 載入後端待辦事項（會保留已注入的活動事件）
    loadTodos().then(() => {
        console.log('[personal] Initial todos loaded');
    }).catch(error => {
        console.error('[personal] Failed to load initial todos:', error);
    });

    initCalendarPage();

});
(function() {
    document.addEventListener('DOMContentLoaded', function() {
        const userNameDiv = document.querySelector('.profile-image .user-name');
        const editBtn = document.querySelector('.profile-image .btn-secondary');
        let editing = false;
        let inputEl = null;
        if (userNameDiv && editBtn) {
            editBtn.addEventListener('click', function () {
                if (!editing) {
                    // Create input
                    inputEl = document.createElement('input');
                    inputEl.type = 'text';
                    inputEl.className = 'user-name-input';
                    inputEl.value = userNameDiv.textContent.trim();
                    inputEl.style.width = '100%';
                    inputEl.style.marginTop = '8px';
                    inputEl.maxLength = 20;
                    userNameDiv.style.display = 'none';
                    userNameDiv.parentNode.insertBefore(inputEl, editBtn);
                    inputEl.focus();
                    editBtn.textContent = '儲存';
                    editing = true;

                    // Save on blur or enter
                    function saveName() {
                        userNameDiv.textContent = inputEl.value.trim() || userNameDiv.textContent;
                        userNameDiv.style.display = '';
                        inputEl.remove();
                        editBtn.textContent = '編輯資料';
                        editing = false;
                    }
                    inputEl.addEventListener('blur', saveName);
                    inputEl.addEventListener('keydown', function(e) {
                        if (e.key === 'Enter') {
                            saveName();
                        }
                    });
                }
            });
        }
    });
})();



// ===== 工具函數 =====
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

function showMessage(message, type = 'info') {
  // 創建訊息元素
  const messageEl = document.createElement('div');
  messageEl.className = `message message-${type}`;
  messageEl.textContent = message;
  messageEl.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    z-index: 10000;
    animation: slideIn 0.3s ease;
    background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  `;
  
  document.body.appendChild(messageEl);
  
  // 3秒後自動移除
  setTimeout(() => {
    messageEl.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => messageEl.remove(), 300);
  }, 3000);
}

// 新增動畫樣式
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);

// ===== 編輯個人資料 =====
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    const row   = document.querySelector('.user-name-row');
    if (!row) return;
    let nameEl  = row.querySelector('.user-name');
    const btn   = row.querySelector('#editNameBtn');

    // 找到電話和LINE ID的元素
    const phoneItems = document.querySelectorAll('.profile-item');
    let phoneValueEl = null;
    let lineValueEl = null;
    
    phoneItems.forEach(item => {
      const label = item.querySelector('.label');
      if (label && label.textContent.trim() === '電話') {
        phoneValueEl = item.querySelector('.value');
      }
      if (label && label.textContent.trim() === 'LINE') {
        lineValueEl = item.querySelector('.value');
      }
    });

    let editing = false;
    let nameInputEl = null;
    let phoneInputEl = null;
    let lineInputEl = null;
    
    const pencilSVG = `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/>
      </svg>`;
    const checkSVG  = `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M20 6 9 17l-5-5"/>
      </svg>`;

    function startEdit() {
      // 編輯姓名
      const currentName = nameEl.textContent.trim();
      nameInputEl = document.createElement('input');
      nameInputEl.type = 'text';
      nameInputEl.className = 'user-name-input';
      nameInputEl.maxLength = 20;
      nameInputEl.value = currentName;
      nameEl.replaceWith(nameInputEl);
      nameInputEl.focus();

      // 編輯電話
      if (phoneValueEl) {
        const currentPhone = phoneValueEl.textContent.trim();
        phoneInputEl = document.createElement('input');
        phoneInputEl.type = 'tel';
        phoneInputEl.className = 'profile-input';
        phoneInputEl.maxLength = 20;
        phoneInputEl.value = currentPhone === '未設定' ? '' : currentPhone;
        phoneInputEl.placeholder = '請輸入電話號碼';
        phoneValueEl.replaceWith(phoneInputEl);
      }

      // 編輯LINE ID
      if (lineValueEl) {
        const currentLine = lineValueEl.textContent.trim();
        lineInputEl = document.createElement('input');
        lineInputEl.type = 'text';
        lineInputEl.className = 'profile-input';
        lineInputEl.maxLength = 50;
        lineInputEl.value = currentLine === '未設定' ? '' : currentLine;
        lineInputEl.placeholder = '請輸入LINE ID';
        lineValueEl.replaceWith(lineInputEl);
      }

      btn.innerHTML = checkSVG;
      btn.setAttribute('title','儲存');
      row.style.gap = '2px';
      editing = true;
    }

    function saveEdit() {
      // 儲存姓名
      const newName = (nameInputEl.value || '').trim();
      const nameDisplay = document.createElement('div');
      nameDisplay.className = 'user-name';
      nameDisplay.textContent = newName || nameEl?.textContent?.trim() || '';
      nameInputEl.replaceWith(nameDisplay);
      nameEl = nameDisplay;

      // 儲存電話
      if (phoneInputEl) {
        const newPhone = (phoneInputEl.value || '').trim();
        const phoneDisplay = document.createElement('div');
        phoneDisplay.className = 'value';
        phoneDisplay.textContent = newPhone || '未設定';
        phoneInputEl.replaceWith(phoneDisplay);
        phoneValueEl = phoneDisplay;
      }

      // 儲存LINE ID
      if (lineInputEl) {
        const newLine = (lineInputEl.value || '').trim();
        const lineDisplay = document.createElement('div');
        lineDisplay.className = 'value';
        lineDisplay.textContent = newLine || '未設定';
        lineInputEl.replaceWith(lineDisplay);
        lineValueEl = lineDisplay;
      }

      btn.innerHTML = pencilSVG;
      btn.setAttribute('title','編輯資料');
      row.style.gap = '25px';
      editing = false;

      // 發送到後端保存
      const data = {
        anonymous: newName,  // 更改為 anonymous 欄位
        phone: phoneInputEl ? phoneInputEl.value.trim() : '',
        line_id: lineInputEl ? lineInputEl.value.trim() : ''
      };
      
      // 取得 CSRF token
      const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || 
                       document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ||
                       getCookie('csrftoken');
      
      fetch('/api/profile/update/', { 
        method: 'POST', 
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrftoken
        }, 
        body: JSON.stringify(data) 
      })
      .then(response => response.json())
      .then(result => {
        if (result.success) {
          console.log('個人資料更新成功:', result.message);
          // 可以顯示成功訊息
          showMessage('個人資料更新成功！', 'success');
        } else {
          console.error('更新失敗:', result.error);
          showMessage('更新失敗: ' + result.error, 'error');
        }
      })
      .catch(error => {
        console.error('網路錯誤:', error);
        showMessage('網路錯誤，請稍後再試', 'error');
      });
    }

    function cancelEdit() {
      // 還原姓名
      const nameDisplay = document.createElement('div');
      nameDisplay.className = 'user-name';
      nameDisplay.textContent = nameEl?.textContent?.trim() || '';
      if (nameInputEl && nameInputEl.parentNode) {
        nameInputEl.replaceWith(nameDisplay);
        nameEl = nameDisplay;
      }

      // 還原電話
      if (phoneInputEl && phoneInputEl.parentNode) {
        const phoneDisplay = document.createElement('div');
        phoneDisplay.className = 'value';
        phoneDisplay.textContent = phoneValueEl?.textContent?.trim() || '未設定';
        phoneInputEl.replaceWith(phoneDisplay);
        phoneValueEl = phoneDisplay;
      }

      // 還原LINE ID
      if (lineInputEl && lineInputEl.parentNode) {
        const lineDisplay = document.createElement('div');
        lineDisplay.className = 'value';
        lineDisplay.textContent = lineValueEl?.textContent?.trim() || '未設定';
        lineInputEl.replaceWith(lineDisplay);
        lineValueEl = lineDisplay;
      }

      btn.innerHTML = pencilSVG;
      btn.setAttribute('title','編輯資料');
      editing = false;
    }

    btn.addEventListener('click', () => {
      if (!editing) startEdit();
      else saveEdit();
    });

    // Enter 儲存、Esc 取消
    document.addEventListener('keydown', (e) => {
      if (!editing) return;
      if (e.key === 'Enter') saveEdit();
      if (e.key === 'Escape') cancelEdit();
    });
  });
})();


(function(){
try {
    var node = document.getElementById('calendar-events');
    window.calendarEventsData = node ? JSON.parse(node.textContent || '[]') : [];
} catch (e) { window.calendarEventsData = []; }
})();


// ===== CSRF Token Helper =====
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

// ===== Books modal =====
(function(){
  function getPerPage() {
    return window.innerWidth <= 768 ? 3 : 5;
  }

  let PER_PAGE = getPerPage();
  const ITEM_SELECTOR = '.cshelf__book';

  const shelf = document.querySelector('#bookshelf');
  if (!shelf) return;

  const items = Array.from(shelf.querySelectorAll(ITEM_SELECTOR));
  const pager = document.querySelector('#bookshelfPager');
  if (!items.length || !pager) return;

  let current = 1;
  let total = Math.max(1, Math.ceil(items.length / PER_PAGE));

  function render(){
    const start = (current - 1) * PER_PAGE;
    const end   = start + PER_PAGE;
    items.forEach((el, i) => {
      el.style.display = (i >= start && i < end) ? '' : 'none';
    });
    renderPager();
  }

  function goto(n){
    current = Math.min(Math.max(1, n), total);
    render();
    
  }

  function renderPager(){
    pager.innerHTML = '';
    const mkBtn = (label, page, disabled=false, active=false) => {
      const btn = document.createElement('button');
      btn.className = 'pager__btn' + (active ? ' is-active' : '') + (disabled ? ' is-disabled' : '');
      btn.type = 'button';
      btn.textContent = label;
      if (!disabled && !active) btn.addEventListener('click', () => goto(page));
      return btn;
    };

    pager.appendChild(mkBtn('◀︎', current - 1, current === 1));
    const windowSize = 5;
    const half = Math.floor(windowSize / 2);
    let start = Math.max(1, current - half);
    let end   = Math.min(total, start + windowSize - 1);
    if (end - start + 1 < windowSize) start = Math.max(1, end - windowSize + 1);

    for (let p = start; p <= end; p++){
      pager.appendChild(mkBtn(String(p), p, false, p === current));
    }
    pager.appendChild(mkBtn('▶︎', current + 1, current === total));
  }

  render();

  // 視窗大小變動 → 重新計算每頁數量
  window.addEventListener('resize', () => {
    const newPerPage = getPerPage();
    if (newPerPage !== PER_PAGE) {
      PER_PAGE = newPerPage;
      total = Math.max(1, Math.ceil(items.length / PER_PAGE));
      current = 1;
      render();
    }
  });
})();

(function(){
  const modal = document.getElementById('cshelfBookModal');
  if (!modal) return;
  const closeBtn = document.getElementById('cshelfCloseBtn');
  const tTitle = document.getElementById('cshelfBookTitle');
  const tStatus = document.getElementById('cshelfBookStatus');
  const tAuthor = document.getElementById('cshelfBookAuthor');
  const tPublisher = document.getElementById('cshelfBookPublisher');
  const tISBN = document.getElementById('cshelfBookISBN');
  const tDesc = document.getElementById('cshelfBookDesc');
  const tCover = document.getElementById('cshelfBookCover');
  const tStatusBadge = document.getElementById('cshelfBookStatusBadge');
  const markSoldBtn = document.getElementById('markSoldBtn');
  const removeBookBtn = document.getElementById('removeBookBtn');

  let currentBookId = null;

  // 根據書籍狀態更新按鈕狀態
  function updateButtonStates(status) {
    // 重置按鈕狀態
    markSoldBtn.disabled = false;
    removeBookBtn.disabled = false;
    markSoldBtn.classList.remove('btn-disabled');
    removeBookBtn.classList.remove('btn-disabled');
    markSoldBtn.textContent = '標記已售出';
    removeBookBtn.textContent = '下架書籍';
    
    if (status === '在售') {
      // 在售：兩個按鈕都可用
      // 保持預設狀態即可
    } else if (status === '已售出') {
      // 已售出：只能下架，不能再標記售出
      markSoldBtn.disabled = true;
      markSoldBtn.classList.add('btn-disabled');
      markSoldBtn.textContent = '已售出';
      // removeBookBtn 保持可用
    } else if (status === '已下架') {
      // 已下架：什麼都不能做（終結狀態）
      markSoldBtn.disabled = true;
      markSoldBtn.classList.add('btn-disabled');
      markSoldBtn.textContent = '已下架';
      removeBookBtn.disabled = true;
      removeBookBtn.classList.add('btn-disabled');
      removeBookBtn.textContent = '已下架';
    }
  }

  document.querySelectorAll('.cshelf__book').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const status = btn.dataset.status || '未知';
      currentBookId = btn.dataset.id || null;
      
      tTitle.textContent = btn.dataset.title || '';
      tStatus.textContent = status;
      tStatusBadge.textContent = status;
      
      // 設置狀態樣式
      tStatus.className = 'book-status-text';
      tStatusBadge.className = 'book-status-badge-large';
      
      if (status === '在售') {
        tStatus.classList.add('status-available');
        tStatusBadge.style.background = '#4CAF50';
      } else if (status === '已售出') {
        tStatus.classList.add('status-sold');
        tStatusBadge.style.background = '#FF5722';
      } else if (status === '已下架') {
        tStatus.classList.add('status-offline');
        tStatusBadge.style.background = '#9E9E9E';
      } else {
        tStatus.classList.add('status-unknown');
        tStatusBadge.style.background = '#FFC107';
      }
      
      // 根據狀態調整按鈕顯示和可用性
      updateButtonStates(status);
      
      tAuthor.textContent = btn.dataset.author || '—';
      tPublisher.textContent = btn.dataset.publisher || '—';
      tISBN.textContent = btn.dataset.isbn || '—';
      tDesc.textContent = btn.dataset.desc || '';
      
      // 設置書籍封面
      const cover = btn.dataset.cover || '';
      if (cover) {
        tCover.src = cover;
        tCover.style.display = 'block';
      } else {
        tCover.src = '/static/image/default-book.png'; // 預設圖片
        tCover.style.display = 'block';
      }
      
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden','false');
    });
  });

  // 標記已售出按鈕
  markSoldBtn.addEventListener('click', function(e) {
    e.preventDefault();
    
    if (!currentBookId || markSoldBtn.disabled) return;
    
    if (confirm('確定要標記這本書籍為已售出嗎？')) {
      console.log('開始標記已售出，書籍ID:', currentBookId);
      
      fetch(`/book/${currentBookId}/mark-sold/`, {
        method: 'POST',
        headers: {
          'X-CSRFToken': getCookie('csrftoken'),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      })
      .then(response => {
        console.log('收到響應，狀態:', response.status);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('響應數據:', data);
        if (data.success) {
          alert('書籍已標記為已售出！');
          location.reload(); // 重新載入頁面以更新狀態
        } else {
          console.error('標記失敗:', data);
          alert('標記失敗：' + (data.message || '未知錯誤'));
        }
      })
      .catch(error => {
        console.error('請求錯誤:', error);
        alert('標記失敗，請稍後再試。錯誤：' + error.message);
      });
    }
  });

  // 下架書籍按鈕
  removeBookBtn.addEventListener('click', function(e) {
    e.preventDefault();
    
    if (!currentBookId || removeBookBtn.disabled) return;
    
    if (confirm('確定要下架這本書籍嗎？下架後其他用戶將無法看到此書籍。')) {
      console.log('開始下架書籍，ID:', currentBookId);
      
      fetch(`/book/${currentBookId}/remove/`, {
        method: 'POST',
        headers: {
          'X-CSRFToken': getCookie('csrftoken'),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      })
      .then(response => {
        console.log('收到響應，狀態:', response.status);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('響應數據:', data);
        if (data.success) {
          alert('書籍已成功下架！');
          location.reload(); // 重新載入頁面以更新狀態
        } else {
          console.error('下架失敗:', data);
          alert('下架失敗：' + (data.message || '未知錯誤'));
          if (data.error_details) {
            console.error('錯誤詳情:', data.error_details);
          }
        }
      })
      .catch(error => {
        console.error('請求錯誤:', error);
        alert('下架失敗，請稍後再試。錯誤：' + error.message);
      });
    }
  });

  const close = ()=>{
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden','true');
    currentBookId = null;
  };
  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', (e)=>{ if (e.target === modal) close(); });
})();

// ===== Tickets flip & gentle float =====
(function(){
  const tickets = document.querySelectorAll('.ticket');
  tickets.forEach((el, idx)=>{
    const inner = el.querySelector('.cticket__inner');

    // 點擊 -> 翻面
    el.addEventListener('click', ()=>{
      el.classList.toggle('flipped');
    });

    // 設定初始角度（基礎角度 + 隨機）
    const base = (parseFloat(el.dataset.baseDeg || '0') || 0) + (Math.random() * 8 - 4); // -4~+4度
    el.style.setProperty('--tilt', `${base.toFixed(2)}deg`);

    // 每隔幾秒微微晃動（隨機 ±1 度）
    setInterval(()=>{
      const random = (Math.random() - 0.5) * 2; // -1~+1 度
      const next = (base + random).toFixed(2);
      el.style.setProperty('--tilt', `${next}deg`);
    }, 3000 + idx*400);
  });
})();


// ===== Tickets: height auto, flip kept, random tilt kept =====
(function(){
  const container = document.querySelector('.cshelf__tickets');
  if (!container) return;

  const tickets = Array.from(container.querySelectorAll('.cticket'));

  // 隨機輕微傾斜（保留你的翻頁互動）
  tickets.forEach((el, idx) => {
    const inner = el.querySelector('.cticket__inner') || el;

    // 點擊翻面
    el.addEventListener('click', () => {
      el.classList.toggle('is-flipped');
      // 翻面後重新計算高度（避免 back 面較高）
      requestAnimationFrame(updateTicketsHeight);
    });

    // 初始隨機角度 + 微浮動
    const base = (parseFloat(el.dataset.baseDeg || '0') || 0) + (Math.random()*8 - 4); // -4~+4 度
    inner.style.setProperty('--tilt', base.toFixed(2) + 'deg');

    setInterval(()=>{
      const random = (Math.random() - 0.5) * 2; // -1~+1 度
      inner.style.setProperty('--tilt', (base + random).toFixed(2) + 'deg');
    }, 3000 + idx*400);
  });

  // 量測所有票券「變形後」實際底部，寫入 --tickets-h
  function updateTicketsHeight(){
    const contTop = container.getBoundingClientRect().top;
    let maxBottom = 0;

    tickets.forEach(el => {
      const target = el.querySelector('.cticket__inner') || el;
      const rect = target.getBoundingClientRect(); // 含 transform 後尺寸
      const bottom = rect.bottom - contTop;
      if (bottom > maxBottom) maxBottom = bottom;
    });

    // 預留一點 padding
    const pad = 12;
    container.style.setProperty('--tickets-h', Math.ceil(maxBottom + pad) + 'px');
  }

  // 初始 / 視窗改變尺寸時重算（加上 rAF 去抖）
  let rafId = null;
  function schedule(){
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(updateTicketsHeight);
  }
  window.addEventListener('resize', schedule);

  // 等圖片/字體/FA 圖示載入後再量一次，避免初算過低
  window.addEventListener('load', schedule);

  // 初次執行
  schedule();
})();

// ===== 小三角旗 modal 開啟（全頁） =====
(function(){
  let modal = document.getElementById('cflagModal');
  if (!modal) return;

  // 確保 modal 在 body 直層（避免被祖先 overflow/transform 影響）
  if (modal.parentElement !== document.body) {
    document.body.appendChild(modal);
  }

  const closeBtn = document.getElementById('cflagCloseBtn');
  const elTitle = document.getElementById('cflagTitle');
  const elWhen  = document.getElementById('cflagWhen');
  const elWhere = document.getElementById('cflagWhere');
  const elPeople= document.getElementById('cflagPeople');
  const elDesc  = document.getElementById('cflagDesc');

  const open = () => { modal.classList.add('is-open'); modal.setAttribute('aria-hidden','false'); };
  const close = () => { modal.classList.remove('is-open'); modal.setAttribute('aria-hidden','true'); };

  document.querySelectorAll('.gflag').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const title = btn.dataset.title || '活動';
      const weekday = btn.dataset.weekday || '';
      const date = btn.dataset.date || '';
      const time = btn.dataset.time || '';
      const location = btn.dataset.location || '—';
      const total = btn.dataset.total || '0';
      const max = btn.dataset.max || '0';
      const desc = btn.dataset.desc || '';

      elTitle.textContent = title;
      elWhen.textContent  = `${weekday} ${date} 日 ${time}`;
      elWhere.textContent = location;
      elPeople.textContent= `${total}/${max} 人`;
      elDesc.textContent  = desc;

      open();
    });
  });

  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', (e)=>{ if (e.target === modal) close(); });
})();

// ===== Activities Show More =====
(function(){
  const maxVisibleActivities = 5; // 最多顯示5個活動
  const container = document.getElementById('activitiesContainer');
  const showMoreBtn = document.getElementById('activitiesShowMore');
  const showMoreText = document.getElementById('showMoreText');
  const showMoreIcon = document.getElementById('showMoreIcon');
  
  if (!container) return;
  
  const activities = container.querySelectorAll('.activity-item');
  let isExpanded = false;
  
  function initializeActivities() {
    if (activities.length <= maxVisibleActivities) {
      // 如果活動數量不超過限制，不顯示"顯示更多"按鈕
      return;
    }
    
    // 隱藏超過限制的活動
    activities.forEach((activity, index) => {
      if (index >= maxVisibleActivities) {
        activity.style.display = 'none';
      }
    });
    
    // 顯示"顯示更多"按鈕
    if (showMoreBtn) {
      showMoreBtn.style.display = 'block';
    }
  }
  
  window.toggleActivities = function() {
    isExpanded = !isExpanded;
    
    activities.forEach((activity, index) => {
      if (index >= maxVisibleActivities) {
        activity.style.display = isExpanded ? 'flex' : 'none';
      }
    });
    
    // 更新按鈕文字和圖標
    if (showMoreText && showMoreIcon) {
      showMoreText.textContent = isExpanded ? '顯示較少活動' : '顯示更多活動';
      showMoreIcon.className = isExpanded ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
    }
    
    // 更新按鈕樣式
    const btn = document.querySelector('.show-more-btn');
    if (btn) {
      if (isExpanded) {
        btn.classList.add('expanded');
      } else {
        btn.classList.remove('expanded');
      }
    }
  };
  
  // 初始化
  initializeActivities();
})();