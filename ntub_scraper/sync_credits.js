#!/usr/bin/env node

const NTUBScraper = require('./scraper/ntubScraper');

// 將所有一般日誌輸出到 stderr，避免干擾 stdout JSON
console.log = (...args) => console.error(...args);

// 解析命令行參數
const args = process.argv.slice(2);
const params = {};
for (let i = 0; i < args.length; i += 2) {
  if (args[i] && args[i].startsWith('--')) {
    const key = args[i].substring(2);
    params[key] = args[i + 1];
  }
}

if (!params.studentId || !params.password) {
  console.error('❌ 缺少必要參數: --studentId, --password');
  process.exit(1);
}

async function main() {
  const scraper = new NTUBScraper();
  let sessionToken = null;

  try {
    const loginResult = await scraper.login(params.studentId, params.password);
    if (!loginResult.success) {
      console.error('❌ 登入失敗:', loginResult.message || '未知錯誤');
      process.exit(1);
    }

    sessionToken = loginResult.sessionToken;

    const creditStats = await scraper.getCreditStats(sessionToken);

    const result = {
      success: true,
      data: creditStats
    };

    process.stdout.write(JSON.stringify(result));
  } catch (err) {
    console.error('❌ 同步學分時發生錯誤:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    if (sessionToken) {
      try {
        await scraper.logout(sessionToken);
      } catch (e) {
        // ignore
      }
    }
  }
}

main();
