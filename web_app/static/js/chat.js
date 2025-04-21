// 當前對話ID
let currentId = null;
let conversations = [];
let nextSeq = 1;

// DOM元素
const sidebar = document.getElementById('sidebar');
const menuBtn = document.getElementById('menuBtn');
const mainContent = document.getElementById('mainContent');
const currentChatTitle = document.getElementById('currentChatTitle');
const newChatBtn = document.getElementById('newChatBtn');
const chatHistoryEl = document.getElementById('chatHistory');
const chatContainer = document.getElementById('chatContainer');
const noMessagesEl = document.getElementById('noMessages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');

// 側邊欄切換
let sidebarOpen = true;
menuBtn.addEventListener('click', () => {
    sidebarOpen = !sidebarOpen;
    if (sidebarOpen) {
        sidebar.classList.remove('collapsed');
        menuBtn.classList.add('open');
        document.body.classList.remove('sidebar-collapsed');
    } else {
        sidebar.classList.add('collapsed');
        menuBtn.classList.remove('open');
        document.body.classList.add('sidebar-collapsed');
    }
});

// 從API載入對話列表
async function loadConvos() {
    try {
        const res = await fetch('/api/conversations/');
        conversations = (await res.json()).conversations;
        nextSeq = conversations.length + 1;
        renderConvos();
    } catch (error) {
        console.error('載入對話失敗:', error);
    }
}

// 渲染對話列表
function renderConvos() {
    chatHistoryEl.innerHTML = '';
    conversations.forEach(c => {
        const chatItem = document.createElement('div');
        chatItem.className = 'chat-item';
        if (c.id === currentId) chatItem.classList.add('active');
        
        chatItem.innerHTML = `
            <div class="chat-title">${c.title}</div>
            <div class="chat-actions">
                <button class="action-btn download-btn" data-id="${c.id}">
                    <i class="fa-solid fa-download"></i>
                    <span class="tooltip">匯出對話</span>
                </button>
                <button class="action-btn delete-btn" data-id="${c.id}">
                    <i class="fa-solid fa-trash"></i>
                    <span class="tooltip">刪除對話</span>
                </button>
            </div>
        `;

        chatItem.addEventListener('click', (e) => {
            // 如果點擊的是操作按鈕，不要切換對話
            if (!e.target.closest('.action-btn')) {
                selectConvo(c.id);
            }
        });
        
        chatHistoryEl.appendChild(chatItem);
    });

    // 綁定匯出按鈕事件
    document.querySelectorAll('.download-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            window.location.assign(`/api/conversations/${id}/export_excel/`);
        });
    });

    // 綁定刪除按鈕事件
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            if (!confirm('確定刪除此對話？')) return;
            
            try {
                await fetch(`/api/conversations/${id}/`, { method: 'DELETE' });
                conversations = conversations.filter(x => x.id !== id);
                if (currentId === id) {
                    currentId = null;
                    chatContainer.innerHTML = '';
                    noMessagesEl.style.display = 'block';
                    currentChatTitle.innerText = '對話';
                }
                renderConvos();
            } catch (error) {
                console.error('刪除對話失敗:', error);
            }
        });
    });
}

// 選擇對話
async function selectConvo(id) {
    try {
        currentId = id;
        document.querySelectorAll(".chat-item").forEach(item => item.classList.remove("active"));
        document.querySelector(`.chat-item:has([data-id="${id}"])`)?.classList.add("active");
        
        const res = await fetch(`/api/conversations/${id}/messages/`);
        const data = await res.json();
        renderMessages(data.messages);
        
        // 更新標題
        const convo = conversations.find(c => c.id === id);
        if (convo) {
            currentChatTitle.innerText = convo.title;
        }
        
        // 手機版自動關閉側邊欄
        if (window.innerWidth <= 768) {
            sidebar.classList.add('collapsed');
            menuBtn.classList.remove('open');
            document.body.classList.add('sidebar-collapsed');
            sidebarOpen = false;
        }
    } catch (error) {
        console.error('載入對話內容失敗:', error);
    }
}

