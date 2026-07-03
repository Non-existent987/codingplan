import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { doc, scored } from './score.mjs';

const userOrder = ['volcengine-lite', 'opencode-go', 'glm-lite', 'xunfei-pro', 'glm-pro'];
const featured = userOrder.map(id => scored.find(p => p.id === id)).filter(Boolean);
for (const s of scored) { if (!featured.find(p => p.id === s.id)) featured.push(s); }

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
function fmtRefill(n) {
  if (!n) return '—';
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  return n.toLocaleString();
}
function rankLabel(r) {
  if (r === 1) return '国内第1';
  if (r === 2) return '国内第2';
  if (r === 3) return '国内第3';
  return '—';
}

const fdate = doc.meta?.updated || '-';
const cap = doc.meta?.price_cap || 150;

const lines = [];
lines.push('# Coding Plan Guide');
lines.push('');
lines.push(`> AI 编程 · 怎么选最值。每月不超 ¥${cap}，模型就得用最强的。`);
lines.push('>');
lines.push(`> 更新于 ${fdate} · 数据驱动：[方法说明](https://codingplanguide.com/method)`);
lines.push('');
lines.push('---');
lines.push('');
lines.push(`## 最值的一单：[${featured[0].platform} · ${featured[0].plan}](${featured[0].affiliate_url || featured[0].official_url})`);
lines.push('');
lines.push(`${featured[0].note} — 综合分 ${featured[0].total_score}（能力 ${featured[0].capa_pts} + 价格 ${featured[0].price_pts} + 用量 ${featured[0].quota_pts}）。`);
lines.push(`[官方订阅 →](${featured[0].affiliate_url || featured[0].official_url})`);
lines.push('');
lines.push(`## 过线排名 Top ${featured.length}`);
lines.push('');
lines.push('| # | 平台 · 套餐 | 月费 | 旗舰模型 | 模型排名 | 月请求数 | 综合分 | 结论 |');
lines.push('|---|---|---|---|---|---|---|---|');
featured.forEach((p, i) => {
  const link = p.affiliate_url || p.official_url;
  lines.push(`| ${i + 1} | [${p.platform} · ${p.plan}](${link}) | ${fmtPrice(p)} | ${p.model_flagship} | ${rankLabel(p.capability_rank)} | ${fmtRefill(p.refill_month)} | ${p.total_score} | ${p.verdict} |`);
});
lines.push('');
lines.push(`> 全部套餐（含未过线 ${doc.plans.length - featured.length} 款）见 [codingplanguide.com/table](https://codingplanguide.com/table)`);
lines.push('');
lines.push('---');
lines.push('');
lines.push('## 特别推荐：各模型月请求数对比');
lines.push('');
lines.push('| 模型 | 每5小时请求数 | 每周请求数 | 每月请求数 | AA排名 |');
lines.push('|---|---|---|---|---|');
const modelTable = [
  { name: 'GLM-5.2', h5: 880, week: 2150, month: 4300, aa: 7 },
  { name: 'GLM-5.1', h5: 880, week: 2150, month: 4300, aa: 25 },
  { name: 'Kimi K2.6', h5: 1150, week: 2880, month: 5750, aa: 15 },
  { name: 'Kimi K2.7 Code', h5: 1350, week: 4630, month: 9250, aa: 17 },
  { name: 'MiMo-V2.5', h5: 30100, week: 75200, month: 150400, aa: 16 },
  { name: 'MiMo-V2.5-Pro', h5: 3250, week: 8150, month: 16300, aa: 16 },
  { name: 'MiniMax M3', h5: 3200, week: 8000, month: 16000, aa: 12 },
  { name: 'MiniMax M2.7', h5: 3400, week: 8500, month: 17000, aa: 33 },
  { name: 'Qwen3.7 Max', h5: 950, week: 2390, month: 4770, aa: 11 },
  { name: 'Qwen3.7 Plus', h5: 4300, week: 10800, month: 21600, aa: 30 },
  { name: 'Qwen3.6 Plus', h5: 3300, week: 8200, month: 16300, aa: 30 },
  { name: 'DeepSeek V4 Pro', h5: 3450, week: 8550, month: 17150, aa: 13 },
  { name: 'DeepSeek V4 Flash', h5: 31650, week: 79050, month: 158150, aa: 20 },
];
modelTable.forEach(m => {
  lines.push(`| ${m.name} | ${m.h5.toLocaleString()} | ${m.week.toLocaleString()} | ${m.month.toLocaleString()} | #${m.aa} |`);
});
lines.push('');
lines.push('> AA排名 = Artificial Analysis Intelligence Index v4.1 全球排名（2026-07-03）');
lines.push('');
lines.push('---');
lines.push('');
lines.push('## 模型能力排名 Top 20（条形图）');
lines.push('');
lines.push('```');
const top20 = [
  { name: 'Claude Fable 5', score: 60 },
  { name: 'Claude Opus 4.8', score: 56 },
  { name: 'GPT-5.5 (xhigh)', score: 55 },
  { name: 'Claude Opus 4.7', score: 54 },
  { name: 'Claude Sonnet 5', score: 53 },
  { name: 'GPT-5.5 (high)', score: 53 },
  { name: 'GLM-5.2', score: 51 },
  { name: 'GPT-5.5 (medium)', score: 50 },
  { name: 'Gemini 3.5 Flash', score: 50 },
  { name: 'Gemini 3.1 Pro', score: 46 },
  { name: 'Qwen3.7 Max', score: 46 },
  { name: 'MiniMax-M3', score: 44 },
  { name: 'DeepSeek V4 Pro', score: 44 },
  { name: 'GPT-5.3 Codex', score: 44 },
  { name: 'Kimi K2.6', score: 43 },
  { name: 'MiMo-V2.5-Pro', score: 42 },
  { name: 'Kimi K2.7 Code', score: 42 },
  { name: 'Nex-N2-Pro', score: 41 },
  { name: 'DeepSeek V4 Pro (high)', score: 41 },
  { name: 'DeepSeek V4 Flash', score: 40 },
];
const barMax = 40;
top20.forEach((m, i) => {
  const bar = '█'.repeat(Math.round((m.score / 60) * barMax));
  const cn = ['GLM-5.2', 'Qwen3.7 Max', 'MiniMax-M3', 'DeepSeek V4 Pro', 'Kimi K2.6', 'MiMo-V2.5-Pro', 'Kimi K2.7 Code', 'DeepSeek V4 Flash'].includes(m.name) ? ' ★' : '';
  lines.push(`${String(i + 1).padStart(2)} ${m.name.padEnd(24)} ${bar} ${m.score}${cn}`);
});
lines.push('```');
lines.push('');
lines.push('> ★ = 国内可订阅 · 来源：[Artificial Analysis](https://artificialanalysis.ai/leaderboards/models) Intelligence Index v4.1');
lines.push('');
lines.push('---');
lines.push('');
lines.push('## 评分方法');
lines.push('');
lines.push(`综合分 = 能力分×40% + 价格分×30% + 用量分×30%（满分100）。能力分：国内第1=50、第2=30、第3=20；价格分：≤¥50=50、¥50-100=30、>¥100=20；用量分：月请求数归一化0-50。详见 [/method](https://codingplanguide.com/method)。`);
lines.push('');
lines.push('## 中立声明');
lines.push('');
lines.push('数据以官方公布为准。');
lines.push('');
lines.push('## License');
lines.push('');
lines.push('CC BY 4.0');
const readme = lines.join('\n');
writeFileSync(join(root, 'README.md'), readme, 'utf8');
console.log(`[gen:readme] README.md 已生成，${featured.length} 条 featured。`);
