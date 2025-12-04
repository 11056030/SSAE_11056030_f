#!/usr/bin/env node

const ClassScheduleScraper = require('./scraper/classScheduleScraper');
const fs = require('fs');
const path = require('path');

// 將所有一般日誌輸出到 stderr，避免干擾 stdout JSON
console.log = (...args) => console.error(...args);

// 解析命令行參數
const args = process.argv.slice(2);
const params = {};
for (let i = 0; i < args.length; i += 2) {
    if (args[i].startsWith('--')) {
        const key = args[i].substring(2);
        params[key] = args[i + 1];
    }
}

// 檢查必要參數
if (!params.studentId || !params.password || !params.userId) {
    console.error('❌ 缺少必要參數: --studentId, --password, --userId');
    process.exit(1);
}

// 主函數
async function main() {
    const scraper = new ClassScheduleScraper();
    let sessionToken = null;
    
    try {
        // 登入
        console.log('🔑 正在登入...');
        const loginResult = await scraper.login(params.studentId, params.password);
        
        if (!loginResult.success) {
            console.error('❌ 登入失敗:', loginResult.message);
            process.exit(1);
        }
        
        sessionToken = loginResult.sessionToken;
        console.log('✅ 登入成功');
        
        // 獲取當前學期
        console.log('📅 正在獲取學期資訊...');
        const semesterResult = await scraper.getCurrentSemester(sessionToken);
        
        if (!semesterResult.success) {
            throw new Error(`獲取學期資訊失敗: ${semesterResult.message}`);
        }
        
        const { semester } = semesterResult.data;
        console.log(`📌 當前學期: ${semesterResult.data.displayText}`);
        
        // 獲取課表
        console.log('📋 正在獲取課表資料...');
        const scheduleResult = await scraper.getClassSchedule(sessionToken, semester);
        
        if (!scheduleResult.success) {
            throw new Error(`獲取課表失敗: ${scheduleResult.message}`);
        }
        
        // 格式化課表數據為資料庫格式
        const formattedData = scraper.formatScheduleForDatabase(
            scheduleResult.data,
            semester,
            params.userId
        );
        
        // 計算學分統計
        const creditSummary = calculateCreditSummary(formattedData);
        
        // 輸出結果
        const result = {
            success: true,
            data: {
                semester: semester,
                courses: formattedData,
                creditSummary: creditSummary
            }
        };
        
        // 僅將純 JSON 輸出到 stdout，供 Django 解析
        process.stdout.write(JSON.stringify(result));
        
        // 可選：將結果保存到文件（用於調試）
        const outputPath = path.join(__dirname, 'schedule_output.json');
        fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
        console.log(`📁 課表數據已保存至: ${outputPath}`);
        
    } catch (error) {
        console.error('❌ 發生錯誤:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        // 確保會話被正確清理
        if (sessionToken) {
            await scraper.logout(sessionToken);
        }
    }
}

/**
 * 計算學分統計
 * @param {Array} courses - 課程陣列
 * @returns {Object} 學分統計
 */
function calculateCreditSummary(courses) {
    let requiredCredits = 0;
    let electiveCredits = 0;
    
    courses.forEach(course => {
        if (course.required) {
            requiredCredits += course.credit || 0;
        } else {
            electiveCredits += course.credit || 0;
        }
    });
    
    return {
        required_credits: requiredCredits,
        elective_credits: electiveCredits,
        total_credits: requiredCredits + electiveCredits,
        gpa: null // 需要從成績系統獲取
    };
}

// 執行主函數
main();
