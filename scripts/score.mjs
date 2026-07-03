import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parse } from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const doc = parse(readFileSync(join(root, 'data', 'plans.yaml'), 'utf8'));

const PRICE_CAP = doc.meta.price_cap || 150;
const CAPA_FLOOR = doc.meta.capability_floor || 7.5;
const USD2CNY = 7.2;
const FEATURED_MAX = 6;

function cnyPrice(p) {
  return p.currency === 'usd' ? p.price_monthly * USD2CNY : p.price_monthly;
}

// ---------- 能力分：国内第1=50, 第2=30, 第3=20, 其他=0 ----------
function capaScore(p) {
  const rank = p.capability_rank;
  if (rank === 1) return 50;
  if (rank === 2) return 30;
  if (rank === 3) return 20;
  return 0;
}

// ---------- 价格分：≤¥50=50, ¥50-100=30, >¥100=20 ----------
function priceScore(p) {
  const cny = cnyPrice(p);
  if (cny <= 50) return 50;
  if (cny <= 100) return 30;
  return 20;
}

// ---------- 用量分：月请求数归一化 0-50 ----------
const allRefillMonth = doc.plans.map(p => p.refill_month ?? 0);
const maxRefill = Math.max(...allRefillMonth, 1);

function quotaScore(p) {
  const m = p.refill_month ?? 0;
  return (m / maxRefill) * 50;
}

// ---------- 第 1 步: 过滤（价格 ≤ cap，能力 ≥ floor）----------
const filtered = doc.plans.filter(p => {
  const priceCNY = cnyPrice(p);
  return priceCNY <= PRICE_CAP && p.capability_score >= CAPA_FLOOR;
});

// ---------- 第 2 步: 算分 ----------
// 综合分 = 能力分×40% + 价格分×30% + 用量分×30%，满分100
const scored = filtered.map(p => {
  const cs = capaScore(p);
  const ps = priceScore(p);
  const qs = quotaScore(p);
  const total = cs * 0.40 + ps * 0.30 + qs * 0.30;

  return {
    ...p,
    capa_pts: cs,
    price_pts: ps,
    quota_pts: Number(qs.toFixed(2)),
    total_score: Number(total.toFixed(2)),
  };
}).sort((a, b) => b.total_score - a.total_score);

// ---------- 第 3 步: 全量排序（未过线也入，但标注原因）----------
const outOfBand = doc.plans
  .filter(p => !(cnyPrice(p) <= PRICE_CAP && p.capability_score >= CAPA_FLOOR))
  .map(p => {
    const reasons = [];
    if (cnyPrice(p) > PRICE_CAP) reasons.push(`超预算(>¥${PRICE_CAP})`);
    if (p.capability_score < CAPA_FLOOR) reasons.push(`模型未达国内前3(能力<${CAPA_FLOOR})`);
    return { ...p, oob_reason: reasons.join('；'), capa_pts: 0, price_pts: 0, quota_pts: 0, total_score: 0 };
  });

const ranked = [...scored, ...outOfBand];
const featured = scored.slice(0, Math.min(FEATURED_MAX, scored.length));

export { doc, ranked, featured, filtered, scored, USD2CNY, PRICE_CAP, CAPA_FLOOR, maxRefill };

if (process.argv[1] && process.argv[1].endsWith('score.mjs')) {
  console.log('═══ 过线名单（价格≤¥150，能力≥国内前3）═══');
  for (const r of scored) {
    console.log(
      `#${(featured.indexOf(r) + 1).toString().padStart(2)} ` +
      `${r.total_score.toFixed(1).padStart(5)}分 | ` +
      `${r.platform} ${r.plan} | ¥${cnyPrice(r).toFixed(0)} | ` +
      `能力${r.capa_pts} 价格${r.price_pts} 用量${r.quota_pts.toFixed(1)}`
    );
  }
  console.log(`\n- featured: ${featured.length} 款`);
  console.log(`- 未过线: ${outOfBand.length} 款`);
}
