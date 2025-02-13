document.addEventListener('DOMContentLoaded', function() {
    // 篩選功能
    const filterDropdowns = document.querySelectorAll('.filter-dropdown');
    filterDropdowns.forEach(dropdown => {
        dropdown.addEventListener('change', function() {
            filterActivities();
        });
    });

    // 搜索功能
    const searchBox = document.querySelector('.search-box');
    searchBox.addEventListener('input', function() {
        filterActivities();
    });

    // 活動卡片點擊事件
    const activityCards = document.querySelectorAll('.activity-card');
    activityCards.forEach(card => {
        card.addEventListener('click', function(e) {
            // 如果點擊的不是"我要參加"按鈕，則導航到詳情頁
            if (!e.target.classList.contains('join-btn')) {
                const detailUrl = card.getAttribute('data-detail-url') || '#';
                window.location.href = detailUrl;
            }
        });
    });

    // 參加按鈕點擊事件
    const joinButtons = document.querySelectorAll('.join-btn');
    joinButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation(); // 防止事件冒泡到卡片
            const activityId = this.getAttribute('data-activity-id');
            joinActivity(activityId);
        });
    });

    // 篩選活動的函數
    function filterActivities() {
        const activityType = document.querySelector('.filter-dropdown:nth-child(1)').value;
        const location = document.querySelector('.filter-dropdown:nth-child(2)').value;
        const time = document.querySelector('.filter-dropdown:nth-child(3)').value;
        const searchTerm = searchBox.value.toLowerCase();

        activityCards.forEach(card => {
            const cardType = card.querySelector('.activity-tag').textContent;
            const cardLocation = card.querySelector('.activity-location span:last-child').textContent;
            const cardTime = card.querySelector('.activity-time span:last-child').textContent;
            const cardTitle = card.querySelector('.activity-title').textContent.toLowerCase();
            const cardDescription = card.querySelector('.activity-description').textContent.toLowerCase();

            let typeMatch = activityType === '全部活動類型' || cardType === activityType;
            let locationMatch = location === '全部地點' || 
                               (location === '校內' && cardLocation.includes('校')) ||
                               (location === '校外' && !cardLocation.includes('校'));
            let timeMatch = time === '全部時間' || matchTimeFilter(cardTime, time);
            let searchMatch = searchTerm === '' || 
                             cardTitle.includes(searchTerm) || 
                             cardDescription.includes(searchTerm);

            if (typeMatch && locationMatch && timeMatch && searchMatch) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }

    // 時間篩選匹配函數
    function matchTimeFilter(cardTime, filterTime) {
        const today = new Date();
        const cardDate = parseDate(cardTime);
        
        if (filterTime === '今天') {
            return isSameDay(cardDate, today);
        } else if (filterTime === '本週') {
            return isThisWeek(cardDate);
        } else if (filterTime === '本月') {
            return isThisMonth(cardDate);
        }
        return true;
    }

    // 解析日期字符串
    function parseDate(dateStr) {
        // 簡單解析，實際應用中可能需要更複雜的解析邏輯
        const match = dateStr.match(/(\d+)\/(\d+)/);
        if (match) {
            const month = parseInt(match[1]) - 1; // 月份從0開始
            const day = parseInt(match[2]);
            const date = new Date();
            date.setMonth(month);
            date.setDate(day);
            return date;
        }
        return new Date();
    }

    // 檢查是否同一天
    function isSameDay(date1, date2) {
        return date1.getDate() === date2.getDate() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getFullYear() === date2.getFullYear();
    }

    // 檢查是否本週
    function isThisWeek(date) {
        const today = new Date();
        const firstDayOfWeek = new Date(today);
        const day = today.getDay() || 7; // 獲取星期幾，如果是0（星期日）則設為7
        firstDayOfWeek.setDate(today.getDate() - day + 1); // 設置為本週一
        
        const lastDayOfWeek = new Date(firstDayOfWeek);
        lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6); // 設置為本週日
        
        return date >= firstDayOfWeek && date <= lastDayOfWeek;
    }

    // 檢查是否本月
    function isThisMonth(date) {
        const today = new Date();
        return date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    }

    // 參加活動的函數
    function joinActivity(activityId) {
        // 這裡可以添加AJAX請求來處理參加活動的邏輯
        console.log('參加活動：', activityId);
        alert('已成功報名參加活動！');
        
        // 更新參與人數顯示
        // 實際應用中應該從伺服器獲取最新數據
        const activityCard = document.querySelector(`[data-activity-id="${activityId}"]`).closest('.activity-card');
        const participantCount = activityCard.querySelector('.participant-count');
        const countParts = participantCount.textContent.split('/');
        const current = parseInt(countParts[0]) + 1;
        const total = parseInt(countParts[1]);
        participantCount.textContent = `${current}/${total}人`;
        
        // 如果人數已滿，禁用按鈕
        if (current >= total) {
            const joinBtn = activityCard.querySelector('.join-btn');
            joinBtn.textContent = '人數已滿';
            joinBtn.style.backgroundColor = '#999';
            joinBtn.style.pointerEvents = 'none';
        }
    }
});
