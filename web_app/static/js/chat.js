// 當前活動的聊天 ID
let currentChatId = null;

// 模擬的聊天歷史數據
let chatHistory = [
    { id: 1, title: "關於人工智能的討論", messages: [
        { sender: "bot", content: "您好！我是您的AI助手。我可以幫助回答問題、提供信息或進行交流。有什麼我能幫您的嗎？" },
        { sender: "user", content: "什麼是人工智能？" },
        { sender: "bot", content: "人工智能是指由人創造的、模擬人類智能的系統，能夠執行通常需要人類智能的任務，如視覺感知、語音識別、決策和語言翻譯等。" }
    ]},
    { id: 2, title: "網站開發問題", messages: [
        { sender: "bot", content: "您好！我是您的AI助手。我可以幫助回答問題、提供信息或進行交流。有什麼我能幫您的嗎？" },
        { sender: "user", content: "如何建立一個響應式網站？" },
        { sender: "bot", content: "建立響應式網站可以使用 HTML, CSS 和 JavaScript。CSS 框架如 Bootstrap 或 Tailwind 也很有幫助。關鍵是使用媒體查詢和靈活的網格系統。" }
    ]},
    { id: 3, title: "旅遊建議", messages: [
        { sender: "bot", content: "您好！我是您的AI助手。我可以幫助回答問題、提供信息或進行交流。有什麼我能幫您的嗎？" },
        { sender: "user", content: "台灣有哪些值得去的地方？" },
        { sender: "bot", content: "台灣有許多令人驚嘆的景點！你可以考慮參觀台北101、日月潭、阿里山、花蓮太魯閣峽谷和墾丁國家公園等。" }
    ]}
];

// DOM 元素
const sidebar = document.getElementById('sidebar');
const menuBtn = document.getElementById('menuBtn');
const menuBtnContainer = document.getElementById('menuBtnContainer');
const mainContent = document.getElementById('mainContent');
const currentChatTitle = document.getElementById('currentChatTitle');
const newChatBtn = document.getElementById('newChatBtn');
const chatHistoryEl = document.getElementById('chatHistory');
const chatContainer = document.getElementById('chatContainer');
const noMessagesEl = document.getElementById('noMessages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');

// 切換側邊欄
let sidebarOpen = true;
menuBtn.addEventListener('click', () => {
    if (sidebarOpen) {
        // 關閉側邊欄
        sidebar.classList.add('collapsed');
        menuBtn.classList.remove('open');
        document.body.classList.add('sidebar-collapsed');
        sidebarOpen = false;
    } else {
        // 打開側邊欄
        sidebar.classList.remove('collapsed');
        menuBtn.classList.add('open');
        document.body.classList.remove('sidebar-collapsed');
        sidebarOpen = true;
    }
});

// 載入聊天歷史
function loadChatHistory() {
    chatHistoryEl.innerHTML = '';
    chatHistory.forEach(chat => {
        const chatItem = document.createElement('div');
        chatItem.className = 'chat-item';
        chatItem.innerHTML = `
            <div class="chat-title">${chat.title}</div>
            <div class="chat-actions">
                <button class="action-btn download-btn" data-id="${chat.id}">
                    <i class="icon">⤓</i>
                    <span class="tooltip">下載對話</span>
                </button>
                <button class="action-btn delete-btn" data-id="${chat.id}">
                    <i class="icon">✕</i>
                    <span class="tooltip">刪除對話</span>
                </button>
            </div>
        `;
        chatItem.addEventListener('click', (e) => {
            // 如果點擊的是操作按鈕，不要切換對話
            if (!e.target.closest('.action-btn')) {
                loadChat(chat.id);
            }
        });
        chatHistoryEl.appendChild(chatItem);
    });

    // 為下載和刪除按鈕添加事件
    document.querySelectorAll('.download-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            downloadChat(parseInt(btn.getAttribute('data-id')));
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteChat(parseInt(btn.getAttribute('data-id')));
        });
    });
}

// 載入特定聊天
function loadChat(chatId) {
    const chat = chatHistory.find(c => c.id === chatId);
    if (!chat) return;

    currentChatId = chatId;
    currentChatTitle.innerText = chat.title;
    chatContainer.innerHTML = '';
    noMessagesEl.style.display = 'none';

    // 如果聊天沒有消息，添加AI自我介紹
    if (chat.messages.length === 0) {
        addMessageToChat(chatId, 'bot', getAIIntroduction());
    } else {
        chat.messages.forEach(message => {
            addMessageToUI(message.sender, message.content);
        });
    }

    // 滾動到最新消息
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    // 在移動設備上，載入聊天後自動關閉側邊欄
    if (window.innerWidth <= 768) {
        sidebar.classList.add('collapsed');
        menuBtn.classList.remove('open');
        document.body.classList.add('sidebar-collapsed');
        sidebarOpen = false;
    }
}

