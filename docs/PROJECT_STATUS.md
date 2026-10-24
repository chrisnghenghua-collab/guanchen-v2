# 观辰 GUANCHEN V2｜项目状态（单一权威）

最后更新：2026-10-23｜维护：Claude（与 Chris 共同决定）

## 1. 位置与权威
- **主工作区（唯一权威）：`D:\GUANCHEN_V2`**
- **只读归档：`D:\GUANCHEN_WEB\repo`**（master @ `67d45035`，工作区 non-clean 原样保留，不再修改）
- 其他旧资料（`D:\GUANCHEN_WEB\handoff`、`authority`、`00_START_HERE`，`D:\GUANCHEN_BASELINES`，`D:\GC_RESEARCH`）：只作历史参考。2026-10-21 盘点确认，这些位置**没有任何计算或解读代码在仓库之外**（其中只有旧 UI 版本、套用/校验脚本和 Horosa 研究资料）。
- 旧 ChatGPT 交接文件只作背景，与本文件冲突时以本文件和实际运行结果为准。

## 2. 目录
| 目录 | 内容 |
|---|---|
| `engine\` | 计算与解读核心（地点数据：`packages\step01-production-core\data\locations.v2.json`，142 个地点）：P1-a 从归档仓库逐字节复制 82 个运行时文件（清单见 `docs\P1A_COPY_MANIFEST.txt`）；P1-b 删除其中 20 份已退役的验收 JSON，修改 4 个文件（见 `docs\P1B_CHANGES.md`）；另含 4 个依赖包（astronomy-engine 2.1.19、moment 2.31.0、moment-timezone 0.6.3、tyme4ts 1.5.2） |
| `reference\input-contract\` | 出生资料校验、57 个地点、时区区间、结果校验器（无界面），供未来 UI 使用 |
| `reference\netlify.toml.original` | 旧部署配置，P5 时参考 |
| `tests\` | `http_regression.mjs`：32 个真实 HTTP 用例；`golden\gc11_expected.json`：GC-WEB-11 Windows 运行的逐字节预期 |
| `docs\` | 本文件与复制清单 |
| `engine\legacy\` | 旧接口（`netlify\functions\result.mjs`）及只被它使用的 32 个文件；**不部署**，只给 RUN_TESTS 第 5 步「旧接口计算守卫」使用（2026-10-23 P5 移入） |
| `engine\public\` | 正式网站：`index.html`、`assets\app.js`（全部画面）、`assets\scene.js`（星空山水）、`assets\zh-tw.js`＋`zh-tw-data.json`（繁体转换）、`stats.html`、`404.html`、标志与分享图（P6–P8） |
| `netlify.toml`、`.gitignore` | 部署设置（部署 `/api/v2/reading`、`/api/v2/time-estimate`、`/api/v2/stats`；安全标头含 Content-Security-Policy）；上传 GitHub 时排除 node_modules、测试日志 |
| `tools\` | 本机预览 `dev_server.mjs`；地点表 `gen_public_locations.py`；文案追加 `copy_add.py`；繁体表 `gen_zh_tw.py`＋`zh_tw_overrides.tsv`（命理用语覆盖）＋`opencc\`（OpenCC 词库，Apache-2.0） |

**未搬入（留在归档里）：** 旧 UI（app.js / index.html / styles.css / 背景图）、根目录 1197 个过程文件、`web/a5` 证据、200 个旧脚本、旧测试、构建输出、S6/S7 哈希打包流程。

## 3. 如何验证（任何改动前后都跑一次）
双击 `RUN_TESTS.cmd`，会依次跑 10 项：①新接口 v2（42 项，含推测时辰与 P7 各栏位）②解读质量（500 盘 × 20 题）③Chris 的 10 组真太阳时资料 ④约 1600 盘的独立计算交叉核对 ⑤旧接口计算守卫（`engine\legacy\`，确认计算核心没被动到）⑥推测时辰模型检查 ⑦网站档案（地点表同步、页面档案、只连自家 API、不在浏览器储存资料）⑧专业命盘表对照 tyme4ts ⑨匿名统计 ⑩繁体转换。部署后另跑 `node tests\p5_live_check.mjs <网址>`（11 项），确认线上结果与本机逐字节相同。
预期结果：最后一行显示 `RESULT: PASS`。如果某个改动**有意**改变输出（例如文案改写），需要先经 Chris 批准，再更新 golden，并在下方变更记录中写明原因。

## 4. 阶段
| 阶段 | 状态 | 证据 |
|---|---|---|
| GC-WEB-11 本机真实 HTTP | **PASS**（2026-10-20） | GC11_REPORT_20261020_231934：32/32，原仓库未改动 |
| P1-a 精简复制 | **PASS**（2026-10-21） | 82 个文件 + 4 个依赖包的哈希 0 处不符；32/32 PASS，30/30 与 GC-11 逐字节相同 |
| P1-b 解冻 | **PASS**（2026-10-22） | 自我哈希锁移除，20 份验收 JSON 删除，Netlify 入口直接指向引擎；32/32 PASS，30/30 仍逐字节相同；编辑文案已实测可生效 |
| P2 计算核对 | **PASS**（2026-10-22） | 独立交叉核对 1454 盘：1404 盘一致，0 处真正不一致；Chris 的 10 组 Swiss Ephemeris 资料 10/10 一致；P2-01、D-01（子初换日）、D-02（142 个地点含台港澳）均已完成（见 `docs\P2_CALC_REPORT.md`） |
| P3 文案重建 | **进行中**：P3-1 命盘事实层、P3-2 写法（Chris 已认可）、P3-3 全部 20 题完成；文案表 672 条；500 盘检查每题最多一个结论占比 7%～35%，无重复、无外露代码（`docs\P3_SAMPLES_GENERATED.txt`）。P3-4（2026-10-22）：按 Chris 决定，**不沿用旧接口，另建全新 API v2** `/api/v2/reading`（`docs\API_V2.md`），31/31 测试通过。**P3 收口**：RUN_TESTS 5 项在 Chris 的 Windows Node 24 上全部 PASS（2026-10-22 23:37） | 判断与文案分离；文案表由 Chris 可直接编辑；先做 2～3 题样稿；「换工作」「新机会」改写为中立立场并设计所需输入 |
| P4 时辰不详 | **V1 完成（2026-10-23 Chris Windows RUN_TESTS 6/6 PASS）**（`docs\P4_TIME_UNKNOWN_EVAL.md` 第六节、`docs\API_V2.md`） | 问卷反推：选时段 → 逐题回答 → 前 2 名候选 + 百分比 → 点选自动填入。模拟：知道时段前 2 名 99%；完全不知道 67–90%（乱猜 15%）。真实准确度未验证 |
| P5 Netlify 预览 | **PASS（2026-10-23）**：`https://guanchen-preview.netlify.app`（2026-10-24 改名为 guanchen-bazi）；线上检查 `tests\p5_live_check.mjs` 6/6——问卷、排盘、推测时辰、错误输入与本机逐字节相同，旧接口未部署；GitHub 私有仓库 `chrisnghenghua-collab/guanchen-v2`。临时诊断（探针函数、诊断开关）已移除 | 部署要点：函数包不可含 .ts（Netlify 打包会覆盖入口）；须带 `package.json`；astronomy-engine 以 CommonJS 版加载（Netlify 运行环境不猜模块格式）；以后改动先跑 RUN_TESTS（第 1 步已模拟 Netlify 的严格加载） |
| P6 UI | **P6-1 完成于本机（2026-10-23，简体全流程，待 Chris 本机预览与 RUN_TESTS）**；方向：A 夜观（B 级：背景 3D 粒子空间 + 平面玻璃文字面板） | Chris 决定：手机优先、电脑并用；只做简体与繁体；四柱字按五行着色（木绿、火朱、土黄、金白、水蓝）并附图例；输入页尽量点选（日期/时间选择器、出生地按国家与地区点选）；隐约水墨山水、金色光感、星点光源（不可过于明显）。粒子：银河式旋转、自由飘动、随机闪烁、流星；手机实测 60fps / 4000 粒子。设计稿：claude.ai「观辰 P6 界面方向」画布；粒子试作：「观辰粒子试作」 |
| P7 专业命盘 | **P7-1 计算层完成（2026-10-23，本机）**；**P7-2 喜用神完成（2026-10-24，本机，Chris 已认可样稿）**；**P7-3 大运流年详解完成（2026-10-24，本机，Chris 已认可）**；**P7-4 结果页模块完成（2026-10-24，Chris 在电脑与手机审查认可）**；全部完成并经 Chris 在网页审查后才上传 | Chris 决定：命盘表补齐（精筛、不堆解释）；神煞 36 个（主流软件惯例，`docs\P7_SHENSHA.md`）；喜用神扶抑为主、调候为辅；结果页模块化（命盘表／五行与喜用神／十神／神煞／大运／流年／四大主题），默认只显示结论；命盘表下加干支关系；不加命宫身宫胎元；大运、流年点选后看大纲与注意事项 |
| P8 上线前完善 | **正式上线（2026-10-24 14:39）**：commit `c690b2c`（main）；预览 `p8-preview` 11/11 → 正式站 `https://guanchen-preview.netlify.app` 线上检查 11/11 PASS；Chris Windows RUN_TESTS 10/10 PASS | Chris 决定：先免费上线，深度内容日后收费（月费或逐项开通再定）；访问人数在网页底部公开显示；繁体用台湾正体；星级（不用百分比）的每日运势放下一版。P8-1 匿名统计、P8-2 说明与隐私页、P8-3 分享图卡、P8-4 繁体、P8-5 全盘检查（安全标头、404、旧浏览器相容、线上检查扩充） |

