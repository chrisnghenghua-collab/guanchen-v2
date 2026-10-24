# 观辰 API v2 说明｜2026-10-22

全新接口，与 GPT 时期的旧接口（`/api/result`、`GUANCHEN_PRODUCT_RESULT_REQUEST`）完全无关。旧接口在上线前移除。

## 端点
`POST /api/v2/reading`，`Content-Type: application/json`，请求体上限 16 KB。
程序位置：`engine\netlify\functions\reading.mjs` → `engine\api\http-handler.mjs` → `engine\api\reading-service.mjs`。

## 请求
```json
{
  "version": 2,
  "birth": { "date": "1990-03-14", "time": "15:20", "gender": "MALE", "location": "吉隆坡" },
  "context": { "CAREER_JOB_CHANGE": "INTERVIEWING", "CAREER_NEW_OPPORTUNITY": "SWITCH_FIELD" }
}
```
- `date`：公历 `YYYY-MM-DD`，1900–2100 年。
- `time`：出生地当地钟表时间 `HH:mm`；不知道就填 `null`（目前回传「需要出生时间」，反推时辰功能在 P4）。
- `gender`：`MALE` / `FEMALE`。
- `location`：地点 id、中文城市名或别名均可（如 `tw_north_taipei`、`台北`、`臺北`、`Taipei`），必须在 `locations.v2.json` 的 142 个地点之内。
- `context`（可选）：
  - `CAREER_JOB_CHANGE`：`STABLE_CONSIDERING` 只是在考虑／`SEARCHING` 已经在找／`INTERVIEWING` 正在面试／`OFFER_RECEIVED` 已收到 Offer／`WANT_TO_LEAVE` 很想离开／`RESTRUCTURING` 公司在重组或裁员／`RESIGNATION_DECIDED` 已决定辞职
  - `CAREER_NEW_OPPORTUNITY`：`SAME_FIELD_UP` 同领域往上／`SWITCH_FIELD` 转换行业或职能／`SMALL_OR_STARTUP` 新创或小团队／`PAY_UP_UNCLEAR` 待遇好但内容不清楚／`INTERNAL_MOVE` 公司内部调动／`PARTNER_PROJECT` 合作或合伙
- 「现在时间」由服务器自动取当前时间（出生地时区）。`asOf` 字段只供测试使用。

## 回应（200）
```text
apiVersion, input{date,time,gender,location{id,name,timezone},asOf}, notice（全局免责）, timeKnown
chart:
  pillars{year,month,day,hour}, trueSolarTime, dayMaster{stem,element,yinYang,image}, season, strength,
  structure{label,stage,uncertain}, tenGods{stems{年,月,时}, branchMain{年,月,日,时}}, families{比劫,食伤,财星,官杀,印星→明显/适中/偏弱/几乎没有},
  elements{木火土金水}, luck{direction 顺行/逆行, startAge, dayun[12]{pillar,startDate,startAge}, current, annual},
  overview[3]{term,plain}  ← 命盘总览页用（日主、主导十神、格局），各题里的同类依据可默认折叠
domains[4] { domain, label（事业／财运／感情与关系／身心节奏）, questions[] }
  question: { id, question, available, conclusion, basis[≤5]{term 专业说法, plain 白话}, advice[≤3], reminder }
            或 { id, question, available:false, unavailableReason }（目前只有：未起运时的未来6个月/12个月）
```
时辰未知：`timeKnown:false, chart:null, domains:[], message`。
使用推测时辰：请求加 `estimate:{label,percent}`（此时 `birth.time` 必须有值），回应多一个 `timeEstimated{label,percent,message}`，页面须显示该提醒。

