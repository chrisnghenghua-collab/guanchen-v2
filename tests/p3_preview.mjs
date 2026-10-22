// Prints v2 interpretations for given charts (default: sample charts A and B) so copy can be reviewed. Read-only.
import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const E = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'engine');
const imp = rel => import(pathToFileURL(path.join(E, rel)).href);
const svc = await imp('legacy/server/result-request/production-result-service.mjs');
const { buildChartFacts } = await imp('interpretation/facts.mjs'); const { loadCopy } = await imp('interpretation/copy.mjs'); const { GENERATORS, QUESTION_TEXT } = await imp('interpretation/questions.mjs');
const t = loadCopy(new URL(pathToFileURL(path.join(E, 'interpretation/copy/zh-CN.csv')).href));
const mk = (date, time, gender, location) => ({requestType:'GUANCHEN_PRODUCT_RESULT_REQUEST',requestVersion:'1.0.0',birth:{calendar:'GREGORIAN',date,timeKnowledge:'KNOWN',time,gender,location},asOfLocal:'2026-10-22T12:00:00+08:00'});
const charts = [['A', mk('1990-03-14','15:20','MALE','my_west_kuala_lumpur')], ['B', mk('1985-09-27','08:10','FEMALE','sg_singapore')]];
const TITLE = QUESTION_TEXT;
const only = process.argv[2]; const ctx = process.argv[3] ?? 'NONE';
for (const [tag, req] of charts) {
  const f = buildChartFacts(svc.composeProductionInputs(req));
  console.log(`\n################ ${tag} 盘：${req.birth.date} ${req.birth.time} ${req.birth.location} ${req.birth.gender === 'MALE' ? '男' : '女'}｜${Object.values(f.pillars).join(' ')}`);
  for (const [id, gen] of Object.entries(GENERATORS)) {
    if (only && only !== id) continue;
    const a = gen(f, t, ctx);
    console.log(`\n【${TITLE[id]}】`);
    console.log(`结论：${a.conclusion}`);
    console.log('命盘依据：'); for (const b of a.basis) console.log(`  · ${b.term}\n    ${b.plain}`);
    console.log('建议：'); a.advice.forEach((x, i) => console.log(`  ${i + 1}. ${x}`));
    console.log(`提醒：${a.reminder}`);
  }
}
