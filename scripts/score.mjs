// 读取 plans.yaml，计算综合得分（能力分 + 性价比分），输出 rankedPlans
// 公式透明公开于 /method 页
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parse } from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const doc = parse(readFileSync(join(root, 'data', 'plans.yaml'), 'utf8'));

// 1) 能力分：直接取 capability_score（0–10，来源 AA Agentic Index 归一化）
// 2) 性价比分：yuan_per_M_token 越低越好 → 在集合内 min-max 归一化到 0–10（取倒序）
const prices = doc.plans.map(p => p.yuan_per_M_token);
const minP = Math.min(...prices);
const maxP = Math.max(...prices);
const USD2CNY = 7.2;

const ranked = doc.plans
  .map(p => {
    const ability = p.capability_score;
    const span = Math.max(1e-9, maxP - minP);
    // 性价比分：价格越低分越高；若只有一条集合 span=0，给满分 10
    const costScore = span < 1e-6 ? 10 : ((maxP - p.yuan_per_M_token) / span) * 10;
    const total = ability + costScore; // 0–20
    return {
      ...p,
      ability_score: ability,
      cost_score: Number(costScore.toFixed(2)),
      total_score: Number(total.toFixed(2))
    };
  })
  .sort((a, b) => b.total_score - a.total_score);

const featured = ranked.slice(0, 6);

export { doc, ranked, featured, minP, maxP, USD2CNY };

// 直接运行时打印结果
if (process.argv[1] && process.argv[1].endsWith('score.mjs')) {
  console.log('— ranked —');
  for (const r of ranked) {
    console.log(`${r.total_score.toFixed(2).padStart(5)} | ${r.platform} ${r.plan} | 能力${r.ability_score} 性价比${r.cost_score}`);
  }
}