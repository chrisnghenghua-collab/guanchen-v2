# 观辰 P8｜预览 → 正式上线步骤（2026-10-24）

Netlify 免费额度：每次**正式**上线扣 15 点；**分支预览不扣点**；额度用完会暂停帐号下全部网站（含烘焙网站）。
所以先推到分支 `p8-preview` 免费检查，确认没问题再合并到 `main`（只扣一次 15 点）。

## 0. 本机检查
双击 `RUN_TESTS.cmd` → 预期 10 项全部 PASS，最后一行 `RESULT: PASS`。不是就停，把画面贴给 Claude。

## 1. 推到预览分支（在 D:\GUANCHEN_V2 打开命令提示字元）
```
git switch -c p8-preview
git add RUN_TESTS.cmd netlify.toml docs engine tests tools
git status
```
预期：`git status` 列出 57 个文件（绿色），没有 node_modules、没有 .log、没有 _tmp_claude。数量不对就停。
```
git commit -m "P6-P8: new website, professional chart, 大运流年, 繁体, logo, share card, usage counters"
git push -u origin p8-preview
```

## 2. 让 Netlify 为这个分支建预览（只需设定一次）
Netlify → 你的网站 → Site configuration → Build & deploy → Continuous deployment → Branches and deploy contexts → Configure →
Branch deploys 选 **Let me add individual branches** → 输入 `p8-preview` → Save。
然后到 Deploys 页面，按 "Trigger deploy"（如果没有自动开始）。完成后预览网址是：
`https://p8-preview--guanchen-preview.netlify.app`

## 3. 检查预览（不扣点）
```
node tests\p5_live_check.mjs https://p8-preview--guanchen-preview.netlify.app
```
预期：`P5_LIVE PASS: 11/11`。再用手机打开预览网址，排一个虚构命盘，切换繁體，按「分享命盘图卡」看看。
（预览站的访问次数记在另一个存储，不会算进正式数字。）

## 4. 正式上线（扣 15 点）
```
git switch main
git merge --ff-only p8-preview
git push
```
Netlify 会自动部署到 `https://guanchen-preview.netlify.app`。

## 5. 上线后检查
```
node tests\p5_live_check.mjs https://guanchen-preview.netlify.app
```
预期 `P5_LIVE PASS: 11/11`。再把网址用 WhatsApp 传给自己，看分享预览图是否出现（第一次可能要等几分钟）。

## 出问题时退回
Netlify → Deploys → 点上一版（P5）→ "Publish deploy"（退回不扣点）。