## 5. 已证实的事实
- 计算核心可用，结果确定、可重复；Windows Node 24 与 Linux Node 22 输出一致。
- V1 中「换工作」「新机会」两题因缺少现实背景而固定为 UNAVAILABLE（`question-admission.mjs` 的设计）→ KNOWN 盘为 18/20 可用。
- 未起大运时，11 项依赖大运的题目为 UNAVAILABLE。PARTIAL/UNKNOWN 时不出任何柱，20 项全部 UNAVAILABLE。
- **冻结机制（P1-b 实测后更正）**：真正挡住改动的有两层。①构建层：Netlify 构建时执行 S6/S7 打包，把 773 个文件的总哈希与「安全权威」中写死的值比对，**任何文件改一个字，构建就失败**；②模块层：A1/A2/A3 组装模块在运行时读取自身和上一层的源码与 JSON 来比对哈希。解读引擎本身的文案在运行时其实不会被拒，但改了就无法部署。两层都已在 V2 中移除（V2 不再使用 S6/S7）。
- **文案问题（8 个命盘实测）**：同题直接回答只有 1～5 种写法（投资风格 8 人全部相同）；回答内部有重复句；解释不提及本人命盘；依据只以英文代码出现（8 盘共 1786 条）。

## 6. 决策记录
- 2026-10-22 Chris：上线平台为 Netlify（免费为主）；GitHub 已有账号，评估是否使用 → Claude 建议 P5 前建私有仓库。
- 2026-10-22 Chris：不沿用旧网站接口，全新建立 → API v2。
- 2026-10-22 Chris 决定 P3 方向：语气口语、直接、温和提醒、有逻辑；命盘依据分两行（专业说法 + 白话解释）；同意重新设计判断逻辑；每题一句提醒，通用免责放产品说明页；换工作／新机会补现实背景输入。
- 2026-10-22 Chris 批准并已完成：P2-01（大运由 8 步改为 12 步）。
- 2026-10-22 Chris 决定并已完成：D-01 子初换日（真太阳时 23:00 起为次日子时，日柱同步切换，不分早晚子时；流派差异只在产品说明页标注）。
- 2026-10-22 Chris 决定并已完成：D-02 地区范围为中国全国（按方向分区）、台湾、香港、澳门、马来西亚、新加坡 → 地点目录扩充为 142 个。
- UI 阶段待办：产品说明页标注子时流派差异；前端地点表从 `locations.v2.json` 重新生成（L-04）；夏令时空档或重叠时段的输入提示（L-03）。
- 2026-10-21 Chris 批准：新建精简工作区，旧仓库只读归档；旧 UI 不搬；解冻文案层；不再逐文件冻结和做哈希，保留单一权威、禁止危险 Git 操作、改生产前先批准。
- 2026-10-22 Chris：「换工作」「新机会」两题**保留**，但内容改为不站在引导换工作／接受新机会的立场，且说明不能变得更模糊 → P3 处理；需要补一两个现实背景输入（代码要求，否则题目不可用）。
- 2026-10-22 Chris 提议：时辰不详时，用问卷式题目反推时辰，给出 2 个候选时辰，再由用户二选一或给出推荐 → P4 评估。Claude 初步意见：可行，但必须标示为「推测时辰」，不可当作真实时辰；建议两份候选盘都显示，由用户判断，而不是由系统替用户选定。