// 獲取AI自我介紹消息
function getAIIntroduction() {
    return "您好！我是您的AI助手。我可以幫助回答問題、提供信息或進行交流。有什麼我能幫您的嗎？";
}

// 新增對話
newChatBtn.addEventListener('click', () => {
    const newChatId = Date.now();
    const newChat = {
        id: newChatId,
        title: "新對話",
        messages: []
    };
    chatHistory.unshift(newChat);
    loadChatHistory();
    loadChat(newChatId);
    // 注意：loadChat 函數會自動添加 AI 自我介紹，所以這裡不需要再次添加
});

// 發送消息
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

function sendMessage() {
    const content = messageInput.value.trim();
    if (!content) return;

    if (!currentChatId) {
        // 如果沒有活動的聊天，創建一個新的
        newChatBtn.click();
    }

    // 添加用戶消息
    addMessageToChat(currentChatId, 'user', content);
    messageInput.value = '';
    
    // 模擬機器人回覆
    setTimeout(() => {
        const botReply = "這是一個自動回覆。在實際應用中，您需要連接到後端服務或 API 來處理真實的對話。";
        addMessageToChat(currentChatId, 'bot', botReply);
    }, 500);

    // 調整輸入框高度
    adjustTextareaHeight();
}

// 向聊天添加消息
function addMessageToChat(chatId, sender, content) {
    const chat = chatHistory.find(c => c.id === chatId);
    if (!chat) return;

    chat.messages.push({ sender, content });
    
    // 如果是第一條消息，更新聊天標題
    if (chat.messages.length === 1 && sender === 'user') {
        chat.title = content.length > 25 ? content.substring(0, 25) + '...' : content;
        currentChatTitle.innerText = chat.title;
        loadChatHistory();
    } 
    // 如果是第二條消息（用戶第一條消息），更新聊天標題
    else if (chat.messages.length === 2 && sender === 'user') {
        chat.title = content.length > 25 ? content.substring(0, 25) + '...' : content;
        currentChatTitle.innerText = chat.title;
        loadChatHistory();
    }

    addMessageToUI(sender, content);

    // 滾動到最新消息
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// 向 UI 添加消息
function addMessageToUI(sender, content) {
    const messageContainer = document.createElement('div');
    messageContainer.className = `message-container ${sender}-container`;
    
    const avatar = document.createElement('div');
    avatar.className = `avatar ${sender}-avatar`;
    avatar.innerText = sender === 'user' ? '你' : 'AI';
    
    const messageContent = document.createElement('div');
    messageContent.className = `message-content ${sender}-content`;
    messageContent.innerText = content;
    
    if (sender === 'user') {
        messageContainer.appendChild(messageContent);
        messageContainer.appendChild(avatar);
    } else {
        messageContainer.appendChild(avatar);
        messageContainer.appendChild(messageContent);
    }
    
    chatContainer.appendChild(messageContainer);
}

// 下載聊天
function downloadChat(chatId) {
    const chat = chatHistory.find(c => c.id === chatId);
    if (!chat) return;

    let content = `# ${chat.title}\n\n`;
    chat.messages.forEach(msg => {
        const sender = msg.sender === 'user' ? '你' : 'AI';
        content += `**${sender}**: ${msg.content}\n\n`;
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${chat.title}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 刪除聊天
function deleteChat(chatId) {
    if (confirm('確定要刪除此對話嗎？')) {
        chatHistory = chatHistory.filter(chat => chat.id !== chatId);
        loadChatHistory();
        
        if (currentChatId === chatId) {
            // 如果刪除的是當前活動的聊天，清空聊天窗口
            currentChatId = null;
            chatContainer.innerHTML = '';
            noMessagesEl.style.display = 'block';
            currentChatTitle.innerText = '對話';
        }
    }
}

// 自適應文本輸入框高度
messageInput.addEventListener('input', adjustTextareaHeight);

function adjustTextareaHeight() {
    messageInput.style.height = 'auto';
    messageInput.style.height = (messageInput.scrollHeight) + 'px';
}

// 初始化
loadChatHistory();

// 檢查窗口大小，決定初始側邊欄狀態
if (window.innerWidth <= 768) {
    sidebar.classList.add('collapsed');
    menuBtn.classList.remove('open');
    document.body.classList.add('sidebar-collapsed');
    sidebarOpen = false;
} else {
    // 在大屏幕上默認打開側邊欄並顯示叉叉
    menuBtn.classList.add('open');
}

// 設定窗口調整大小時的行為
window.addEventListener('resize', () => {
    if (window.innerWidth <= 768 && !sidebar.classList.contains('collapsed')) {
        sidebar.classList.add('collapsed');
        menuBtn.classList.remove('open');
        document.body.classList.add('sidebar-collapsed');
        sidebarOpen = false;
    }
});