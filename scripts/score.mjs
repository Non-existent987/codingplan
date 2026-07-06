import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parse } from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const doc = parse(readFileSync(join(root, 'data', 'plans.yaml'), 'utf8'));

const PRICE_CAP = doc.meta.price_cap || 150;
const USD2CNY = 7.2;
const MAX_REFILL = 200000;

function fmtPrice(p) {
  return p.currency === 'usd' ? `$${p.price_monthly}` : `¥${p.price_monthly}`;
}

function cnyPrice(p) {
  return p.currency === 'usd' ? p.price_monthly * USD2CNY : p.price_monthly;
}

function capaPts(p) {
  const r = p.capability_rank;
  if (r === 1) return 50;
  if (r === 2) return 25;
  if (r === 3) return 10;
  if (r === 4) return 5;
  return 0;
}

function pricePts(p) {
  const c = cnyPrice(p);
  const raw = 50 * (1 - c / PRICE_CAP);
  return Math.max(0, Math.min(50, raw));
}

function quotaPts(p) {
  const m = p.refill_month ?? 0;
  return Math.min(50, (m / MAX_REFILL) * 50);
}

const PROVIDER_MAP = [
  ['GLM', 'Z AI'], ['DeepSeek', 'DeepSeek'], ['Kimi', 'Kimi'],
  ['MiniMax', 'MiniMax'], ['Qwen', 'Alibaba'], ['MiMo', 'Xiaomi'],
  ['Doubao', 'ByteDance'], ['ERNIE', 'Baidu'], ['Hunyuan', 'Tencent'],
  ['Pangu', 'Huawei'],
];

function modelProviders(models) {
  if (!models || !models.length) return new Set();
  const ps = new Set();
  for (const m of models) {
    for (const [prefix, name] of PROVIDER_MAP) {
      if (m.startsWith(prefix)) { ps.add(name); break; }
    }
  }
  return ps;
}

function calcBonus(p) {
  let pts = 0;
  const models = p.models || [];
  const n = models.length;

  if (n >= 8) pts += 4;
  else if (n >= 6) pts += 3;
  else if (n >= 4) pts += 2;
  else if (n >= 2) pts += 1;

  if (p.purchase_difficulty === 'easy') pts += 2;
  else if (p.purchase_difficulty === 'normal') pts += 1;

  if (p.note && /首月/.test(p.note)) pts += 2;

  const pCount = modelProviders(models).size;
  if (pCount >= 4) pts += 3;
  else if (pCount >= 3) pts += 2;
  else if (pCount >= 2) pts += 1;

  if (p.capability_rank === 1) pts += 3;
  else if (p.capability_rank === 2) pts += 2;
  else if (p.capability_rank === 3) pts += 1;

  if (p.region === 'cn') pts += 1;

  return Math.min(pts, 20);
}

const filtered = doc.plans.filter(p => {
  const priceCNY = cnyPrice(p);
  return priceCNY <= PRICE_CAP && [1, 2, 3, 4].includes(p.capability_rank);
});

const scored = filtered.map(p => {
  const cp = capaPts(p), pp = pricePts(p), qp = quotaPts(p);
  const base = cp * 0.80 + pp * 0.60 + qp * 0.60;
  const bonus = calcBonus(p);
  const total = Math.min(100, base + bonus);
  return {
    ...p,
    capa_pts: cp,
    price_pts: Number(pp.toFixed(2)),
    quota_pts: Number(qp.toFixed(2)),
    bonus_pts: bonus,
    total_score: Number(total.toFixed(2)),
  };
}).sort((a, b) => b.total_score - a.total_score);

const outOfBand = doc.plans
  .filter(p => !(cnyPrice(p) <= PRICE_CAP && [1, 2, 3, 4].includes(p.capability_rank)))
  .map(p => {
    const reasons = [];
    if (cnyPrice(p) > PRICE_CAP) reasons.push(`超预算(>¥${PRICE_CAP})`);
    if (![1, 2, 3, 4].includes(p.capability_rank)) reasons.push(`模型未进国内前3`);
    return { ...p, oob_reason: reasons.join('；'), capa_pts: 0, price_pts: 0, quota_pts: 0, bonus_pts: 0, total_score: 0 };
  });

const ranked = [...scored, ...outOfBand];
const featured = scored.slice(0, 6);

export { doc, ranked, featured, filtered, scored, USD2CNY, PRICE_CAP, MAX_REFILL, cnyPrice, fmtPrice };

if (process.argv[1] && process.argv[1].endsWith('score.mjs')) {
  console.log('═══ 过线名单（价格≤¥150，模型国内前4）═══');
  for (const r of scored) {
    console.log(
      `#${(featured.indexOf(r) + 1).toString().padStart(2)} ` +
      `${r.total_score.toFixed(1).padStart(5)}分 | ` +
      `${r.platform} ${r.plan} | ` +
      `能力${r.capa_pts} 价格${r.price_pts} 用量${r.quota_pts} 加分${r.bonus_pts}`
    );
  }
  console.log(`\n- featured: ${featured.length} 款`);
  console.log(`- 未过线: ${outOfBand.length} 款`);
}
