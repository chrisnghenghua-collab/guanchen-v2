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
| `engine\public\` | 网站静态页（目前只有「建设中」首页，P6 换成正式界面） |
| `netlify.toml`、`.gitignore` | 部署设置（只部署 `/api/v2/reading`、`/api/v2/time-estimate`）；上传 GitHub 时排除 node_modules、测试日志 |

**未搬入（留在归档里）：** 旧 UI（app.js / index.html / styles.css / 背景图）、根目录 1197 个过程文件、`web/a5` 证据、200 个旧脚本、旧测试、构建输出、S6/S7 哈希打包流程。

## 3. 如何验证（任何改动前后都跑一次）
双击 `RUN_TESTS.cmd`，会依次跑 6 项：①新接口 v2（42 项，含推测时辰）②解读质量（500 盘 × 20 题）③Chris 的 10 组真太阳时资料 ④约 1600 盘的独立计算交叉核对 ⑤旧接口计算守卫（`engine\legacy\`，确认计算核心没被动到）⑥推测时辰模型检查。部署后另跑 `node tests\p5_live_check.mjs <网址>`，确认线上结果与本机逐字节相同。
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
| P5 Netlify 预览 | **进行中**（2026-10-23 Chris 批准）：本地准备完成（真人样本资料已换成虚构、旧接口移入 `engine\legacy\`、`netlify.toml`、`.gitignore`、建设中首页、`tests\p5_live_check.mjs`）；GitHub 私有仓库 `chrisnghenghua-collab/guanchen-v2` 已上传（2026-10-23，main @ `f04fc79`，114 个文件）；待 Netlify 连接部署 | Netlify 新网站默认 Node 24（2026-07 起）；部署设置已加 `NODE_VERSION=24` |
| P6 UI | 待办（最后做） | 呈现建议：总览只显示结论 → 点开看结论与建议 → 「命盘依据」默认收起；日主与格局依据放命盘总览页 |

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
