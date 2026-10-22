# P5 部署步骤（GitHub 私有仓库 → Netlify 预览）｜2026-10-23

## 第 0 步｜先在本机跑测试
- 做什么：双击 `D:\GUANCHEN_V2\RUN_TESTS.cmd`。
- 为什么：这次移动了旧接口、换了样本资料，要先确认你的电脑上全部通过。
- 预期：6 步全部通过，最后一行 `RESULT: PASS`。
- 不要：没有 PASS 就不要继续往下做。

## 第 1 步｜在 GitHub 建私有仓库
1. 打开 https://github.com/new
2. Repository name 填 `guanchen-v2`；选 **Private**。
3. 下面的 Add a README、.gitignore、license **都不要勾**。
4. 按 Create repository。
- 预期：出现 Quick setup 页面，显示 `https://github.com/你的用户名/guanchen-v2.git`。

## 第 2 步｜上传（PowerShell，一行一行执行）
```
cd D:\GUANCHEN_V2
git init -b main
git config user.name "Chris"
git config user.email "你的GitHub邮箱"
git add -A
git status --short | Measure-Object -Line
git status --short | Select-String node_modules
```
- 预期：倒数第二行显示约 113（Lines）；最后一行**什么都不显示**（代表 node_modules 没被加入）。
- 如果最后一行有任何输出：停，把画面发给 Claude。

接着执行：
```
git commit -m "GUANCHEN V2 P5: initial upload"
git remote add origin https://github.com/你的用户名/guanchen-v2.git
git push -u origin main
```
- 预期：第一次会弹出浏览器要你登录 GitHub 并授权；完成后显示 `branch 'main' set up to track 'origin/main'`。刷新 GitHub 页面能看到 `engine`、`docs`、`tests` 等文件夹。
- 不要：不要用 `--force`；不要在 `D:\GUANCHEN_WEB\repo` 里执行任何 git 命令。

## 第 3 步｜Netlify 连接 GitHub 并部署
1. 打开 https://app.netlify.com ，用 GitHub 登录。
2. Add new project → Import an existing project → GitHub。
3. 授权时选 **Only select repositories**，只选 `guanchen-v2`。
4. 选 `guanchen-v2`。设置会自动从 `netlify.toml` 读取（Base directory `engine`、Publish `engine/public`、Functions `engine/netlify/functions`），**不要改**。
5. Project name 可填 `guanchen-preview`（网址会是 `https://guanchen-preview.netlify.app`，名字被占用就换一个）。
6. 按 Deploy。
- 预期：几分钟后状态变成 **Published**；Functions 页面看到 `reading`、`time-estimate` 两个函数。
- 不要：不要加环境变量、不要绑定自己的域名、不要升级付费方案。

## 第 4 步｜检查线上结果
1. 浏览器打开你的网址，应显示「观辰 · 网站建设中」。
2. PowerShell：
```
cd D:\GUANCHEN_V2
node tests\p5_live_check.mjs https://你的网址.netlify.app
```
- 预期：`P5_LIVE PASS: 6/6`（线上和你电脑上的结果逐字节相同，旧接口没有被部署）。
- 如果失败：把这个输出，以及 Netlify 的 Deploys → 最新一次 → Deploy log（全部复制）发给 Claude。

## 之后
每次 Claude 改动、你跑 RUN_TESTS PASS，并**经你同意**后，才执行 `git add -A`、`git commit`、`git push`；Netlify 会自动重新部署。
