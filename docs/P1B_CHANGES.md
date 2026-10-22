# P1-b 变更清单（2026-10-22）

目的：解除"改一个字就无法部署／报错"的冻结锁，**不改变任何对外输出**。
验证：`tests\http_regression.mjs` 32/32 PASS，30 个返回结果与 GC-WEB-11 Windows 记录逐字节相同（GOLDEN_BYTE_IDENTICAL = PASS）。

## 修改的文件（4 个）
| 文件 | 改动 |
|---|---|
| `src/step04A1CanonicalInterpretationAssembly.mjs` | 移除 `shaFile`（读取源码算哈希）；每题内部记录的两个哈希字段改为 `null`（从不输出）；移除 A0 哈希锁；内部自检改为只检查路径字段存在 |
| `src/step04A2PublicSerializationBoundary.mjs` | 移除 `shaFile` 与 A1 哈希锁（`assertA1Frozen` 改为空操作） |
| `src/step04A3AvailabilityStateSemantics.mjs` | 移除 `shaFile` 与 A2 哈希锁（`assertA2Frozen` 改为空操作；这把锁原本要读取 2 份 STEP04_A2 JSON） |
| `netlify/functions/result.mjs` | 入口由 `./_shared/repo/...`（S6/S7 拷贝目录）改为 `../../server/http/result-request-handler.mjs`；`includedFiles` 指向引擎目录（**Netlify 实际打包在 P5 验证**） |

## 删除的文件（20 个，原仓库 D:\GUANCHEN_WEB\repo 根目录都保留着完全相同的副本）
18 份 `*_FINAL_GATE_V*.json`，以及 `STEP04_A2_PUBLIC_PRODUCT_PAYLOAD_V102.json`、`STEP04_A2_SERIALIZATION_AND_PUBLIC_CONSUMER_BOUNDARY_V102.json`。删除前已逐一核对，与归档副本的哈希相同。

## 实测证明
- 删除 20 份 JSON 后，运行时不再读取任何引擎外部文件（只读取地点数据 `packages/step01-production-core/data/location57.v1.json` 和模块本身）。
- 在一份副本里修改「投资风格」的文案，输出随即改变，不再报错。

## 仍保留但不再生效的代码（P3 重构时一并清理）
- 各模块里的 `EXPECTED_*` 常量、`run…Authority()` / `audit…()` 自检函数：不在生产路径上；若被调用，会因找不到已删除的历史文件而报错。
- 测试工具：`tests\http_regression.mjs` 改为经由 Netlify 入口调用（`netlify/functions/result.mjs` 默认导出）。