## 7. 规则（精简版）
1. 本文件是唯一权威；每完成一个阶段就更新本文件。
2. 归档仓库只读：不 reset、clean、add .、commit。
3. 任何改变输出的改动：先说明影响，Chris 批准后再做，并更新 golden 和变更记录。
4. 每次改动前后都跑 `RUN_TESTS.cmd`。
5. 部署 / 上线需要 Chris 明确授权。

## 8. 变更记录
- 2026-10-22 API v2：新增 `engine\api\`（reading-service.mjs、http-handler.mjs）、`engine\netlify\functions\reading.mjs`、`tests\v2_api.mjs`、`tests\golden\v2_chart_expected.json`、`tools\copy_add.py`（只新增、不覆盖文案）；文案表新增 29 条（全局免责、错误提示、命盘总览）。旧接口未改动。
- 2026-10-23 P7-1 计算层：新增 `engine\interpretation\pro-chart.mjs`，API 回应新增 `chart.pro`（四柱：天干十神、藏干及十神、纳音、星运、自坐、旬空、空亡标记、36 神煞；日柱空亡；干支关系；12 步大运与流年的十神）。`tests\p7_pro_check.mjs`（RUN_TESTS 第 8 步）：纳音/旬空 60、十二长生 120、藏干 12、十神 100 全部与 tyme4ts 一致，另含神煞教科书案例。v2 预期值：原有项目 0 处改变，新增 `.pro` 项目。纳音「沙中金」采主流写法。原有计算与解读未改动。
- 2026-10-24 P7-2 喜用神：新增 `engine\interpretation\yongshen.mjs`，API 回应新增 `chart.fiveElements`（旺相休囚死；用神、喜神、忌神及其十神类别；调候：冬需火、夏需水，与扶抑一致／冲突／作辅助；原局不见用神的提示；中和平手或极端偏旺偏弱的盘标为「仅供参考」）。文字 19 行 `ys.*` 加入 zh-CN.csv。随机 400 盘：标为仅供参考 100 盘（25%），可能从格 9 盘。v2 预期值：原有项目（含 `.pro`）0 处改变，新增 `.ys` 项目。RUN_TESTS 8 步在本机虚拟环境全部通过。原有计算与解读未改动。
- 2026-10-24 P7-3 大运流年详解：新增 `engine\interpretation\periods.mjs`，API 回应新增 `chart.periods`（每步大运：起止年份与周岁、六种基调〔顺势/渐顺/起伏/平稳/蓄力/守成，按喜用神判断〕、前五年看天干后五年看地支的大纲、与原局冲刑害合的注意事项；每步下 10 个流年：基调、今年重点、岁运冲／天克地冲、太岁〔值冲刑害破〕、丧门吊客、10 个流年神煞、留意月份与顺手月份〔按节气，含公历起止日〕；18 岁以前用成长用语；感情句只在 18–60 岁出现）。`pro-chart.mjs` 新增 `shenshaOnBranch`（原有输出不变）。文字 91 行 `pd.*`。随机 400 盘全部正常，单次约 0.1 秒、约 77 KB。v2 预期值：原有项目 0 处改变，新增 `.pd`。RUN_TESTS 8 步在本机虚拟环境通过。
- 2026-10-24 P7-4 结果页模块：`engine\public\assets\app.js`／`app.css` 结果页改为模块（顶部固定导航：命盘·五行·十神·神煞·大运·流年·主题）。命盘表含主星、天干、地支、藏干十神、纳音、星运、自坐、空亡（落空标示），下方干支关系；五行分布＋旺相休囚死＋用喜忌＋取用说明（点开）；十神五类强弱＋命盘依据（点开）；神煞按柱分组、四类颜色，点选看一句话说明；大运列表与当前大运卡，点入大运页（大纲、注意事项、十年流年）；流年卡与十年流年格，点入流年页（大纲、注意事项、流年神煞、留意／顺手月份），可前后翻页，返回时回到原位置。API 新增 `chart.glossary`（本盘出现的神煞的一句话说明，文字 36 行 `ssg.*`，`pro-chart.mjs` 新增 `SHENSHA_GROUP`）；v2 预期值原有项目 0 处改变，新增 `.gl`。另：本机 app.js 补回问卷开头说明（之前漏同步的一行）。
- 2026-10-24 品牌标志与分享预览：Chris 选定 Logo A「辰印」（「辰」字印章＋右上星，字形取自 Noto Serif SC Bold〔OFL 授权〕并转为路径）。`engine\public` 新增 favicon.svg、favicon-32.png、apple-touch-icon.png、icon-192/512.png、og-image.jpg（1200×630）、site.webmanifest；index.html 新增描述、图示与分享预览标签（网址暂定 https://guanchen-preview.netlify.app，上线前须与实际网址一致）；页首「观辰」旁加小标志。Chris 审查结果页：电脑与手机均认可。Netlify 免费额度剩 95 点（11 月 6 日重置；正式上线每次 15 点，预览 0 点；额度用完会暂停帐号下全部网站）→ 决定 logo 与 P6/P7 合并为一次正式上线。
- 2026-10-24 P8-1 匿名使用统计：`engine\api\stats-service.mjs`＋`engine\netlify\functions\stats.mjs`（Netlify Blobs，新依赖 `@netlify/blobs` 10.7.11），网页底部公开显示排盘与访问次数，`/stats.html` 看每日表。只记次数；网页仍不在浏览器储存任何东西（原本用浏览器记「今天已计」，被第 7 步检查拦下后改为每次打开计一次）。`tests\p8_stats_check.mjs`（第 9 步）：计数、50 个同时写入不漏、拒绝异常输入、马来西亚日期、只回传次数。本机预览用内存计数，不碰正式数字。
- 2026-10-24 P8-2 说明与隐私页：时间换算（真太阳时、历史时区）、子初换日与流派差异、大运起运（三天折一年）、解读方法、隐私、繁体来源、使用提醒；内容逐项对照引擎程序。输入页与结果页底部有入口。
- 2026-10-24 P8-3 分享图卡：在浏览器内画出 1080×1350 图卡（四柱、日主格局、用喜、当前大运与今年流年、网址），不上传、不显示出生日期时间地点；手机可直接分享，电脑下载。
- 2026-10-24 P8-4 繁体（台湾正体）：网页在浏览器内转换（API 与计算不变），顶部「繁體／简体」切换，台港澳浏览器自动繁体，选择记在网址 `?lang=tw`。转换链同 OpenCC s2twp；`tools\zh_tw_overrides.tsv` 覆盖命理用语（丑、干不转；冲在命理语境为「沖」，一般动词为「衝」；斗湖、划算、是只、组织里、了解等）。`tests\p8_tw_check.mjs`（第 10 步）：干支不变、39 个校订词、60 盘＋问卷＋页面全部转换且再转不变、词表与文案同步。
- 2026-10-24 P8-5 全盘检查：安全标头（Content-Security-Policy、Permissions-Policy）在浏览器全流程测试无违规；`stats.html` 的脚本移到独立档；新增 `404.html`；繁体转换改用旧版 Safari 也支持的写法；`global.time_unknown` 文案更新（问卷已上线）；线上检查 `tests\p5_live_check.mjs` 扩充为 11 项（页面档案、安全标头、统计、404；不会增加正式次数）。未做：three.js 的完整性哈希（cdnjs 在两边环境都连不上，日后补）。
- 2026-10-24 Chris 确认正式网址 `https://guanchen-preview.netlify.app`，并决定开放搜索引擎收录：首页移除 noindex，加 canonical 与简繁 hreflang，新增 `robots.txt`（不收录 /stats.html 与 /api/）、`sitemap.xml`；统计页与 404 页仍不收录。Chris 的 Windows RUN_TESTS 10/10 PASS（2026-10-24 13:53）。
- 2026-10-24 14:39 **正式上线**：先推分支 `p8-preview`（分支预览，不扣点）→ 预览线上检查 11/11、Chris 电脑与手机确认可排盘 → `git merge --ff-only` 到 main（`c690b2c`）→ 正式站线上检查 11/11 PASS；首页已开放收录、分享标签生效。Netlify 点数 95 → 约 80（下次重置 11 月 6 日）。注意：以后只改文件说明的提交请在说明里加 `[skip ci]`，避免再扣上线点数。
- 2026-10-24 P8.1：①网址改为 `https://guanchen-bazi.netlify.app`（Chris 决定，不带 preview；`guanchen` 已被他人使用）：index.html 的分享标签、canonical、hreflang，robots.txt、sitemap.xml 同步更新；Netlify 项目改名后旧网址 guanchen-preview 失效。②three.js r128 加完整性指纹（SRI sha512）：Chris 电脑从 cdnjs 下载的档案与 npm 官方套件 three@0.128.0 逐字节相同后才采用；线上检查新增 L-12（每次核对 cdnjs 档案仍与指纹一致）。
- 2026-10-23 P4 问卷 V2（Chris 提供并自测）：12 题、选项直接对应时支、心性题权重 0.4 / 事件题 0.6；题目、对应与计分照 Chris 版本，只润色措辞（文案表新增 61 行）。Chris 样本 → 申时第一、巳时第二，与其测试一致。模拟：不知道时辰前 2 名 93–99%。详见 `docs\P4_TIME_UNKNOWN_EVAL.md` 第七节（含待决定的「子、戌时最高分较低」问题）。网页问卷开头显示作答提示。
- 2026-10-23 P6-1 修正（Chris）：结果页不再保留本命星光核（会挡住资料）。改为第三种状态「融入自然」：结果出现时，粒子幻化融入山体山脊、远方星空、山前水流与空中飘动的光点（中速）；本命星只在排盘加载画面短暂出现。山线流光速度调为中速。粒子试作页改为直接载入网站的 `scene.js`。Chris 确认「这下可以了」：背景视觉定稿。
- 2026-10-23 P6-1 正式网页（简体）：`engine\public\index.html`、`assets\app.js`（流程：输入 → 问卷/候选 → 本命星 → 命盘总览 → 单题）、`assets\scene.js`（由已核可的粒子试作 v5 移植：星盘、本命星汇聚（弹簧惯性）、星云爆发、四层线描山水、山线流光；不支持 WebGL 时改用静态背景，「减少动态效果」时不播放动画）、`assets\app.css`；`data\locations.json` 由 `tools\gen_public_locations.py` 从 locations.v2.json 生成（142 地点）；本机预览 `tools\dev_server.mjs`；新测试 `tests\p6_public_check.mjs`（RUN_TESTS 第 7 步）。试作最终版存档 `docs\design\particle_prototype_v5.html`。浏览器端到端（手机尺寸）：校验提示、出生地选择、排盘、单题、补充现况更新建议、分页、返回、不知道时辰问卷 → 候选 → 推测时辰提醒、时段选择，全部正常。网页不在浏览器储存任何出生资料。计算与 API 未改动。
- 2026-10-23 P6 粒子定稿：弹簧回弹的本命星（光核 + 五行光环）、星云爆发散开、山水从虚空浮现、山线流光；四层山水。Chris 确认「可以了」。
- 2026-10-23 P6：Chris 选定 A 夜观；首版粒子试作手机 60fps / 4000 粒子稳定；要求加入宇宙空间感、自由飘动、闪烁星点（第二版试作已加入）。
- 2026-10-23 **P5 PASS**：fix 6 部署后 `P5_LIVE PASS: 6/6`。收尾：删除临时探针函数 `diag-probe.mjs` 与两个函数入口的诊断开关；删除本机临时文件夹 `_tmp_claude`、`engine\.netlify`（均未上传）。
- 2026-10-23 P5 fix 5 上线后：函数已能启动（500 而非 502），诊断显示 `Unexpected token 'export'`。原因：astronomy-engine 的 ESM 版 `esm/astronomy.js` 没有 `"type": "module"` 标记，只在 Node 会「猜格式」时可用；Netlify 运行环境不猜。本机以 `--no-experimental-detect-module` 重现。修正：`solarTerms.mjs`、`astronomyEquationOfTime.mjs` 改用 `createRequire` 明确加载同一库同版本（2.1.19）的 CommonJS 版。验证：关闭格式猜测下 v2 42/42、10/10；交叉核对 1574/0、旧接口逐字节、P3、P4 PASS；函数包经 Netlify 启动程序、关闭格式猜测执行 4/4 与本机逐字节相同。`RUN_TESTS` 第 1 步改为关闭格式猜测执行，防止再犯。
- 2026-10-23 P5 **恢复**：在 Chris 本机用 `netlify build --offline`（@netlify/build 37.6.0，与服务器同版）重现打包。**根本原因**：函数包里只要有 .ts 文件，Netlify 打包工具就会自行转换并写错位置，把函数入口 `time-estimate.mjs`、`reading.mjs` 覆盖成 `trueSolarTime.ts` 的转换结果，其余 .ts 从包中消失——昨晚 4 种错误全由此而来。**修正**：引擎 15 个 .ts 用 Node 自带 `stripTypeScriptTypes`（与 Node 运行 .ts 时相同的去类型步骤）转为 .mjs，原 .ts 删除，5 个文件的引用由 `.ts` 改为 `.mjs`；`netlify.toml` 注释更正（先前把问题归咎于 nft 是误判）。**验证**：本机全部测试 PASS 且 golden 逐字节相同（v2 42/42、10/10、交叉核对 1574/0、旧接口逐字节、P3 分布、P4 模型、P3 事实层）；重新打包后函数包内 0 个 .ts、入口完好；以 Netlify 自己的启动程序在本机执行两个函数包，4 个请求与本机引擎**逐字节相同**（PACKAGE_CHECK PASS）。
- 2026-10-23 P5 **暂停**（Chris 提出，Claude 同意）：连续 4 次部署修正未达成 PASS（错误依次变化：CommonJS 具名导出 → handler is not a function → 缺 package.json → Unexpected token 'export'）。依规则停止「改一点、部署一次」，改为先在本机重建 Netlify 的打包结果作为唯一排查基线，本机通过后才再部署。当前线上：首页正常、旧接口未部署、两个新接口 502（无人使用）；GitHub main @ fix 4；本机测试全部 PASS，计算未受影响。
- 2026-10-23 P5 探针结果：线上 Node v24.21.0；引擎文件与四个库都已带上，但函数包根目录**没有 `package.json`**，引擎加载失败（`ruleAuthority.ts does not provide an export named 'BA_ZI_RULE_AUTHORITY'`：没有 `"type": "module"`，.ts 被当成 CommonJS）。修正：`netlify.toml` 的 `included_files` 加入 `package.json`。
- 2026-10-23 P5 排查：第三次部署记录显示 `0 new function(s) to upload`（`nft` 设定从未生效，fix 2/3 的函数包相同），部署完成后 30 秒的测试有效，仍为 `handler is not a function`。用 Netlify 官方打包工具（zip-it-and-ship-it，Chris 本机）检查 5 个入口版本：全部判为新式（v2）；用其启动程序在本机模拟执行，包括真实引擎：全部正常。结论：代码本身没问题，差异在 Netlify 服务器上实际生成的函数包。新增**临时**探针函数 `/api/v2/diag-probe`（须带 `x-guanchen-diag: 1`，否则 404），回报线上函数包内容与引擎能否加载；P5 通过后移除。
- 2026-10-23 P5 第三次修正：第二次修正部署后，模块已能加载，但出现 `handler is not a function`——`node_bundler = "nft"` 使 Netlify 把函数当成旧式（v1）函数。移除该行，恢复默认打包；引擎改为运行时加载后已不会被合并。
- 2026-10-23 P5 第二次修正（`node_bundler = "nft"` 未生效，函数仍被合并成一个文件、仍 502）：①两个函数入口改为运行时按计算出的路径加载引擎（打包工具无法合并），引擎文件经 `included_files` 原样带上；②计算核心三个文件（`astronomyEquationOfTime.ts`、`solarTerms.ts`、`lunarCalendar.ts`）只改第一行的库引用方式，使 astronomy-engine / tyme4ts 不论以 ES module 或 CommonJS 加载都能取得同一组函数；计算逻辑未改。证明：v2 42/42（golden 逐字节相同）、10/10、交叉核对 1574 一致 0 不一致、旧接口逐字节相同、P3 分布、P4 模型均 PASS。③**临时**诊断：请求带 `x-guanchen-diag: 1` 时，500 回应附上错误首行（`diag`），P5 通过后移除。
- 2026-10-23 P5 Netlify 第一次部署：首页正常、旧接口确认未部署；两个函数 502（Netlify 默认打包把引擎合成一个文件，astronomy-engine 被当成 CommonJS 加载：`Named export 'Body' not found`）。网站一开始有访客限制（401），Chris 已在该项目改为公开。修正：`netlify.toml` 加 `node_bundler = "nft"`（不打包，保持原目录结构）并列出四个依赖库；程序代码未改。
- 2026-10-23 P5 GitHub：首次上传 main @ `f04fc79`。Windows 上 Git 登录小窗口（SkiaSharp）无法打开，改用浏览器登录：`credential.guiPrompt false`、`credential.gitHubAuthModes browser`（全局设定）。
- 2026-10-23 P5 准备（Chris 批准）：①隐私：A 样本（历史固定资料）原为真人出生资料，B 为虚构；两者均换成虚构资料（A：1990-03-14 15:20 吉隆坡 男；B：1985-09-27 08:10 新加坡 女），涉及 `tests\http_regression.mjs`、`v2_api.mjs`、`p3_preview.mjs`、`engine\src\step05A2…`（已移入 legacy）、`docs\API_V2.md`；`docs\P3_SAMPLES.md` 删去 A 盘出生资料、四柱与三段命盘依据；`P3_SAMPLES_GENERATED.txt` 用新样本重新生成。golden：`gc11_expected.json` 只更新 HTTP-01a/01b/07a/07b/07c 五项（换资料前一刻在 Chris Windows 上逐字节 PASS），`v2_chart_expected.json` 更新 V2-01a/01b；原因写在两个文件内。计算引擎未改动。②旧接口 `result.mjs` 与只被它使用的 32 个文件（含未被引用的 `_shared\astronomy-compat.mjs`）移入 `engine\legacy\`，自动改写相对路径；新接口实际使用的 43 个文件不动。③新增 `netlify.toml`、`.gitignore`、`engine\public\index.html`（建设中，noindex）、`tests\p5_live_check.mjs`；两个函数出错时在 Netlify 后台记录错误（不传给用户）。④上传前扫描：无密钥、token、证书、.env；无真人出生资料。
- 2026-10-23 P4 V1：新增 `engine\api\time-estimate.mjs`（推测时辰）、`/api/v2/time-estimate` 入口（`engine\netlify\functions\time-estimate.mjs`）；`/api/v2/reading` 接受 `estimate` 并回传 `timeEstimated` 提醒；文案表新增 estimate.* 等行（以 `tools\copy_add.py` 追加，未重生成整份）。测试：`v2_api.mjs` 31→42 项；新增 `p4_estimate_eval.mjs` 为 RUN_TESTS 第 6 步。版本 2.0.0-p4。删除写入中断留下的空文件 `http-handler.mjs.part`（经 Chris 授权删除权限）。计算部分未改动。
- 2026-10-22 P3-3：`engine\interpretation\questions\`（career / wealth / relationship / wellbeing 四个文件）完成全部 20 题；facts.mjs 新增未来 13 个节气月（与引擎月柱 0 处不一致）和下一流年；换工作 8 种现况、新机会 7 种类型。自审修正：财富机会误把流年写成大运、带冲刑月份被选为好时机、恢复方式「放」配上「补」的活动、关系题提醒措辞。对外接口仍未改动（回归测试逐字节相同）。
- 自 2026-10-22 起，`engine\interpretation\copy\zh-CN.csv` 是文案的唯一权威，Chris 可直接编辑；Claude 之后只在这份表上做定点修改，不再整份重新生成。
- 2026-10-22 P3-1/P3-2：新增 `engine\interpretation\`（facts.mjs 命盘事实层、copy.mjs 文案表读取、questions.mjs 生成器、copy\zh-CN.csv 文案表）及 `tests\p3_facts_check.mjs`、`p3_preview.mjs`、`p3_distribution.mjs`。对外接口未改动（回归测试逐字节相同）。
- 2026-10-22 D-01：子初换日（`dayHour.ts`、`ruleAuthority.ts`）；golden 只更新 HTTP-01d 一项（原因记录在 golden 文件内）。D-02：地点目录改为 `locations.v2.json`（142 个地点），`facade.mjs` 和 `request-validation.mjs` 改读新文件；原有地点输出逐字节不变。`RUN_TESTS.cmd` 合并三项测试。
- 2026-10-22 P2-01：`facade.mjs` 大运 8→12 步，`timing-root.mjs` 交接点改按实际步数；32/32 逐字节相同；600 盘修复前后比对 558 相同、41 盘由被拒变为正常、1 盘修正了被错误标为不可用的题目。新增 `tests\p2_user_cases.mjs`。
- 2026-10-22 P2 第一轮：新增 `tests\p2_calc_crosscheck.mjs`（独立交叉核对）；引擎未改动。
- 2026-10-22 P1-b：移除自我哈希锁（A1/A2/A3），删除 20 份退役 JSON，Netlify 入口改为直接指向引擎，回归测试改为经由 Netlify 入口；32/32、30/30 逐字节相同。
- 2026-10-21 P1-a：建立 V2，逐字节复制，回归测试 32/32、30/30 逐字节相同。
