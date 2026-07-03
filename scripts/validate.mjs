// 校验 data/plans.yaml 字段规范，CI 中运行（npm run validate）
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parse } from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const file = readFileSync(join(root, 'data', 'plans.yaml'), 'utf8');
const doc = parse(file);

const errors = [];
const ALLOW = {
  currency: ['cny', 'usd'],
  region: ['cn', 'global'],
  type: ['coding', 'token'],
  capability_tier: ['T0', 'T1', 'T2'],
  purchase_difficulty: ['easy', 'normal', 'hard'],
  verdict: ['推荐', '平替', '谨慎']
};
const REQ = [
  'id', 'platform', 'plan', 'price_monthly', 'currency', 'region', 'type',
  'model_flagship', 'multimodal', 'yuan_per_M_token', 'capability_tier',
  'capability_score', 'purchase_difficulty', 'official_url', 'note', 'verdict', 'featured', 'updated'
];

if (!doc.plans || !Array.isArray(doc.plans) || doc.plans.length === 0) {
  errors.push('plans: 必须为非空数组');
}
const ids = new Set();
for (const [i, p] of (doc.plans || []).entries()) {
  const ctx = `plans[${i}] (${p.id ?? '?'})`;
  for (const k of REQ) {
    if (p[k] === undefined || p[k] === null) errors.push(`${ctx}: 缺字段 ${k}`);
  }
  for (const [k, vals] of Object.entries(ALLOW)) {
    if (p[k] !== undefined && !vals.includes(p[k])) errors.push(`${ctx}: ${k}=${p[k]} 非法，允许 ${vals.join('|')}`);
  }
  if (typeof p.price_monthly !== 'number' || p.price_monthly <= 0) errors.push(`${ctx}: price_monthly 必须为正数`);
  if (typeof p.yuan_per_M_token !== 'number' || p.yuan_per_M_token <= 0) errors.push(`${ctx}: yuan_per_M_token 必须为正数`);
  if (typeof p.capability_score !== 'number' || p.capability_score < 0 || p.capability_score > 10) errors.push(`${ctx}: capability_score 必须 0–10`);
  if (p.id) {
    if (!/^[a-z0-9-]+$/.test(p.id)) errors.push(`${ctx}: id 仅允许小写字母数字连字符`);
    if (ids.has(p.id)) errors.push(`${ctx}: id 重复`);
    ids.add(p.id);
  }
  if (p.updated && !/^\d{4}-\d{2}-\d{2}$/.test(p.updated)) errors.push(`${ctx}: updated 格式须 YYYY-MM-DD`);
  if (p.models && !Array.isArray(p.models)) errors.push(`${ctx}: models 须数组`);
}

if (errors.length) {
  console.error(`[validate] ${errors.length} 个错误:`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log(`[validate] 通过，共 ${doc.plans.length} 条精选/全量套餐。`);