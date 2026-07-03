// price-watch — 生成 plans.yaml 的快照，对比上次快照，输出 diff
// 用法:
//   node scripts/price-watch.mjs              生成今天快照（不输出 diff）
//   node scripts/price-watch.mjs --diff       对比上次快照，输出变更
// 输出快照到 data/snapshots/YYYY-MM-DD.json
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parse } from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const doc = parse(readFileSync(join(root, 'data', 'plans.yaml'), 'utf8'));

// 关键字段（变化会触发提醒）
const KEYS = ['price_monthly', 'capability_score', 'measured_monthly_tokens_M', 'refill_5h', 'refill_week', 'refill_month', 'updated'];

function digest(p) {
  return Object.fromEntries(KEYS.map(k => [k, p[k] ?? null]));
}

function todayISO() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
}

const snapDir = join(root, 'data', 'snapshots');
if (!existsSync(snapDir)) {
  // 简易 mkdir
  const { mkdirSync } = await import('node:fs');
  mkdirSync(snapDir, { recursive: true });
}

const today = todayISO();
const snap = { date: today, plans: Object.fromEntries(doc.plans.map(p => [p.id, digest(p)])) };

const snapshotPath = join(snapDir, `${today}.json`);
if (!existsSync(snapshotPath)) {
  writeFileSync(snapshotPath, JSON.stringify(snap, null, 2), 'utf8');
}

// 找上一次快照
const snapshots = readdirSync(snapDir)
  .filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
  .sort()
  .filter(f => f !== `${today}.json`);

if (snapshots.length === 0) {
  console.log(`[price-watch] 首次快照已生成: ${snapshotPath}`);
  process.exit(0);
}

const prevPath = join(snapDir, snapshots[snapshots.length - 1]);
const prev = JSON.parse(readFileSync(prevPath, 'utf8'));

// Diff
const diffs = [];
for (const p of doc.plans) {
  const prevPlan = prev.plans[p.id];
  if (!prevPlan) {
    diffs.push({ id: p.id, kind: 'added', plan: `${p.platform} ${p.plan}` });
    continue;
  }
  const changes = {};
  for (const k of KEYS) {
    if ((prevPlan[k] ?? null) !== (p[k] ?? null)) {
      changes[k] = { from: prevPlan[k], to: p[k] };
    }
  }
  if (Object.keys(changes).length > 0) {
    diffs.push({ id: p.id, kind: 'changed', plan: `${p.platform} ${p.plan}`, changes });
  }
}

for (const id of Object.keys(prev.plans)) {
  if (!doc.plans.find(p => p.id === id)) {
    diffs.push({ id, kind: 'removed', plan: id });
  }
}

console.log(`[price-watch] 当前快照: ${snapshotPath}`);
console.log(`[price-watch] 上次快照: ${prevPath.split(/[\\/]/).pop()}`);
console.log(`[price-watch] 发现 ${diffs.length} 项变更:`);
if (diffs.length === 0) {
  console.log('  无变化。');
  process.exit(0);
}
for (const d of diffs) {
  if (d.kind === 'added') console.log(`  + ${d.plan}（新增）`);
  else if (d.kind === 'removed') console.log(`  - ${d.id}（已删除）`);
  else {
    console.log(`  * ${d.plan}`);
    for (const [k, v] of Object.entries(d.changes)) {
      console.log(`      ${k}: ${v.from} → ${v.to}`);
    }
  }
}

// 若带 --diff 标志且环境变量 GH，可创建 issue（GitHub Action 用）
if (process.env.PRICE_WATCH_ISSUE === '1' && diffs.length > 0) {
  // 通过 stdout 输出 markdown 摘要供 CI 用
  console.log('\n--- markdown summary ---');
  console.log(`## 价格/权益变更 ${today}\n`);
  for (const d of diffs) {
    if (d.kind === 'added') console.log(`- **新增** ${d.plan}`);
    else if (d.kind === 'removed') console.log(`- **删除** ${d.id}`);
    else {
      const lines = [`**${d.plan}**`];
      for (const [k, v] of Object.entries(d.changes)) {
        lines.push(`  - \`${k}\`: \`${v.from}\` → \`${v.to}\``);
      }
      console.log(lines.join('\n'));
    }
  }
}