## 推测时辰：`/api/v2/time-estimate`（P4 V1）
- `GET`：回传 `questions[12]{id,question,options[]{value,label}}`（问卷 V2：H01–H12，选项 A–D 与「不确定，跳过」SKIP）、`intro`（作答提示）、`periods[10]{id,label}`、`findExactHint`（先建议查出生证明等）。`value`/`id` 是程序用的代号，不显示给用户。
- `POST`：`{version:2, birth:{date,gender,location}, period, around?, answers?{题目id:选项value}, asOf?}`
  - `period`：MIDNIGHT 半夜、EARLY_MORNING 凌晨、DAWN 清晨、MORNING 上午、NOON 中午、AFTERNOON 下午、DUSK 傍晚、EVENING 晚上、AROUND「我知道大约几点」（加 `around:"HH:MM"`，前后各 1 小时）、UNKNOWN 完全不知道。
  - 回应：`candidates[]{rank,label 例如「申时（壬申）」,civilRange,fillTime,percent,dayPillar,recommended}`（`recommended` 为前 2 名）、`questions[]`（**还没回答且能区分候选的题**，按区分力排序；为空表示问完了）、`candidateCount`、`reminder`、`note`、可能的 `cannotNarrow`。
- 流程：选时段 → 逐题回答（每答一题再 POST 一次，拿下一题）→ 显示前 2 名和百分比 → 用户点选 → 用 `fillTime` 填进 `birth.time`，并带 `estimate:{label,percent}` 调用 `/api/v2/reading`。
- 百分比是**相对可能性**，不是准确率；永远不显示 100% 确定。
- 错误（400）：`INVALID_PERIOD` `INVALID_AROUND` `INVALID_ANSWERS` `NO_CANDIDATES`，以及与 reading 相同的出生资料错误；reading 的 `INVALID_ESTIMATE`。

## 建议的呈现方式（UI 阶段定稿）
总览页每题只显示「结论」→ 点进去显示「结论 + 建议」→「看命盘依据」默认收起 → 提醒放底部小字。

## 使用统计：`/api/v2/stats`（P8-1，2026-10-24）
- 只记次数，不记任何个人资料（无 IP、无出生资料、无 cookie、无识别码）。事件：`visit`（每次打开网页）、`reading`（成功显示命盘）、`quiz`（开始推测时辰问卷）、`period`（每个命盘第一次点进大运或流年详细页）。
- `POST {"event":"reading"}` → `{"ok":true}`；其他内容一律 400 `INVALID_EVENT`。`GET` → `{"total":{visit,reading,quiz,period}}`；`GET ?days=N`（最多 90）另附每日表（马来西亚时间）。GET 可被 CDN 快取 60 秒。
- 储存：Netlify Blobs，正式站用 `gc-stats`，预览与分支部署用 `gc-stats-preview`（测试不会灌水）。并发写入用「比对后写入」重试，不会漏记。规则在 `engine\api\stats-service.mjs`，检查 `tests\p8_stats_check.mjs`。
- 网页底部公开显示「观辰已为大家排盘 N 次 · 访问 M 人次」（Chris 决定）；完整表格在 `/stats.html`。

## 错误
`{ "error": { "code", "field", "message"（中文，可直接显示） } }`
- 400：`INVALID_DATE` `INVALID_TIME` `GENDER_REQUIRED` `LOCATION_REQUIRED` `LOCATION_NOT_SUPPORTED` `DATE_OUT_OF_RANGE` `INVALID_CONTEXT` `UNKNOWN_FIELD` `UNSUPPORTED_VERSION` `INVALID_BIRTH` `INVALID_BODY` `INVALID_JSON` `INVALID_ASOF`
- 422：`BIRTH_TIME_AMBIGUOUS`（夏令时结束，同一钟点出现两次）、`BIRTH_TIME_NOT_EXIST`（夏令时开始，钟点被跳过）
- 404 / 405 / 413 / 415，以及 500 `INTERNAL`（不外泄内部信息）
所有回应：`Cache-Control: no-store`、`X-Content-Type-Options: nosniff`，不设 Cookie。

## 测试
`tests\v2_api.mjs`（42 项，经由真实 HTTP，含推测时辰 E-01～E-08）；预期值 `tests\golden\v2_chart_expected.json` 只记录**计算结果**（四柱、真太阳时、大运等），不含文案，所以修改文案表不会让测试失败。
