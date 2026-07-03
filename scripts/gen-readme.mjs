// 从 plans.yaml + score 计算结果生成 README.md，镜像站点首页结论
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { doc, featured } from './score.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function fmtPrice(p) {
  return p.currency === 'usd' ? `$${p.price_monthly}` : `¥${p.price_monthly}`;
}
function fmtTokens(m) {
  if (!m) return '—';
  if (m >= 1000) return `${(m / 1000).toFixed(2)}B`;
  return `${m}M`;
}

const fdate = doc.meta?.updated || '-';
const lines = [];
lines.push('# Coding Plan Guide');
lines.push('');
lines.push('> 2026 年 AI 编程订阅精选导购 — 给一个答案，不是列一堆。');
lines.push('>');
lines.push('> 更新于 ' + fdate + ' · 数据驱动：[方法说明](https://codingplanguide.com/method)');
lines.push('');
lines.push('---');
lines.push('');
lines.push('## 如果你只要一个答案');
lines.push('');
lines.push(`**${featured[0].platform} · ${featured[0].plan}** —— 综合得分 ${featured[0].total_score}（能力 ${featured[0].ability_score} + 性价比 ${featured[0].cost_score}）。${featured[0].note}`);
lines.push('');
lines.push('## 精选 Top ${0}'.replace('${0}', featured.length));
lines.push('');
lines.push('| # | 平台 · 套餐 | 月费 | 旗舰模型 | 月可用 Token | 每 ¥/M Token | 评分 |');
lines.push('|---|---|---|---|---|---|---|');
featured.forEach((p, i) => {
  lines.push(`| ${i + 1} | ${p.platform} · ${p.plan} | ${fmtPrice(p)} | ${p.model_flagship} | ${fmtTokens(p.measured_monthly_tokens_M)} | ¥${p.yuan_per_M_token} | ${p.total_score} |`);
});
lines.push('');
lines.push('> 全部套餐见 [codingplanguide.com/table](https://codingplanguide.com/table)');
lines.push('');
lines.push('---');
lines.push('');
lines.push('## 评分方法');
lines.push('');
lines.push('综合得分 = 能力分（0–10，源自 Artificial Analysis Agentic Index 2026-06）+ 性价比分（0–10，"每元可用 Token" 在集合内 min-max 归一化，价格越低分越高）。详见 [/method](https://codingplanguide.com/method)。');
lines.push('');
lines.push('---');
lines.push('');
lines.push('## 中立声明');
lines.push('');
lines.push('本项目不含任何联盟链接，不为任何平台返利。数据以官方公布为准。');
lines.push('');
lines.push('## License');
lines.push('');
lines.push('CC BY 4.0');
const readme = lines.join('\n');
writeFileSync(join(root, 'README.md'), readme, 'utf8');
console.log('[gen:readme] README.md 已生成，' + featured.length + ' 条精选。');