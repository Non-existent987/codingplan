# Coding Plan Guide — AGENTS.md

<caption>精选导购 · AI 编程订阅推荐站</caption>
<ownedby>Non-existent987</ownedby>

## 架构

- **单一数据源** `data/plans.yaml` 驱动所有输出。改内容只改这一个文件。
- **Astro v4** 静态站，5 pages：`/`(首页)、`/calculator`(选哪个)、`/rankings`(排名)、`/table`(全部)、`/method`(方法)
- 样式：`src/styles/global.css`（单一文件），设计语言=白底+朱砂红 #E04A3C +Newsreader衬线
- 无测试框架，仅 `npm run validate` 做 YAML schema 校验

## 内容更新工作流（最重要）

每次改 `data/plans.yaml` 后，顺序执行以下命令：

```powershell
# 1. 校验
npm run validate

# 2. 重新生成 README.md
npm run gen:readme

# 3. Astro 构建
npm run build

# 4. 提交并推送（触发 GitHub Actions 自动部署到腾讯云）
git add -A
git commit -m "改动说明"
git push
```

> ⚠️ 如果 push 被拒绝，先 `git pull --rebase` 再 push。

## 打分引擎 V2 (`scripts/score.mjs`)

```
综合分 = 能力分×0.80 + 价格分×0.60 + 用量分×0.60 + 体验加分
满分 100，体验加分上限 20
```

| 维度 | 方式 | 公式 |
|---|---|---|
| 能力分 | 梯级 | 国内第1=50, 第2=25, 第3=10, 第4=5, 其他=0 |
| 价格分 | 线性 | 50×(1−价格/¥150)，¥0→50，¥150→0 |
| 用量分 | 线性 | (月请求数/200000)×50，上限50 |
| 体验加分 | 多维度累加(上限20) | 模型数(≤8→+4) + 购买难度(easy→+2) + 首月优惠(+2) + 厂商多样性(≥4家→+3) + 旗舰排名(rank1→+3) + 地区(cn→+1) |

## 过滤规则

- 价格 ≤ ¥150（USD 按 ×7.2 换算）
- 旗舰模型国内排名前4（capability_rank 为 1/2/3/4）
- 不满足的标 `oob_reason` 在"全部"页面折叠显示

## 排名规则

完全按公式得分从高到低排列。**无人工排序覆盖**（userOrder 已移除）。

## 体验加分详解（`scripts/score.mjs` 的 `calcBonus` 函数）

1. **模型池数**：1个=0, 2-3=+1, 4-5=+2, 6-7=+3, 8以上=+4
2. **购买难度**：easy=+2, normal=+1, hard=0
3. **首月优惠**：note含"首月"=+2
4. **厂商多样性**：模型覆盖≥4家不同厂商=+3, ≥3家=+2, ≥2家=+1
5. **旗舰排名**：rank1=+3, rank2=+2, rank3=+1
6. **地区**：cn=+1

## 部署

- `main` 分支 push → GitHub Actions 自动：npm ci → validate → gen:readme → build → SCP dist/ 到腾讯云 → nginx reload
- GitHub Secrets：`DEPLOY_SSH_KEY`、`SERVER_HOST`(124.222.157.181)、`SERVER_PORT`(22)、`REMOTE_PATH`(/var/www/codingplanguide)、`SERVER_HOST_KEY`

## 模型能力排名

- 数据来源：`https://artificialanalysis.ai/leaderboards/models` Intelligence Index v4.1
- 排名数据硬编码在：
  - `src/pages/index.astro:130`（首页前10）
  - `src/pages/rankings.astro:4`（排名页前25）
  - `scripts/gen-readme.mjs:99`（README前25）
  - **三处需同步更新**
- 国内排名定义：按 AA Intelligence Index 分数降序
  - 国内第1=GLM-5.2(#7), 第2=Qwen3.7 Max(#11), 第3=MiniMax-M3(#12), 第4=DeepSeek V4 Pro(#13)

## 重要约定

- 作者署名 `Non-existent987`，git config 已 repo-local 设好，提交时不要改
- 内容语言：简体中文
- URL 全用 `https://codingplanguide.com`（非 IP）
- README.md 由 `npm run gen:readme` 自动生成，不要直接手改
- 零 emoji 零徽章的设计原则
- CI 部署的 Node 版本是 20（`actions/setup-node@v4 with node-version: '20'`）
- GitHub 仓库：`github.com/Non-existent987/codingplanguide`
- 所有购买按钮统一显示"官方订阅"，不标返利标签
- 页脚备案占位"备案中"，备案通过后替换