// 渲染對話訊息
function renderMessages(messages) {
    chatContainer.innerHTML = '';
    noMessagesEl.style.display = messages.length ? 'none' : 'block';
    
    messages.forEach(msg => {
        // 用戶訊息
        const userMsg = document.createElement('div');
        userMsg.className = 'message-container user-container';
        userMsg.innerHTML = `
            <div class="message-content user-content">${msg.question}</div>
            <div class="avatar user-avatar">你</div>
        `;
        chatContainer.appendChild(userMsg);
        
        // 機器人訊息
        const botMsg = document.createElement('div');
        botMsg.className = 'message-container bot-container';
        botMsg.innerHTML = `
            <div class="avatar bot-avatar">AI</div>
            <div class="message-content bot-content">${msg.answer}</div>
        `;
        chatContainer.appendChild(botMsg);
    });
    
    // 滾動到最新訊息
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// 建立新對話
newChatBtn.addEventListener('click', async () => {
    try {
        const title = `新對話${nextSeq++}`;
        const res = await fetch("/api/conversations/", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({title})
        });
        
        const newConvo = await res.json();
        currentId = newConvo.id;
        await loadConvos();
        selectConvo(newConvo.id);
    } catch (error) {
        console.error('建立新對話失敗:', error);
    }
});

// 發送訊息
async function sendQuestion() {
    const questionEl = document.getElementById('messageInput');
    const question = questionEl.value.trim();
    
    if (!question || !currentId) return;
    
    // 清空輸入框並調整高度
    questionEl.value = '';
    adjustTextareaHeight();
    
    try {
        // 在聊天區域加入用戶訊息
        const userMsg = document.createElement('div');
        userMsg.className = 'message-container user-container';
        userMsg.innerHTML = `
            <div class="message-content user-content">${question}</div>
            <div class="avatar user-avatar">你</div>
        `;
        chatContainer.appendChild(userMsg);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        
        // 發送到後端
        const res = await fetch("/api/ask/", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({conversation_id: currentId, question: question})
        });
        
        const data = await res.json();
        
        // 在聊天區域加入機器人回覆
        const botMsg = document.createElement('div');
        botMsg.className = 'message-container bot-container';
        botMsg.innerHTML = `
            <div class="avatar bot-avatar">AI</div>
            <div class="message-content bot-content">${data.answer || data.error}</div>
        `;
        chatContainer.appendChild(botMsg);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        
        // 更新對話標題（如果是第一條訊息）
        const convo = conversations.find(c => c.id === currentId);
        if (convo && (!convo.title || convo.title.startsWith('新對話'))) {
            const title = question.length > 25 ? question.substring(0, 25) + '...' : question;
            await fetch(`/api/conversations/${currentId}/`, {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({title: title})
            });
            currentChatTitle.innerText = title;
            await loadConvos();
        }
    } catch (error) {
        console.error('發送問題失敗:', error);
    }
}

// 發送按鈕點擊事件
sendBtn.addEventListener('click', sendQuestion);

// Enter鍵發送(Shift+Enter換行)
messageInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendQuestion();
    }
});

// 自適應文本輸入框高度
function adjustTextareaHeight() {
    messageInput.style.height = 'auto';
    messageInput.style.height = (messageInput.scrollHeight) + 'px';
}

messageInput.addEventListener('input', adjustTextareaHeight);

// 初始化
(async () => {
    await loadConvos();
    
    // 初始對話選擇
    if (conversations.length) {
        selectConvo(conversations[0].id);
    } else {
        newChatBtn.click();
    }
    
    // 檢查窗口大小，決定初始側邊欄狀態
    if (window.innerWidth <= 768) {
        sidebar.classList.add('collapsed');
        menuBtn.classList.remove('open');
        document.body.classList.add('sidebar-collapsed');
        sidebarOpen = false;
    } else {
        menuBtn.classList.add('open');
    }
})();

// 窗口大小調整時的行為
window.addEventListener('resize', () => {
    if (window.innerWidth <= 768 && !sidebar.classList.contains('collapsed')) {
        sidebar.classList.add('collapsed');
        menuBtn.classList.remove('open');
        document.body.classList.add('sidebar-collapsed');
        sidebarOpen = false;
    }
});