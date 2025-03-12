// 頁面載入完成後執行
document.addEventListener('DOMContentLoaded', function() {
    // 創建漂浮物品
    createFloatingItems();
    
    // 聊天功能相關元素
    const sendBtn = document.querySelector('.send-btn');
    const input = document.querySelector('.chat-input');
    const sidebar = document.getElementById('sidebar');
    const sidebarClose = document.getElementById('sidebar-close');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const uploadPdfBtn = document.querySelector('.upload-pdf-btn');
    const pdfUploadInput = document.getElementById('pdf-upload');
    const newChatBtn = document.getElementById('new-chat-btn');
    const messagesContainer = document.querySelector('.messages-container');
    const chatTabs = document.querySelectorAll('.chat-tab');
    const chatRecordsList = document.getElementById('chat-records-list');
    const uploadedFilesList = document.getElementById('uploaded-files-list');
    
    // 確保所有元素都存在於DOM中
    if (!sidebar || !sidebarClose || !sidebarToggle) {
        console.error('側邊欄元素不存在');
        return;
    }
    
    if (!uploadPdfBtn || !pdfUploadInput) {
        console.error('PDF上傳元素不存在');
        return;
    }
    
    if (!newChatBtn) {
        console.error('新對話按鈕不存在');
        return;
    }
    
    // 創建漂浮物品
    function createFloatingItems() {
        const container = document.createElement('div');
        container.id = 'floating-items-container';
        container.style.position = 'fixed';
        container.style.top = '0';
        container.style.left = '0';
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.pointerEvents = 'none';
        container.style.zIndex = '-1';
        document.body.appendChild(container);
        
        const shapes = ['float-circle', 'float-square', 'float-triangle'];
        
        for (let i = 0; i < 15; i++) {
            const item = document.createElement('div');
            const shape = shapes[Math.floor(Math.random() * shapes.length)];
            
            item.className = `floating-item ${shape}`;
            item.style.left = `${Math.random() * 100}vw`;
            item.style.top = `${Math.random() * 100}vh`;
            item.style.opacity = `${Math.random() * 0.15 + 0.05}`;
            item.style.transform = `scale(${Math.random() * 0.6 + 0.4}) rotate(${Math.random() * 360}deg)`;
            
            // 隨機動畫
            const duration = Math.random() * 50 + 30;
            const direction = Math.random() > 0.5 ? 1 : -1;
            
            item.style.animation = `floatAnimation${i} ${duration}s linear infinite`;
            
            // 創建隨機漂浮動畫
            const keyframes = `
                @keyframes floatAnimation${i} {
                    0% {
                        transform: translate(0, 0) scale(${Math.random() * 0.6 + 0.4}) rotate(0deg);
                    }
                    25% {
                        transform: translate(${Math.random() * 50 * direction}px, ${Math.random() * 50}px) scale(${Math.random() * 0.6 + 0.4}) rotate(${Math.random() * 180}deg);
                    }
                    50% {
                        transform: translate(${Math.random() * 100 * direction}px, ${Math.random() * 100}px) scale(${Math.random() * 0.6 + 0.4}) rotate(${Math.random() * 360}deg);
                    }
                    75% {
                        transform: translate(${Math.random() * 50 * direction}px, ${Math.random() * 50}px) scale(${Math.random() * 0.6 + 0.4}) rotate(${Math.random() * 540}deg);
                    }
                    100% {
                        transform: translate(0, 0) scale(${Math.random() * 0.6 + 0.4}) rotate(720deg);
                    }
                }
            `;
            
            const styleElement = document.createElement('style');
            styleElement.innerHTML = keyframes;
            document.head.appendChild(styleElement);
            
            container.appendChild(item);
        }
    }
    
    // 完全靜默的localStorage包裝器
    const safeStorage = {
        setItem: function(key, value) {
            try {
                localStorage.setItem(key, value);
            } catch (e) {
                // 靜默失敗 - 不顯示任何消息
            }
        },
        getItem: function(key) {
            try {
                return localStorage.getItem(key);
            } catch (e) {
                // 靜默失敗 - 不顯示任何消息
                return null;
            }
        }
    };

    // 模擬打字效果
    function simulateTyping(element, text, speed) {
        return new Promise(resolve => {
            let i = 0;
            element.textContent = '';
            
            const typingIndicator = document.createElement('div');
            typingIndicator.className = 'typing-indicator';
            typingIndicator.innerHTML = '<span></span><span></span><span></span>';
            element.parentNode.insertBefore(typingIndicator, element.nextSibling);
            
            const interval = setInterval(() => {
                if (i < text.length) {
                    element.textContent += text.charAt(i);
                    i++;
                } else {
                    clearInterval(interval);
                    typingIndicator.remove();
                    resolve();
                }
            }, speed);
        });
    }
    
    // 修復發送訊息功能
    if (sendBtn && input && messagesContainer) {
        sendBtn.addEventListener('click', function() {
            const message = input.value.trim();
            
            if (message) {
                // 用戶發送的訊息
                const userMessageElement = document.createElement('div');
                userMessageElement.className = 'message sent';
                userMessageElement.innerHTML = `<div class="message-bubble">${message}</div>`;
                userMessageElement.style.animationDelay = '0s';
                messagesContainer.appendChild(userMessageElement);
                
                // 清空輸入框
                input.value = '';
                
                // 滾動到底部
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
                
                // 模擬機器人回應
                setTimeout(() => {
                    const botMessageElement = document.createElement('div');
                    botMessageElement.className = 'message received';
                    
                    const botBubble = document.createElement('div');
                    botBubble.className = 'message-bubble';
                    botMessageElement.appendChild(botBubble);
                    
                    messagesContainer.appendChild(botMessageElement);
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    
                    // 根據用戶的訊息模擬不同的回應
                    let botResponse = "";
                    if (message.includes('你好') || message.includes('嗨') || message.includes('hi') || message.includes('hello')) {
                        botResponse = "您好！有什麼我可以幫助您的嗎？";
                    } else if (message.includes('謝謝') || message.includes('感謝')) {
                        botResponse = "不客氣！如果還有其他問題，隨時都可以問我。";
                    } else if (message.includes('校規') || message.includes('規定')) {
                        botResponse = "關於校規的問題，您可以點選上方的「校規查詢」選項，或者直接告訴我您想了解哪方面的規定。";
                    } else if (message.includes('問題') || message.includes('幫忙')) {
                        botResponse = "當然可以幫忙！請告訴我您遇到了什麼問題，我會盡力協助您。";
                    } else {
                        botResponse = "我已收到您的訊息。請問還有什麼我可以協助的嗎？";
                    }
                    
                    // 使用打字效果
                    simulateTyping(botBubble, botResponse, 30).then(() => {
                        // 完成打字效果後滾動到底部
                        messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    });
                }, 800);
            }
        });
        
        // 按Enter鍵發送消息
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendBtn.click();
            }
        });
    }
    
    // 修復側邊欄收起功能
    if (sidebarClose && sidebar && sidebarToggle) {
        // 點擊關閉按鈕收起側邊欄
        sidebarClose.addEventListener('click', function() {
            console.log('側邊欄關閉按鈕被點擊');
            sidebar.classList.add('collapsed');
            sidebarToggle.classList.add('visible');
            
            // 使用安全的localStorage
            safeStorage.setItem('sidebarCollapsed', 'true');
        });
        
        // 點擊切換按鈕展開側邊欄
        sidebarToggle.addEventListener('click', function() {
            console.log('側邊欄切換按鈕被點擊');
            sidebar.classList.remove('collapsed');
            sidebarToggle.classList.remove('visible');
            
            // 使用安全的localStorage
            safeStorage.setItem('sidebarCollapsed', 'false');
        });
        
        // 讀取儲存的狀態
        if (safeStorage.getItem('sidebarCollapsed') === 'true') {
            sidebar.classList.add('collapsed');
            sidebarToggle.classList.add('visible');
        }
    }
    
    // 修復標籤切換功能
    if (chatTabs && chatTabs.length > 0 && chatRecordsList && uploadedFilesList) {
        chatTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                console.log('標籤被點擊:', this.getAttribute('data-tab'));
                // 移除所有標籤的活躍狀態
                chatTabs.forEach(t => t.classList.remove('active'));
                // 將點擊的標籤設為活躍
                this.classList.add('active');
                
                // 顯示相應的內容
                const tabName = this.getAttribute('data-tab');
                if (tabName === 'chat-records') {
                    chatRecordsList.style.display = 'block';
                    uploadedFilesList.style.display = 'none';
                } else if (tabName === 'uploaded-files') {
                    chatRecordsList.style.display = 'none';
                    uploadedFilesList.style.display = 'block';
                }
            });
        });
    }
    
    // 修復新對話按鈕功能
    if (newChatBtn && messagesContainer && chatRecordsList) {
        newChatBtn.addEventListener('click', function() {
            console.log('新對話按鈕被點擊');
            // 清空訊息容器
            messagesContainer.innerHTML = '';
            
            // 添加歡迎訊息
            const welcomeMessage = document.createElement('div');
            welcomeMessage.className = 'message received';
            welcomeMessage.style.animationDelay = '0.3s';
            
            const welcomeBubble = document.createElement('div');
            welcomeBubble.className = 'message-bubble';
            welcomeMessage.appendChild(welcomeBubble);
            
            messagesContainer.appendChild(welcomeMessage);
            
            // 使用打字效果顯示歡迎訊息
            simulateTyping(welcomeBubble, "您好！歡迎開始新的對話。有什麼可以幫助您的嗎？", 30);
            
            // 切換到對話記錄標籤
            if (chatTabs && chatTabs.length > 0) {
                chatTabs.forEach(tab => tab.classList.remove('active'));
                chatTabs[0].classList.add('active');
                chatRecordsList.style.display = 'block';
                uploadedFilesList.style.display = 'none';
            }
            
            // 創建新的對話項目並添加到對話列表頂部
            const currentDate = new Date().toLocaleTimeString();
            const newChatItem = document.createElement('div');
            newChatItem.className = 'chat-item fade-in';
            newChatItem.innerHTML = `
                <div class="chat-item-title">新對話</div>
                <div class="chat-item-date">剛剛 - ${currentDate}</div>
            `;
            
            // 將新的對話項目插入到列表的最前面
            if (chatRecordsList.firstChild) {
                chatRecordsList.insertBefore(newChatItem, chatRecordsList.firstChild);
            } else {
                chatRecordsList.appendChild(newChatItem);
            }
            
            // 設置點擊事件來切換到這個對話
            newChatItem.addEventListener('click', function() {
                // 選擇這個對話項目
                document.querySelectorAll('.chat-item').forEach(item => {
                    item.classList.remove('selected');
                });
                this.classList.add('selected');
            });
            
            // 自動選擇新創建的對話
            newChatItem.classList.add('selected');
        });
    }
    
    // 修復PDF上傳功能
    if (uploadPdfBtn && pdfUploadInput && uploadedFilesList && messagesContainer) {
        uploadPdfBtn.addEventListener('click', function() {
            console.log('PDF上傳按鈕被點擊');
            pdfUploadInput.click();
        });
        
        pdfUploadInput.addEventListener('change', function(event) {
            console.log('PDF檔案被選擇');
            const file = event.target.files[0];
            if (file && file.type === 'application/pdf') {
                console.log('有效的PDF檔案:', file.name);
                // 創建一個新的檔案項目在已上傳文件列表中
                const fileName = file.name;
                const fileSize = (file.size / 1024).toFixed(1) + ' KB';
                const currentDate = new Date().toLocaleDateString();
                
                // 移除空檔案提示
                const emptyMessage = uploadedFilesList.querySelector('.empty-files-message');
                if (emptyMessage) {
                    emptyMessage.style.display = 'none';
                }
                
                // 創建新的檔案項目
                const fileItem = document.createElement('div');
                fileItem.className = 'file-item scale-in';
                fileItem.innerHTML = `
                    <div class="file-item-header">
                        <div class="file-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                <line x1="10" y1="9" x2="8" y2="9"></line>
                            </svg>
                        </div>
                        <div class="file-name">${fileName}</div>
                    </div>
                    <div class="file-info">
                        <span>${fileSize}</span>
                        <span>${currentDate}</span>
                    </div>
                `;
                uploadedFilesList.appendChild(fileItem);
                
                // 切換到已上傳文件標籤
                if (chatTabs && chatTabs.length > 0) {
                    chatTabs.forEach(tab => tab.classList.remove('active'));
                    chatTabs[1].classList.add('active');
                    chatRecordsList.style.display = 'none';
                    uploadedFilesList.style.display = 'block';
                }
                
                // 顯示上傳成功訊息
                const messageElement = document.createElement('div');
                messageElement.className = 'message received';
                
                const messageBubble = document.createElement('div');
                messageBubble.className = 'message-bubble';
                messageElement.appendChild(messageBubble);
                
                messagesContainer.appendChild(messageElement);
                
                // 使用打字效果顯示上傳成功訊息
                simulateTyping(messageBubble, `PDF檔案 "${fileName}" 已成功上傳。`, 30).then(() => {
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                });
                
                // 清空檔案選擇，允許再次選擇相同檔案
                pdfUploadInput.value = '';
            }
        });
        
        // 修復點擊檔案項目時的事件
        uploadedFilesList.addEventListener('click', function(event) {
            const fileItem = event.target.closest('.file-item');
            if (fileItem) {
                const fileName = fileItem.querySelector('.file-name').textContent;
                // 顯示檔案選擇訊息
                const messageElement = document.createElement('div');
                messageElement.className = 'message received';
                
                const messageBubble = document.createElement('div');
                messageBubble.className = 'message-bubble';
                messageElement.appendChild(messageBubble);
                
                messagesContainer.appendChild(messageElement);
                
                // 使用打字效果顯示檔案選擇訊息
                simulateTyping(messageBubble, `已選擇PDF檔案: "${fileName}"。正在處理...`, 30).then(() => {
                    // 模擬處理中動畫
                    setTimeout(() => {
                        const processElement = document.createElement('div');
                        processElement.className = 'message received';
                        
                        const processBubble = document.createElement('div');
                        processBubble.className = 'message-bubble';
                        processElement.appendChild(processBubble);
                        
                        messagesContainer.appendChild(processElement);
                        messagesContainer.scrollTop = messagesContainer.scrollHeight;
                        
                        simulateTyping(processBubble, `PDF檔案處理完成！您現在可以查詢檔案內容或提出相關問題。`, 30).then(() => {
                            messagesContainer.scrollTop = messagesContainer.scrollHeight;
                        });
                    }, 1500);
                    
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                });
            }
        });
    }
    
    // 為現有的對話項目添加點擊事件
    document.querySelectorAll('.chat-item').forEach(item => {
        item.addEventListener('click', function() {
            // 移除所有項目的選中狀態
            document.querySelectorAll('.chat-item').forEach(i => {
                i.classList.remove('selected');
            });
            
            // 將這個項目設為選中
            this.classList.add('selected');
            
            // 取得對話標題
            const chatTitle = this.querySelector('.chat-item-title').textContent;
            
            // 清空訊息容器並添加過渡效果
            messagesContainer.classList.add('fade-out');
            
            setTimeout(() => {
                messagesContainer.innerHTML = '';
                messagesContainer.classList.remove('fade-out');
                
                // 根據對話標題顯示不同的訊息
                const messageElement = document.createElement('div');
                messageElement.className = 'message received';
                
                const messageBubble = document.createElement('div');
                messageBubble.className = 'message-bubble';
                messageElement.appendChild(messageBubble);
                
                messagesContainer.appendChild(messageElement);
                
                let welcomeMessage = '';
                if (chatTitle === '新對話') {
                    welcomeMessage = '您好！歡迎開始新的對話。有什麼可以幫助您的嗎？';
                } else if (chatTitle === '技術討論') {
                    welcomeMessage = '歡迎回到技術討論。我們上次討論到哪裡了？';
                } else if (chatTitle === '問題解答') {
                    welcomeMessage = '歡迎回到問題解答。需要繼續解決上次的問題嗎？';
                } else if (chatTitle === '功能建議') {
                    welcomeMessage = '歡迎回到功能建議。您有更多的建議嗎？';
                } else if (chatTitle === '設計討論') {
                    welcomeMessage = '歡迎回到設計討論。我們繼續討論介面設計的問題吧。';
                }
                
                // 使用打字效果
                simulateTyping(messageBubble, welcomeMessage, 30);
            }, 300);
        });
    });
    
    // 焦點動畫
    if (input) {
        input.addEventListener('focus', function() {
            this.classList.add('focused');
        });
        
        input.addEventListener('blur', function() {
            this.classList.remove('focused');
        });
    }
    
    // 添加一些額外的互動動畫
    // 懸浮卡片效果
    document.addEventListener('mousemove', function(e) {
        const messageContainers = document.querySelectorAll('.message-bubble');
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        
        messageContainers.forEach(container => {
            const rect = container.getBoundingClientRect();
            const containerCenterX = rect.left + rect.width / 2;
            const containerCenterY = rect.top + rect.height / 2;
            
            const distanceX = mouseX - containerCenterX;
            const distanceY = mouseY - containerCenterY;
            
            // 只有當鼠標靠近時才應用效果
            const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
            if (distance < 300) {
                const strength = 5; // 傾斜效果的強度
                const maxTilt = 3; // 最大傾斜角度（度）
                
                // 計算傾斜角度（度）
                const tiltX = Math.min(maxTilt, (distanceY / 300) * strength);
                const tiltY = Math.min(maxTilt, -(distanceX / 300) * strength);
                
                // 應用傾斜效果
                container.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.02)`;
            } else {
                container.style.transform = '';
            }
        });
    });
    
    // 自動波紋效果
    function createRipple() {
        const ripple = document.createElement('div');
        ripple.style.position = 'fixed';
        ripple.style.width = '20px';
        ripple.style.height = '20px';
        ripple.style.borderRadius = '50%';
        ripple.style.backgroundColor = 'rgba(118, 118, 179, 0.3)';
        ripple.style.pointerEvents = 'none';
        ripple.style.transform = 'translate(-50%, -50%)';
        ripple.style.zIndex = '-1';
        
        // 隨機位置
        const x = Math.random() * window.innerWidth;
        const y = Math.random() * window.innerHeight;
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        
        // 動畫
        ripple.animate([
            { opacity: 0.7, width: '20px', height: '20px' },
            { opacity: 0, width: '200px', height: '200px' }
        ], {
            duration: 2000,
            easing: 'ease-out'
        });
        
        document.body.appendChild(ripple);
        
        // 動畫結束後移除
        setTimeout(() => {
            ripple.remove();
        }, 2000);
    }
    
    // 定期產生波紋
    setInterval(createRipple, 3000);
    
    // 添加調試日誌以檢查DOM加載
    console.log('DOM 加載完成，所有事件監聽器已設置完畢');
    console.log('側邊欄元素:', sidebar ? '存在' : '不存在');
    console.log('側邊欄關閉按鈕:', sidebarClose ? '存在' : '不存在');
    console.log('側邊欄切換按鈕:', sidebarToggle ? '存在' : '不存在');
    console.log('PDF上傳按鈕:', uploadPdfBtn ? '存在' : '不存在');
    console.log('PDF檔案輸入:', pdfUploadInput ? '存在' : '不存在');
    console.log('新對話按鈕:', newChatBtn ? '存在' : '不存在');
});