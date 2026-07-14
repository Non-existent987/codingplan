const puppeteer = require('/usr/lib/node_modules/puppeteer');
const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const REPO_DIR = '/home/helong/codingplanguide';
const PLANS_PATH = path.join(REPO_DIR, 'data/plans.yaml');
const LOG_PATH = '/tmp/daily-watch.log';

function log(msg) {
  const ts = new Date().toISOString().slice(0, 19);
  const line = `[${ts}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_PATH, line + '\n');
}

// Extract unique base monthly prices (filter duplicates, sort)
// Filter out promo/discount prices: keep only integer values that are likely base prices
function cleanPrices(arr, expectedCount) {
  let prices = [...new Set(arr.map(Number).filter(p => p > 0))];
  // Remove discounted prices (those with decimal .1/.4/.6/.8 are quarterly/yearly promos)
  prices = prices.filter(p => p === Math.floor(p) || p % 1 === 0);
  // If still too many, keep only the highest values (base > promo)
  if (expectedCount && prices.length > expectedCount) {
    prices.sort((a,b) => b-a);
    prices = prices.slice(0, expectedCount);
  }
  return prices.sort((a,b) => a-b);
}

async function scrapeAll() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu']
  });

  const results = {};

  try {
    // 1. 字节方舟
    {
      const page = await browser.newPage();
      await page.setViewport({width: 1440, height: 900});
      try {
        await page.goto('https://www.volcengine.com/activity/codingplan', {waitUntil:'networkidle2',timeout:30000});
        await page.waitForTimeout(5000);
        const prices = await page.evaluate(() => {
          const text = document.body.innerText;
          // Match both ¥40/月 and ¥200.00 元/月 formats
          const matches = [...text.matchAll(/[¥￥]\s*([\d.]+)\s*(?:\/\s*月|元\s*\/\s*月)/g)];
          return matches.map(m => parseFloat(m[1]));
        });
        results.volcengine = { prices: cleanPrices(prices, 2) };
        log(`volcengine: ${results.volcengine.prices}`);
      } catch(e) { log(`volcengine ERROR: ${e.message}`); }
      await page.close();
    }

    // 2. 智谱AI
    {
      const page = await browser.newPage();
      await page.setViewport({width: 1440, height: 900});
      try {
        await page.goto('https://bigmodel.cn/glm-coding', {waitUntil:'networkidle2',timeout:30000});
        await page.waitForTimeout(8000);
        const prices = await page.evaluate(() => {
          return [...document.body.innerText.matchAll(/￥([\d.]+)\/月/g)].map(m => parseFloat(m[1]));
        });
        results.bigmodel = { prices: cleanPrices(prices, 3) };
        log(`bigmodel: ${results.bigmodel.prices}`);
      } catch(e) { log(`bigmodel ERROR: ${e.message}`); }
      await page.close();
    }

    // 3. MiniMax
    {
      const page = await browser.newPage();
      await page.setViewport({width: 1440, height: 900});
      try {
        await page.goto('https://platform.minimaxi.com/subscribe/token-plan', {waitUntil:'networkidle2',timeout:30000});
        await page.waitForTimeout(6000);
        const prices = await page.evaluate(() => {
          return [...document.body.innerText.matchAll(/¥(\d+)\s*\/\s*月/g)].map(m => parseInt(m[1]));
        });
        results.minimax = { prices: cleanPrices(prices) };
        log(`minimax: ${results.minimax.prices}`);
      } catch(e) { log(`minimax ERROR: ${e.message}`); }
      await page.close();
    }

    // 4. OpenCode
    {
      const page = await browser.newPage();
      await page.setViewport({width: 1440, height: 900});
      try {
        await page.goto('https://opencode.ai/go', {waitUntil:'networkidle2',timeout:30000});
        await page.waitForTimeout(4000);
        const prices = await page.evaluate(() => {
          const text = document.body.innerText;
          // Only match prices on the main pricing card (not FAQ mentions)
          const m = text.match(/\$(\d+)\/month\s*\$\d+\s*first month/);
          if (m) return [parseInt(m[1])];
          return [...text.matchAll(/\$(\d+)\/month/g)].map(m => parseInt(m[1]));
        });
        results.opencode = { prices: cleanPrices(prices) };
        log(`opencode: ${results.opencode.prices}`);
      } catch(e) { log(`opencode ERROR: ${e.message}`); }
      await page.close();
    }

    // 5. 智谱国际版
    {
      const page = await browser.newPage();
      await page.setViewport({width: 1440, height: 900});
      try {
        await page.goto('https://z.ai/subscribe', {waitUntil:'networkidle2',timeout:30000});
        await page.waitForTimeout(8000);
        const prices = await page.evaluate(() => {
          return [...document.body.innerText.matchAll(/\$\s*([\d.]+)\s*\/\s*month/g)].map(m => parseFloat(m[1]));
        });
        results.glm_intl = { prices: cleanPrices(prices, 3) };
        log(`glm_intl: ${results.glm_intl.prices}`);
      } catch(e) { log(`glm_intl ERROR: ${e.message}`); }
      await page.close();
    }

  } finally {
    await browser.close();
  }

  return results;
}

// Compare with plans.yaml and report changes
function checkChanges(scraped) {
  const yaml = fs.readFileSync(PLANS_PATH, 'utf8');
  const changes = [];

  // Extract current monthly prices from YAML for each provider
  const configs = {
    volcengine: { ids: ['volcengine-lite', 'volcengine-pro'] },
    bigmodel: { ids: ['glm-lite', 'glm-pro', 'glm-max'] },
    minimax: { ids: ['minimax-plus', 'minimax-max', 'minimax-ultra'] },
    opencode: { ids: ['opencode-go'] },
    glm_intl: { ids: ['glm-intl-lite', 'glm-intl-pro', 'glm-intl-max'] },
  };

  for (const [key, cfg] of Object.entries(configs)) {
    const currentPrices = [];
    for (const id of cfg.ids) {
      const regex = new RegExp(`${id}\\b[\\s\\S]*?price_monthly:\\s*(\\d+)`);
      const m = yaml.match(regex);
      if (m) currentPrices.push(parseInt(m[1]));
    }

    const scrapedPrices = scraped[key]?.prices || [];
    
    if (scrapedPrices.length > 0 && JSON.stringify(currentPrices.sort()) !== JSON.stringify(scrapedPrices.sort())) {
      changes.push({
        provider: key,
        current: currentPrices.sort(),
        scraped: scrapedPrices.sort()
      });
    }
  }

  return changes;
}

// Main
(async () => {
  log('Daily watch starting...');
  
  const scraped = await scrapeAll();
  const changes = checkChanges(scraped);

  if (changes.length > 0) {
    log(`⚠️ ${changes.length} provider(s) changed!`);
    for (const c of changes) {
      log(`  ${c.provider}: YAML=${c.current} → LIVE=${c.scraped}`);
    }
    log('Manual update required.');
    process.exit(1);
  } else {
    log('✅ All prices match. No changes.');
    process.exit(0);
  }
})().catch(e => {
  log(`FATAL: ${e.message}`);
  process.exit(2);
});
