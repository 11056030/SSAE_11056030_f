// 日期相關函數
function getCurrentMonthYear() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    return `${year}年${month}月`;
}

function updateCurrentMonth() {
    document.getElementById('currentMonth').textContent = getCurrentMonthYear();
}

// 月份導航按鈕
document.getElementById('prevMonth').addEventListener('click', () => {
    // 在實際應用中，這裡會更新日曆顯示上個月
    alert('切換到上個月');
});

document.getElementById('nextMonth').addEventListener('click', () => {
    // 在實際應用中，這裡會更新日曆顯示下個月
    alert('切換到下個月');
});

// 待辦事項相關函數
document.getElementById('addTask').addEventListener('click', addNewTask);

function addNewTask() {
    const newTaskInput = document.getElementById('newTask');
    const taskText = newTaskInput.value.trim();
    
    if (taskText === '') return;
    
    const todoList = document.querySelector('.todo-list');
    const taskId = 'task' + (todoList.children.length + 1);
    
    const li = document.createElement('li');
    li.className = 'todo-item';
    
    li.innerHTML = `
        <input type="checkbox" id="${taskId}">
        <label for="${taskId}">${taskText}</label>
        <span class="todo-status">今天</span>
    `;
    
    todoList.appendChild(li);
    newTaskInput.value = '';
    
    // 添加任務完成事件監聽
    const checkbox = li.querySelector('input[type="checkbox"]');
    checkbox.addEventListener('change', function() {
        if (this.checked) {
            li.classList.add('completed');
        } else {
            li.classList.remove('completed');
        }
    });
}

// 任務完成狀態處理
document.querySelectorAll('.todo-list input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', function() {
        const listItem = this.closest('.todo-item');
        if (this.checked) {
            listItem.classList.add('completed');
        } else {
            listItem.classList.remove('completed');
        }
    });
});

// 初始化頁面
document.addEventListener('DOMContentLoaded', () => {
    updateCurrentMonth();
});
