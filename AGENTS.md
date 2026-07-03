# Coding Plan Guide — AGENTS.md

<caption>精选导购 · AI 编程订阅推荐站</caption>
<ownedby>Non-existent987</ownedby>

## 架构

- **单一数据源** `data/plans.yaml` 驱动所有输出。改内容只改这一个文件。
- **Astro v4** 静态站，3 pages：`/`(首页)、`/table`(全部)、`/method`(方法)
- 样式：`src/styles/global.css`（单一文件），设计语言=白底+朱砂红 #E04A3C +Newsreader衬线
- 无测试框架，仅 `npm run validate` 做 YAML schema 校验

## 内容更新工作流

每次改 `data/plans.yaml` 后，提交前必须顺序执行：
1. `npm run validate` — 校验字段、类型、值范围
2. `npm run gen:readme` — 从 YAML 重新生成 `README.md`
3. `npm run build` — Astro 构建（无 typecheck 步骤，仅 build）
4. `git add -A && git commit && git push` — 触发 GitHub Actions 自动部署

## 打分引擎 (`scripts/score.mjs`)

- **筛选**：价格 ≤ ¥150（USD 按 ×7.2 换算）+ 能力分 ≥ 7.5（国内 T0）
- **综合分**：价格分×0.45 + 能力分×0.35 + 用量分×0.20
- 价格分=集合内 min-max 逆序归一化（越便宜越高），用量分=月 Token 归一化（越多越高）
- **featured 显式排序**：不依赖纯数学排名。`index.astro:36` 用 `userOrder` 数组覆盖，由 owner 人工决定
- 该方法也应用在 `table.astro` 和 `scripts/gen-readme.mjs` 中，三处同步更新
- 未过线的计划标 `oob_reason` 并在 "全部" 页面折叠显示

## 返利链接

- 字段 `affiliate_url`：非必填，如果存在则卡片和购买按钮优先显示该链接（`rel="sponsored"`）
- 否则用 `official_url`（`rel="nofollow"`）
- owner 的 OpenCode Go 推荐链接：`https://opencode.ai/go?ref=F3C3Y1MVK0`

## 部署

- `main` 分支 push → GitHub Actions 自动：npm ci → validate → gen:readme → build → SCP dist/ 到腾讯云 → nginx -t && nginx -s reload
- Secrets 必要：`DEPLOY_SSH_KEY`、`SERVER_HOST`(124.222.157.181)、`SERVER_PORT`(22)、`REMOTE_PATH`(/var/www/codingplanguide)、`SERVER_HOST_KEY`
- 腾讯云 4G4C CentOS，Nginx 配 80→301 to 443，SSL 证书在 `/home/helong/SSL/codingplanguide.com_nginx/`

## 重要约定

- 作者署名 `Non-existent987`，git config 已 repo-local 设好，提交时不要改
- 内容语言：简体中文
- URL 全用 `https://codingplanguide.com`（非 IP）
- README.md 由 `npm run gen:readme` 自动生成，不要直接手改
- 零 emoji 零徽章的设计原则
- CI 部署的 Node 版本是 20（`actions/setup-node@v4 with node-version: '20'`）