// 观辰 · website (P6-1, Simplified Chinese; P7-4 modular result page 2026-10-24). Plain ES module, no build step.
// Screens: input → (quiz → cands) → loading (natal star) → result (命盘/五行/十神/神煞/大运/流年/主题) → detail | dayun → year. Talks only to /api/v2/reading and /api/v2/time-estimate.
import { createScene } from './scene.js';
import { makeConverter } from './zh-tw.js';

// ---------- constants ----------
const EL_OF = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
  寅: '木', 卯: '木', 巳: '火', 午: '火', 辰: '土', 戌: '土', 丑: '土', 未: '土', 申: '金', 酉: '金', 亥: '水', 子: '水' };
const ELEMENTS = ['木', '火', '土', '金', '水'];
const PERIODS = [
  ['MIDNIGHT', '半夜', '23:00–01:00'], ['EARLY_MORNING', '凌晨', '01:00–05:00'], ['DAWN', '清晨', '05:00–07:00'], ['MORNING', '上午', '07:00–11:00'],
  ['NOON', '中午', '11:00–13:00'], ['AFTERNOON', '下午', '13:00–17:00'], ['DUSK', '傍晚', '17:00–19:00'], ['EVENING', '晚上', '19:00–23:00']
];
const CONTEXTS = {
  CAREER_JOB_CHANGE: [['STABLE_CONSIDERING', '只是在考虑'], ['SEARCHING', '已经在找'], ['INTERVIEWING', '正在面试'], ['OFFER_RECEIVED', '已收到 Offer'],
    ['WANT_TO_LEAVE', '很想离开'], ['RESTRUCTURING', '公司在重组或裁员'], ['RESIGNATION_DECIDED', '已决定辞职']],
  CAREER_NEW_OPPORTUNITY: [['SAME_FIELD_UP', '同领域往上'], ['SWITCH_FIELD', '转换行业或职能'], ['SMALL_OR_STARTUP', '新创或小团队'], ['PAY_UP_UNCLEAR', '待遇好但内容不清楚'],
    ['INTERNAL_MOVE', '公司内部调动'], ['PARTNER_PROJECT', '合作或合伙']]
};
const PILLAR_KEYS = [['year', '年柱', '年'], ['month', '月柱', '月'], ['day', '日柱', '日'], ['hour', '时柱', '时']];
const NUM = ['一', '二', '三', '四', '五'];
const MIN_STAR_MS = 1800;   // let the natal star form before the result appears
const NET_ERROR = '连不上服务器，请检查网络后再试一次。';

// ---------- state ----------
const state = {
  screen: 'input',
  form: { date: '', timeMode: 'exact', time: '', period: null, around: '', gender: null, location: null, locationName: '' },
  est: null,          // { answers, data, loading, firstCount }
  reading: null, lastBirth: null, estimateMark: null, context: {},
  tab: 0, detail: null, pd: null, ssOpen: null, error: '', busy: false, resultY: 0,
  locations: null, sheet: null, sheetCountry: 'MY',
  stats: null, periodCounted: false
};

// ---------- scene ----------
const mobile = matchMedia('(pointer: coarse)').matches || innerWidth < 700;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
let scene = null;
try { if (!window.THREE) throw new Error('no three'); scene = createScene(document.getElementById('scene'), { mobile, reduce }); }
catch { document.body.classList.add('no-webgl'); }
const SCENE_MODE = { loading: 'star', result: 'nature', detail: 'nature', dayun: 'nature', year: 'nature' };   // other screens: the star chart

// ---------- helpers ----------
const app = document.getElementById('app'), sheetRoot = document.getElementById('sheet-root');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const colored = s => [...s].map(ch => `<span class="el-${EL_OF[ch] || ''}">${esc(ch)}</span>`).join('');
function fmtDate(d) { if (!d) return ''; const [y, m, day] = d.split('-'); return `${+y} 年 ${+m} 月 ${+day} 日`; }
function fmtTime(t) { if (!t) return ''; const [h, m] = t.split(':').map(Number); const tag = h < 5 ? '凌晨' : h < 12 ? '上午' : h < 13 ? '中午' : h < 18 ? '下午' : '晚上'; return `${tag} ${h % 12 || 12}:${String(m).padStart(2, '0')}`; }
const back = `<button class="back" data-act="back" aria-label="返回"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>`;
const chevron = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>`;

async function post(path, body) {
  let res;
  try { res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }
  catch { throw new Error(NET_ERROR); }
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error?.message || '系统暂时无法排盘，请稍后再试。');
  return json;
}

// ---------- anonymous usage counters (P8-1): events only, never birth data ----------
function count(event) {
  try { fetch('/api/v2/stats', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event }), keepalive: true }).catch(() => {}); } catch { /* counting must never break the page */ }
}
async function loadStats() {
  try { const r = await fetch('/api/v2/stats'); if (r.ok) { state.stats = (await r.json()).total; if (['input', 'result'].includes(state.screen)) render(); } } catch { /* no line shown */ }
}
const nf = n => Number(n || 0).toLocaleString('en-US');
function statsLine() {
  const t = state.stats; if (!t || !(t.reading > 0)) return '';
  return `<p class="statsline">观辰已为大家排盘 <b>${nf(t.reading)}</b> 次${t.visit > 0 ? ` · 访问 <b>${nf(t.visit)}</b> 人次` : ''}</p>`;
}

// ---------- 繁体中文 (P8-4, 2026-10-24): the page is written in Simplified Chinese and converted in the browser ----------
// Only text nodes and a few text attributes are converted (never data-* values, which the page uses as keys). The table is
// downloaded only when 繁體 is chosen. The choice lives in the address (?lang=tw), not in browser storage.
let LANG = 'cn', toTW = null, twFonts = false;
const L = t => (LANG === 'tw' && toTW ? toTW(t) : t);
function detectLang() {
  const q = new URLSearchParams(location.search).get('lang'); if (q === 'tw' || q === 'cn') return q;
  return (navigator.languages || [navigator.language || '']).some(l => /^zh-(TW|HK|MO|Hant)/i.test(l)) ? 'tw' : 'cn';
}
function loadTWFonts() {
  if (twFonts) return; twFonts = true;
  const l = document.createElement('link'); l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500&family=Noto+Serif+TC:wght@500;700&display=swap';
  document.head.appendChild(l);
}
async function setLang(l, { save = true } = {}) {
  if (l === 'tw' && !toTW) {
    try { toTW = makeConverter(await (await fetch('assets/zh-tw-data.json')).json()); } catch { l = 'cn'; state.error = NET_ERROR; }
  }
  LANG = l;
  document.documentElement.lang = l === 'tw' ? 'zh-Hant-TW' : 'zh-CN';
  document.documentElement.classList.toggle('tw', l === 'tw');
  if (l === 'tw') loadTWFonts();
  if (save) { const u = new URL(location.href); u.searchParams.set('lang', l); history.replaceState(history.state, '', u); }
  render(); if (state.sheet) renderSheet();
}
function convertDom(root) {
  if (LANG !== 'tw' || !toTW) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) n.nodeValue = toTW(n.nodeValue);
  root.querySelectorAll('[aria-label],[alt],[title]').forEach(e => { for (const a of ['aria-label', 'alt', 'title']) if (e.hasAttribute(a)) e.setAttribute(a, toTW(e.getAttribute(a))); });
}
const langBtn = () => `<button class="chip langbtn" data-act="lang" aria-label="切换简体／繁体">${LANG === 'tw' ? '简体' : '繁體'}</button>`;

// ---------- navigation ----------
const snap = () => ({ screen: state.screen, detail: state.detail, tab: state.tab, pd: state.pd });
function go(screen, { push = true } = {}) {
  if (state.screen === 'result') state.resultY = window.scrollY;   // come back to the same place in the result page
  state.screen = screen; state.error = '';
  if (push) history.pushState(snap(), '');
  render(); window.scrollTo(0, 0);
}
const RESULT_LIKE = ['result', 'detail', 'dayun', 'year'];
addEventListener('popstate', e => {
  closeSheet();
  const s = e.state || { screen: 'input' };
  if (RESULT_LIKE.includes(s.screen) && !state.reading) { state.screen = 'input'; }
  else if ((s.screen === 'quiz' || s.screen === 'cands') && !state.est) { state.screen = 'input'; }
  else { state.screen = s.screen === 'loading' ? 'input' : s.screen; if (s.detail) state.detail = s.detail; if (s.tab != null) state.tab = s.tab; if (s.pd) state.pd = s.pd; }
  render(); window.scrollTo(0, state.screen === 'result' ? state.resultY : 0);
});

// ---------- screens ----------
function screenInput() {
  const f = state.form;
  let timeBody = '';
  if (f.timeMode === 'exact') {
    timeBody = `<label class="row sub"><span class="v ${f.time ? '' : 'empty'}">${f.time ? `${esc(fmtTime(f.time))} <span class="muted small">${esc(f.time)}</span>` : '选择时间'}</span><span class="sub-note">出生地当地时间</span>
      <input class="native" type="time" data-field="time" value="${esc(f.time)}" aria-label="出生时间"></label>`;
  } else if (f.timeMode === 'approx') {
    const p = PERIODS.find(x => x[0] === f.period);
    const txt = f.period === 'AROUND' && f.around ? `大约 ${esc(f.around)}（前后一小时）` : p ? `${p[1]}（${p[2]}）` : '选择大约时段';
    timeBody = `<button class="row sub" data-act="sheet" data-v="period"><span class="v ${f.period ? '' : 'empty'}">${txt}</span>${chevron}</button>`;
  } else {
    timeBody = `<div class="small">接下来会问你几个关于自己的小问题，推测最可能的时辰。</div>`;
  }
  return `<section class="screen">
    <div class="bar"><div class="brand"><img src="favicon.svg" alt="" width="26" height="26">观辰</div>${langBtn()}</div>
    <div class="hero"><h1>仰观星辰<br>细看自己的节奏</h1><p>输入出生资料，排出你的八字命盘，看事业、财运、关系与身心的倾向。</p></div>
    <form class="glass form" data-act-submit="submit" novalidate>
      <label class="row ${state.error && !f.date ? 'invalid' : ''}"><span class="k">出生日期</span><span class="v ${f.date ? '' : 'empty'}">${f.date ? esc(fmtDate(f.date)) : '选择日期'} ${chevron}</span>
        <input class="native" type="date" min="1900-01-01" max="2100-12-31" data-field="date" value="${esc(f.date)}" aria-label="出生日期"></label>
      <div class="timebox">
        <div class="head"><span class="label">出生时间</span>
          <div class="seg" role="group" aria-label="出生时间的准确程度">
            ${[['exact', '准确时间'], ['approx', '大约时段'], ['unknown', '不知道']].map(([v, l]) => `<button type="button" class="chip" data-act="timeMode" data-v="${v}" aria-pressed="${f.timeMode === v}">${l}</button>`).join('')}
          </div></div>
        ${timeBody}
      </div>
      <div class="pair">
        <div class="toggle" role="group" aria-label="性别">
          <button type="button" data-act="gender" data-v="MALE" aria-pressed="${f.gender === 'MALE'}">男</button>
          <button type="button" data-act="gender" data-v="FEMALE" aria-pressed="${f.gender === 'FEMALE'}">女</button>
        </div>
        <button type="button" class="row" data-act="sheet" data-v="location"><span class="k">出生地</span><span class="v ${f.location ? '' : 'empty'}">${f.location ? esc(f.locationName) : '选择'}</span></button>
      </div>
      <div class="error" role="alert">${esc(state.error)}</div>
      <button class="cta" type="submit" ${state.busy ? 'disabled' : ''}>开始排盘</button>
      <p class="small" style="margin:0;text-align:center">全部点选即可 · 会按出生地换算真太阳时 · 资料不会被保存</p>
    </form>
    ${statsLine()}
    <div style="text-align:center">${aboutLink}</div>
  </section>`;
}

function screenQuiz() {
  const e = state.est, d = e.data;
  const answered = Object.keys(e.answers).length;
  const remaining = d ? d.questions.length : 1;
  const pct = Math.round(answered / Math.max(1, answered + remaining) * 100);
  const q = d && d.questions[0];
  const top = d ? d.candidates.filter(c => c.recommended) : [];
  const periodName = state.form.timeMode === 'unknown' ? '完全不知道' : state.form.period === 'AROUND' ? `大约 ${state.form.around}` : (PERIODS.find(p => p[0] === state.form.period) || [])[1];
  return `<section class="screen">
    <div class="bar">${back}<div class="bar-title">推测出生时辰</div></div>
    <div style="display:flex;flex-direction:column;gap:8px">
      <div class="small" style="display:flex;justify-content:space-between"><span>${d ? `第 ${answered + 1} 题 · 大约还有 ${remaining} 题` : '准备题目中…'}</span><span>时段：${esc(periodName || '')}</span></div>
      <div class="progress"><i style="width:${pct}%"></i></div>
    </div>
    ${answered === 0 && d?.intro ? `<p class="small" style="margin:0">${esc(d.intro)}</p>` : ''}
    ${q ? `<div class="glass qcard"><h2>${esc(q.question)}</h2><div class="opts">
        ${q.options.map(o => `<button class="opt ${o.value === 'SKIP' ? 'skip' : ''}" data-act="answer" data-q="${esc(q.id)}" data-v="${esc(o.value)}" ${e.loading ? 'disabled' : ''}>${esc(o.label)}</button>`).join('')}
      </div></div>` : `<div class="glass"><p style="margin:0" class="muted">${e.loading ? '正在推算…' : ''}</p></div>`}
    <div class="error" role="alert">${esc(state.error)}</div>
    ${top.length ? `<div class="soft" style="border-style:dashed;border-color:rgba(226,192,120,.45)">
      <div class="label" style="margin-bottom:8px">目前最可能的时辰</div>
      <div class="cands">${top.map(c => `<div><b>${esc(c.label.split('（')[0])}</b><span class="pct">${c.percent}%</span></div>`).join('')}</div>
      <button class="cta ghost" style="margin-top:12px;min-height:44px" data-act="showCands">直接看结果</button>
    </div>` : ''}
    <p class="small" style="margin-top:auto">${esc(d?.reminder || '')}</p>
  </section>`;
}

function screenCands() {
  const d = state.est.data, top = d.candidates.filter(c => c.recommended), rest = d.candidates.filter(c => !c.recommended);
  const name = c => { const [a, b] = c.label.split('（'); return `${esc(a)}<small>（${esc(b || '')}</small>`; };
  return `<section class="screen">
    <div class="bar">${back}<div class="bar-title">推测结果</div></div>
    <div><h1 style="font-size:22px;line-height:1.5">最可能是这两个时辰</h1>
      <p class="muted" style="margin:6px 0 0;font-size:13px">根据你的 ${d.answered} 个回答。点选一个，就会用它来排盘。</p></div>
    ${d.cannotNarrow ? `<div class="banner">${esc(d.cannotNarrow)}</div>` : ''}
    ${top.map((c, i) => `<button class="cand ${i === 0 ? 'top' : ''}" data-act="pickCand" data-label="${esc(c.label)}">
        <div style="display:flex;justify-content:space-between;align-items:baseline"><span class="name">${name(c)}</span><span class="pct" style="font-size:22px">${c.percent}%</span></div>
        <div class="meterbar"><i style="width:${Math.min(100, c.percent)}%"></i></div>
        <div class="small">当地钟点约 ${esc(c.civilRange)} · 点选使用这个时辰</div></button>`).join('')}
    ${rest.length ? `<div class="others">${rest.map(c => `<button data-act="pickCand" data-label="${esc(c.label)}">${esc(c.label.split('（')[0])} ${c.percent}%</button>`).join('')}</div>` : ''}
    <div class="error" role="alert">${esc(state.error)}</div>
    <p class="small" style="margin-top:auto">${esc(d.reminder)}</p>
  </section>`;
}

function screenLoading() {
  return `<section class="loading" aria-live="polite"><div class="msg">命盘显现中</div><div class="small">按出生地换算真太阳时 · 排四柱 · 推大运</div></section>`;
}

const SECTIONS = [['chart', '命盘'], ['wx', '五行'], ['sg', '十神'], ['ss', '神煞'], ['dy', '大运'], ['ln', '流年'], ['zt', '主题']];
const LEVEL_W = { 几乎没有: 4, 偏弱: 34, 适中: 62, 明显: 92 };
const tone = (key, label) => `<span class="tone tone-${esc(key)}">${esc(label)}</span>`;
const elPill = x => `<span class="pill"><b class="el-${x.element}">${esc(x.element)}</b>${esc(x.family)}</span>`;
const mod = (id, title, aside, body) => `<section class="mod" id="sec-${id}"><div class="mod-h"><h2>${esc(title)}</h2>${aside ? `<span class="small">${aside}</span>` : ''}</div>${body}</section>`;
const monthLine = m => { const k = m.indexOf('：'); return k < 0 ? esc(m) : `<b>${esc(m.slice(0, k))}</b><span>${esc(m.slice(k + 1))}</span>`; };

function modChart(c) {
  const R = c.pro.pillars, dm = k => (k === 'day' ? ' dm' : '');
  const row = (label, f, cls = '') => `<div class="rl">${label}</div>${R.map(r => `<div class="${cls}${dm(r.key)}">${f(r)}</div>`).join('')}`;
  const big = ch => `<b class="el-${EL_OF[ch]}">${esc(ch)}</b><span class="el-${EL_OF[ch]}">${EL_OF[ch]}</span>`;
  const table = `<div class="ptab" role="table" aria-label="四柱命盘">
    <div class="rl"></div>${R.map(r => `<div class="hd${dm(r.key)}">${esc(r.label)}</div>`).join('')}
    ${row('主星', r => esc(r.stemGod), 'god')}
    ${row('天干', r => big(r.stem), 'big')}
    ${row('地支', r => big(r.branch), 'big')}
    ${row('藏干', r => r.hidden.map(h => `<div class="hs"><span class="el-${EL_OF[h.stem]}">${esc(h.stem)}</span><small>${esc(h.god)}</small></div>`).join(''), 'hid')}
    ${row('纳音', r => esc(r.nayin))}
    ${row('星运', r => esc(r.starLuck))}
    ${row('自坐', r => esc(r.selfSeat))}
    ${row('空亡', r => `${esc(r.xunkong)}${r.kong ? '<em class="kong">落空</em>' : ''}`)}
  </div>`;
  const rels = c.pro.relations.length ? `<div class="tags">${c.pro.relations.map(x => `<span class="tag">${esc(x)}</span>`).join('')}</div>` : '<div class="small">四柱之间没有明显的冲、合、刑、害。</div>';
  return mod('chart', '命盘', `日柱空亡 ${esc(c.pro.dayKong)}`, `<div class="glass" style="padding:10px 8px">${table}
      <div class="legend">${ELEMENTS.map(n => `<span><i class="bg-${n}"></i>${n}</span>`).join('')}</div></div>
    <div class="soft"><div class="label" style="margin-bottom:8px">干支关系</div>${rels}</div>`);
}

function modWx(c) {
  const y = c.fiveElements, max = Math.max(...ELEMENTS.map(n => c.elements[n] || 0), 0.1);
  const ws = Object.entries(y.wangShuai).map(([k, el]) => `<span><small>${esc(k)}</small><b class="el-${el}">${esc(el)}</b></span>`).join('');
  return mod('wx', '五行与喜用神', `日主${esc(c.dayMaster.stem + c.dayMaster.element)} · ${esc(c.strength)}`, `<div class="soft">
      <div class="bars">${ELEMENTS.map(n => `<div class="b"><span class="el-${n}">${n}</span><div class="t"><i class="bg-${n}" style="width:${(c.elements[n] || 0) / max * 100}%"></i></div><span class="n">${c.elements[n] ?? 0}</span></div>`).join('')}</div>
      <div class="ws" aria-label="旺相休囚死">${ws}</div></div>
    <div class="glass ysbox">
      <div class="ysrow"><span class="k">用神</span>${elPill(y.yong)}${y.uncertain ? '<span class="tone tone-steady">仅供参考</span>' : ''}</div>
      <div class="ysrow"><span class="k">喜神</span>${y.xi.map(elPill).join('')}</div>
      <div class="ysrow"><span class="k">忌神</span>${y.ji.map(elPill).join('')}</div>
      <p class="lead">${esc(y.notes[0] || '')}</p>
      ${y.notes.length > 1 ? `<details class="basis"><summary>看取用说明</summary><div class="blist">${y.notes.slice(1).map(n => `<div class="plain">${esc(n)}</div>`).join('')}<div class="small">取法：${esc(y.method)}</div></div></details>` : `<div class="small">取法：${esc(y.method)}</div>`}
    </div>`);
}

function modSg(c) {
  const o = c.overview;
  return mod('sg', '十神', '', `<div class="soft">
      <div class="bars">${Object.entries(c.families).map(([k, v]) => `<div class="b fam"><span>${esc(k)}</span><div class="t"><i style="width:${LEVEL_W[v] ?? 0}%"></i></div><span class="n">${esc(v)}</span></div>`).join('')}</div>
      <p class="lead">${esc(o[1]?.plain || '')}</p>
      <details class="basis"><summary>看命盘依据（日主、十神、格局）</summary>
        <div class="blist">${o.map(x => `<div><div class="term">${esc(x.term)}</div><div class="plain">${esc(x.plain)}</div></div>`).join('')}</div></details></div>`);
}

function modSs(c) {
  const G = Object.fromEntries((c.glossary?.shensha || []).map(g => [g.name, g]));
  const count = {}; Object.values(G).forEach(g => { count[g.group] = (count[g.group] || 0) + 1; });
  const open = state.ssOpen && G[state.ssOpen];
  const rows = c.pro.pillars.map(r => `<div class="ssrow"><span class="k">${esc(r.label)}</span><div class="chips">${r.shensha.length
    ? r.shensha.map(n => `<button class="sschip g-${esc(G[n]?.group || '')}" data-act="ss" data-v="${esc(n)}" aria-pressed="${state.ssOpen === n}">${esc(n)}</button>`).join('')
    : '<span class="small">—</span>'}</div></div>`).join('');
  return mod('ss', '神煞', Object.entries(count).map(([k, v]) => `${esc(k)} ${v}`).join(' · '), `<div class="soft">${rows}
      ${open ? `<div class="ssnote"><b>${esc(open.name)}</b><span class="small">${esc(open.group)}</span><p>${esc(open.note)}</p></div>` : '<div class="small" style="margin-top:6px">点选神煞看一句话说明。神煞只是辅助参考，轻重仍以五行和十神为主。</div>'}</div>`);
}

function modDy(c) {
  const P = c.periods || [], ci = P.findIndex(d => d.current), D = P[ci >= 0 ? ci : 0];
  if (!D) return '';
  return mod('dy', '大运', `${esc(c.luck.direction)} · 每步十年`, `
    <div class="dayun" role="list">${P.map((d, i) => `<button role="listitem" class="${d.current ? 'now' : ''}" data-act="openDy" data-i="${i}"><b>${colored(d.pillar)}</b><small>${d.ageFrom}–${d.ageTo} 岁</small>${tone(d.tone, d.label)}</button>`).join('')}</div>
    <button class="pcard" data-act="openDy" data-i="${P.indexOf(D)}">
      <div class="top"><span class="small">${ci >= 0 ? '当前大运' : `尚未起运 · 第一步大运`} · ${D.startYear}–${D.endYear}</span>${tone(D.tone, D.label)}</div>
      <div class="gz">${colored(D.pillar)}<span class="small">天干${esc(D.stemGod)} · 地支${esc(D.branchGod)}</span></div>
      <p>${esc(D.outline[0])}</p><span class="more">看大纲与注意事项 ${chevron}</span></button>`);
}

function modLn(c) {
  const P = c.periods || [], D = P.find(d => d.current) || P[0];
  if (!D) return '';
  const Y = D.years.find(y => y.current);
  return mod('ln', '流年', '', `${Y ? `<button class="pcard" data-act="openYr" data-y="${Y.year}">
      <div class="top"><span class="small">今年 · ${Y.year} · ${Y.age} 岁</span>${tone(Y.tone, Y.label)}</div>
      <div class="gz">${colored(Y.pillar)}<span class="small">天干${esc(Y.stemGod)} · 地支${esc(Y.branchGod)}</span></div>
      <p>${esc(Y.outline[0])}</p><p class="warn">${esc(Y.cautions[0])}</p><span class="more">看大纲、注意事项与月份 ${chevron}</span></button>` : ''}
    <div class="label">${esc(D.pillar)}大运的十个流年</div>
    <div class="yrs">${D.years.map(y => `<button class="${y.current ? 'now' : ''}" data-act="openYr" data-y="${y.year}"><span>${y.year}</span><b>${colored(y.pillar)}</b>${tone(y.tone, y.label)}</button>`).join('')}</div>`);
}

function modTopics(r) {
  const dom = r.domains[state.tab] || r.domains[0];
  return mod('zt', '四大主题', '', `<div class="tabs" role="tablist" aria-label="主题">${r.domains.map((d, i) => `<button role="tab" aria-selected="${i === state.tab}" data-act="tab" data-v="${i}">${esc(d.label)}</button>`).join('')}</div>
    <div class="qlist" role="tabpanel">${dom.questions.map(q => q.available
      ? `<button class="qitem" data-act="openQ" data-id="${esc(q.id)}"><div class="q">${esc(q.question)}</div><div class="c">${esc(q.conclusion)}</div></button>`
      : `<div class="qitem na"><div class="q">${esc(q.question)}</div><div class="c">${esc(q.unavailableReason || '')}</div></div>`).join('')}</div>`);
}

function screenResult() {
  const r = state.reading, c = r.chart, inp = r.input;
  const tst = (c.trueSolarTime || '').slice(11, 16);
  return `<section class="screen">
    <div class="bar"><div class="brand"><img src="favicon.svg" alt="" width="26" height="26">观辰</div><div class="barbtns">${langBtn()}<button class="chip" data-act="restart">重新排盘</button></div></div>
    <div class="res-head">
      <div class="meta">${esc(inp.date)} ${esc(inp.time || '')} · ${esc(inp.location.name)} · ${inp.gender === 'MALE' ? '男' : '女'}${tst ? ` · 真太阳时 ${esc(tst)}` : ''}</div>
      <h1>${esc(c.dayMaster.stem + c.dayMaster.element)}日主 · ${esc(c.structure.label)}</h1>
      <p>${esc(c.dayMaster.image)}</p>
    </div>
    ${r.timeEstimated ? `<div class="banner">${esc(r.timeEstimated.message)}</div>` : ''}
    <button class="cta ghost sharebtn" data-act="share">分享命盘图卡</button>
    <nav class="secnav" aria-label="命盘模块">${SECTIONS.map(([id, l]) => `<button class="chip" data-act="jump" data-v="${id}">${l}</button>`).join('')}</nav>
    ${modChart(c)}${modWx(c)}${modSg(c)}${modSs(c)}${modDy(c)}${modLn(c)}${modTopics(r)}
    <p class="notice">${esc(r.notice)} ${aboutLink}</p>
    ${statsLine()}
  </section>`;
}

const noteList = arr => `<ul class="notes">${arr.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
function screenDayun() {
  const P = state.reading.chart.periods, i = state.pd?.d ?? -1, d = P[i];
  if (!d) return screenResult();
  const prev = P[i - 1], next = P[i + 1];
  return `<section class="screen">
    <div class="bar">${back}<div class="bar-meta">大运 · 第 ${i + 1} / ${P.length} 步</div></div>
    <div class="phead"><div class="gzbig">${colored(d.pillar)}</div><div class="info"><h1>${esc(d.pillar)}大运</h1>
      <div class="small">${d.startYear}–${d.endYear} · ${d.ageFrom}–${d.ageTo} 岁<br>天干${esc(d.stemGod)} · 地支${esc(d.branchGod)}</div></div>${tone(d.tone, d.label)}</div>
    ${d.current ? '<div class="banner">你目前正走这步大运。</div>' : ''}
    <div class="conclusion"><div class="label" style="color:var(--gold-text);letter-spacing:.15em">大纲</div>${d.outline.map(x => `<p>${esc(x)}</p>`).join('')}</div>
    <div class="soft"><div class="label" style="letter-spacing:.15em;margin-bottom:8px">注意事项</div>${noteList(d.cautions)}</div>
    <div class="label">这十年的流年 · 点选看详细</div>
    <div class="ylist">${d.years.map(y => `<button class="yrow ${y.current ? 'now' : ''}" data-act="openYr" data-y="${y.year}"><span class="yy">${y.year}</span><b>${colored(y.pillar)}</b><span class="small">${y.age} 岁</span>${tone(y.tone, y.label)}${chevron}</button>`).join('')}</div>
    <div class="pair">
      ${prev ? `<button class="cta ghost" data-act="openDy" data-i="${i - 1}" data-replace="1">上一步 ${esc(prev.pillar)}</button>` : '<span></span>'}
      ${next ? `<button class="cta ghost" data-act="openDy" data-i="${i + 1}" data-replace="1">下一步 ${esc(next.pillar)}</button>` : '<span></span>'}
    </div>
    <p class="reminder">${esc(state.reading.notice)}</p>
  </section>`;
}
function findYear(year) {
  const P = state.reading.chart.periods;
  for (let i = 0; i < P.length; i++) { const y = P[i].years.find(x => x.year === year); if (y) return { d: P[i], i, y }; }
  return null;
}
function screenYear() {
  const hit = findYear(state.pd?.y); if (!hit) return screenResult();
  const { d, y } = hit, prev = findYear(y.year - 1), next = findYear(y.year + 1), m = y.months;
  return `<section class="screen">
    <div class="bar">${back}<div class="bar-meta">流年 · ${esc(d.pillar)}大运</div></div>
    <div class="phead"><div class="gzbig">${colored(y.pillar)}</div><div class="info"><h1>${y.year} ${esc(y.pillar)}年</h1>
      <div class="small">${y.age} 岁 · ${esc(d.pillar)}大运<br>天干${esc(y.stemGod)} · 地支${esc(y.branchGod)}</div></div>${tone(y.tone, y.label)}</div>
    ${y.current ? '<div class="banner">这是今年的流年。</div>' : ''}
    <div class="conclusion"><div class="label" style="color:var(--gold-text);letter-spacing:.15em">大纲</div>${y.outline.map(x => `<p>${esc(x)}</p>`).join('')}</div>
    <div class="soft"><div class="label" style="letter-spacing:.15em;margin-bottom:8px">注意事项</div>${noteList(y.cautions)}
      ${y.tags.length ? `<div class="label" style="margin:12px 0 6px">流年神煞</div><div class="blist">${y.tags.map(t => `<div class="plain"><b class="gold">${esc(t.name)}</b>　${esc(t.note)}</div>`).join('')}</div>` : ''}</div>
    <div class="soft"><div class="label" style="letter-spacing:.15em;margin-bottom:8px">月份</div>
      <div class="mgroup"><div class="mh warn">留意月份</div>${m.watch.length ? m.watch.map(x => `<div class="mline">${monthLine(x)}</div>`).join('') : '<div class="small">没有特别需要留意的月份。</div>'}</div>
      <div class="mgroup"><div class="mh good">顺手月份</div>${m.good.length ? m.good.map(x => `<div class="mline">${monthLine(x)}</div>`).join('') : '<div class="small">没有特别顺手的月份，按步调来即可。</div>'}</div>
      <div class="small" style="margin-top:8px">月份按节气划分，日期为出生地当地时间。</div></div>
    <div class="pair">
      ${prev ? `<button class="cta ghost" data-act="openYr" data-y="${y.year - 1}" data-replace="1">${y.year - 1} ${esc(prev.y.pillar)}</button>` : '<span></span>'}
      ${next ? `<button class="cta ghost" data-act="openYr" data-y="${y.year + 1}" data-replace="1">${y.year + 1} ${esc(next.y.pillar)}</button>` : '<span></span>'}
    </div>
    <p class="reminder">${esc(state.reading.notice)}</p>
  </section>`;
}

function findQ(id) {
  for (const d of state.reading.domains) { const i = d.questions.findIndex(q => q.id === id); if (i >= 0) return { d, q: d.questions[i], i }; }
  return null;
}
function screenDetail() {
  const hit = findQ(state.detail); if (!hit) return screenResult();
  const { d, q, i } = hit, list = d.questions.filter(x => x.available), li = list.findIndex(x => x.id === q.id);
  const prev = list[li - 1], next = list[li + 1];
  const ctx = CONTEXTS[q.id];
  return `<section class="screen">
    <div class="bar">${back}<div class="bar-meta">${esc(d.label)} · ${li + 1} / ${list.length}</div></div>
    <h1 class="dtitle">${esc(q.question)}</h1>
    <div class="conclusion"><div class="label" style="color:var(--gold-text);letter-spacing:.15em">结论</div><p>${esc(q.conclusion)}</p></div>
    <div class="soft"><div class="label" style="letter-spacing:.15em;margin-bottom:10px">建议</div>
      <div class="advice">${q.advice.map((a, k) => `<div class="a"><span>${NUM[k] || k + 1}</span><span>${esc(a)}</span></div>`).join('')}</div>
      ${ctx ? `<div style="margin-top:14px;display:flex;flex-direction:column;gap:8px"><div class="ctx-label">补充你的现况，建议会更具体：</div>
        <div class="chips">${ctx.map(([v, l]) => `<button class="chip" data-act="ctx" data-id="${q.id}" data-v="${v}" aria-pressed="${state.context[q.id] === v}" ${state.busy ? 'disabled' : ''}>${l}</button>`).join('')}</div>
        ${state.busy ? '<div class="small">更新中…</div>' : ''}</div>` : ''}
    </div>
    <details class="soft basis"><summary>看命盘依据</summary>
      <div class="blist">${q.basis.map(b => `<div><div class="term">${esc(b.term)}</div><div class="plain">${esc(b.plain)}</div></div>`).join('')}</div></details>
    <div class="error" role="alert">${esc(state.error)}</div>
    <div class="pair">
      ${prev ? `<button class="cta ghost" data-act="openQ" data-id="${prev.id}" data-replace="1">上一题</button>` : '<span></span>'}
      ${next ? `<button class="cta ghost" data-act="openQ" data-id="${next.id}" data-replace="1">下一题</button>` : '<span></span>'}
    </div>
    <p class="reminder">${esc(q.reminder)}</p>
  </section>`;
}

// ---------- 分享图卡 (P8-3, 2026-10-24): drawn in the browser, never uploaded; no birth date/time/place on the card ----------
const EL_HEX = { 木: '#6DBF8B', 火: '#E8735A', 土: '#CFA25A', 金: '#E8E4DA', 水: '#6E98E8' };
const SERIF_SC = "'Noto Serif SC', 'Songti SC', 'STSong', 'SimSun', serif", SANS_SC = "'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif";
let SERIF = SERIF_SC, SANS = SANS_SC;
function loadImg(src) { return new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; }); }
function wrapText(ctx, text, x, y, maxW, lh, maxLines = 2) {
  let line = '', lines = [];
  for (const ch of text) { if (ctx.measureText(line + ch).width > maxW && line) { lines.push(line); line = ch; } else line += ch; }
  if (line) lines.push(line);
  if (lines.length > maxLines) { lines = lines.slice(0, maxLines); lines[maxLines - 1] = lines[maxLines - 1].slice(0, -1) + '…'; }
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lh));
}
async function makeShareCard() {
  const c = state.reading.chart, W = 1080, H = 1350;
  SERIF = LANG === 'tw' ? "'Noto Serif TC', " + SERIF_SC : SERIF_SC; SANS = LANG === 'tw' ? "'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', " + SANS_SC : SANS_SC;
  try { await Promise.all([document.fonts.load(`500 120px ${SERIF}`), document.fonts.load(`400 30px ${SANS}`)]); } catch { /* fall back to system fonts */ }
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d');
  if (LANG === 'tw') { const ft = ctx.fillText.bind(ctx), mt = ctx.measureText.bind(ctx); ctx.fillText = (t, x, y) => ft(L(String(t)), x, y); ctx.measureText = t => mt(L(String(t))); }
  if (!ctx.roundRect) ctx.roundRect = function (x, y, w, h) { this.rect(x, y, w, h); };   // older browsers: square corners
  // night sky
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#18213D'); g.addColorStop(.55, '#0B1022'); g.addColorStop(1, '#070B15');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  let sd = 11; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 260; i++) {
    const x = rnd() * W, y = rnd() * H * .85, big = rnd() < .07, a = .2 + rnd() * .6, r = big ? 2.4 : .6 + rnd() * 1.2;
    if (y > 200 && y < 1120 && x > 70 && x < W - 70) continue;   // keep the text area clean
    ctx.globalAlpha = a; ctx.fillStyle = '#F3E3BC'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // ridges
  // ridges: midpoint displacement with a few broad peaks (same look as the share preview image)
  const ridge = (y0, amp, seed, peaks, fill, line) => {
    sd = seed; const n = 128, pts = new Array(n + 1).fill(0); let step = n, a = amp;
    pts[0] = 40 * (.8 + .4 * rnd()); pts[n] = 40 * (.8 + .4 * rnd());
    while (step > 1) { const h = step / 2; for (let k = h; k < n; k += step) pts[k] = (pts[k - h] + pts[k + h]) / 2 + (rnd() - .5) * a; a *= .55; step = h; }
    for (const [c0, hg, wd] of peaks) for (let k = 0; k <= n; k++) { const d = Math.abs(k / n * W - c0) / wd; if (d < 1) pts[k] += hg * (1 - d) * (1 - d * .35); }
    const path = () => { ctx.beginPath(); ctx.moveTo(0, y0 - pts[0]); pts.forEach((v, k) => ctx.lineTo(k / n * W, y0 - v)); };
    path(); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
    path(); ctx.strokeStyle = line; ctx.lineWidth = 1.6; ctx.lineJoin = 'round'; ctx.stroke();
  };
  ridge(1300, 60, 5, [[800, 70, 260], [980, 50, 150]], '#0E1530', 'rgba(201,168,106,.30)');
  ridge(1325, 40, 19, [[260, 50, 220], [600, 25, 200]], '#0A0F22', 'rgba(201,168,106,.42)');
  ridge(1350, 24, 43, [[900, 22, 240]], '#070B15', 'rgba(201,168,106,.2)');
  // header: logo + name
  try { const logo = await loadImg('favicon.svg'); ctx.drawImage(logo, 80, 70, 92, 92); } catch { /* card still works without the logo */ }
  ctx.textBaseline = 'middle'; ctx.fillStyle = '#F1E6CC'; ctx.font = `700 54px ${SERIF}`; ctx.fillText('观 辰', 196, 118);
  ctx.textAlign = 'right'; ctx.fillStyle = '#B9B3A6'; ctx.font = `400 28px ${SANS}`; ctx.fillText('八字命盘', W - 80, 118); ctx.textAlign = 'left';
  // title + image
  ctx.textAlign = 'center'; ctx.fillStyle = '#ECE6D8'; ctx.font = `500 64px ${SERIF}`; ctx.fillText(`${c.dayMaster.stem}${c.dayMaster.element}日主 · ${c.structure.label}`, W / 2, 270);
  ctx.fillStyle = '#B9B3A6'; ctx.font = `400 30px ${SANS}`; wrapText(ctx, c.dayMaster.image, W / 2, 340, 860, 46);
  // pillars panel
  const px = 80, py = 430, pw = W - 160, ph = 410;
  ctx.fillStyle = 'rgba(12,16,28,.62)'; ctx.strokeStyle = 'rgba(226,192,120,.35)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 36); ctx.fill(); ctx.stroke();
  const R = c.pro.pillars, cw = pw / 4;
  R.forEach((r, i) => {
    const cx = px + cw * i + cw / 2;
    if (r.key === 'day') { ctx.fillStyle = 'rgba(201,168,106,.12)'; ctx.beginPath(); ctx.roundRect(px + cw * i + 10, py + 12, cw - 20, ph - 24, 26); ctx.fill(); }
    ctx.fillStyle = '#9C978C'; ctx.font = `400 26px ${SANS}`; ctx.fillText(r.label, cx, py + 46);
    ctx.fillStyle = '#D8BC82'; ctx.font = `400 28px ${SANS}`; ctx.fillText(r.stemGod, cx, py + 90);
    for (const [ch, y] of [[r.stem, py + 172], [r.branch, py + 296]]) {
      const el = EL_OF[ch]; ctx.fillStyle = EL_HEX[el]; ctx.shadowColor = EL_HEX[el]; ctx.shadowBlur = 26; ctx.font = `500 100px ${SERIF}`; ctx.fillText(ch, cx, y); ctx.shadowBlur = 0;
    }
    ctx.fillStyle = '#B9B3A6'; ctx.font = `400 24px ${SANS}`; ctx.fillText(r.hidden.map(h => h.stem).join(' '), cx, py + 375);
  });
  // 喜用 + 运
  const y5 = c.fiveElements, P = c.periods || [], D = P.find(d => d.current), Y = D?.years.find(y => y.current);
  const rows = [['用神', `${y5.yong.element}（${y5.yong.family}）`, '喜神', y5.xi.map(x => `${x.element}（${x.family}）`).join('、')]];
  if (D) rows.push(['大运', `${D.pillar} · ${D.label}`, Y ? `${Y.year}` : '', Y ? `${Y.pillar} · ${Y.label}` : '']);
  rows.forEach(([k1, v1, k2, v2], i) => {
    const y = 920 + i * 78;
    ctx.textAlign = 'left'; ctx.fillStyle = '#9C978C'; ctx.font = `400 28px ${SANS}`; ctx.fillText(k1, 110, y); if (k2) ctx.fillText(k2, 580, y);
    ctx.fillStyle = '#ECE6D8'; ctx.font = `500 36px ${SERIF}`; ctx.fillText(v1, 196, y); if (v2) ctx.fillText(v2, 680, y);
  });
  // footer
  ctx.textAlign = 'center'; ctx.fillStyle = '#D8BC82'; ctx.font = `500 34px ${SERIF}`; ctx.fillText('仰观星辰　细看自己的节奏', W / 2, 1120);
  ctx.fillStyle = '#B9B3A6'; ctx.font = `400 28px ${SANS}`; ctx.fillText(location.host || '观辰', W / 2, 1172);
  return new Promise(ok => cv.toBlob(ok, 'image/png'));
}
async function openShare() {
  state.sheet = 'share'; state.share = { url: null, file: null, busy: true }; renderSheet();
  try {
    const blob = await makeShareCard();
    if (state.share?.url) URL.revokeObjectURL(state.share.url);
    state.share = { url: URL.createObjectURL(blob), file: new File([blob], 'guanchen.png', { type: 'image/png' }), busy: false };
  } catch { state.share = { url: null, file: null, busy: false, failed: true }; }
  if (state.sheet === 'share') renderSheet();
}
async function shareCard() {
  const f = state.share?.file; if (!f) return;
  try { if (navigator.canShare?.({ files: [f] })) { await navigator.share({ files: [f], title: '观辰 · 我的命盘' }); return; } } catch { return; /* user closed the share panel */ }
  const a = document.createElement('a'); a.href = state.share.url; a.download = 'guanchen.png'; document.body.appendChild(a); a.click(); a.remove();
}

// ---------- 说明页 (P8-2, 2026-10-24): describes exactly what the engine does ----------
const ABOUT = [
  ['观辰是什么', [
    '观辰依据传统八字命理，从你的出生日期、时间、地点与性别排出四柱命盘，再整理成五行喜用、十神神煞、大运流年与四大主题的解读。',
    '这些内容描述的是性格与时运的倾向，帮助你理解自己的节奏，不是对未来的保证。']],
  ['时间怎么换算', [
    '真太阳时：出生地的钟表时间会先按当地经度与当天的均时差（地球公转造成的时差）换算成真太阳时，再用来排时柱。同一钟点在不同城市，时柱可能不同。',
    '历史时区：会按出生当年当地的时区与夏令时规则换算，例如马来西亚 1982 年以前的时区、中国 1986–1991 年的夏令时。',
    '节气：以天文计算求出每个节气的交节时刻。年柱以立春为界，月柱以每月的「节」为界，所以一月出生、立春前出生的人，年柱属于前一年。']],
  ['子时与换日', [
    '观辰采用「子初换日」：真太阳时晚上 11 点起就算第二天的子时，日柱与时柱一起换到第二天，不再分早子时、晚子时。',
    '有些流派把晚上 11 点到午夜仍算当天（称为「晚子时」），这类出生时间在不同软件可能排出不同的日柱。这是流派差异，不是计算错误。']],
  ['大运与流年', [
    '大运按「阳男阴女顺行、阴男阳女逆行」排列；起运岁数由出生到相邻节气的时间换算，三天折一年、六小时折一个月。',
    '每步大运十年，前五年偏重天干、后五年偏重地支；流年以立春换年，流年中的月份以节气划分，日期为出生地当地时间。']],
  ['解读怎么来', [
    '喜用神以扶抑为主、调候为辅：先看日主强弱与哪类十神最多，再看冬夏是否需要暖局或润局。强弱接近平衡、或五行明显偏向一方的命盘，会标为「仅供参考」。',
    '神煞只取大众常见的 36 个，并且只作辅助；吉凶轻重仍以五行和十神为主。',
    '不知道出生时辰时，问卷只能推测最可能的两个时辰，准确度有限；能找到出生证明或家人记录永远比推测好。']],
  ['隐私', [
    '你输入的出生资料只用来当下计算，计算完就丢弃：服务器不保存，网页也不在浏览器里储存任何资料，不使用 cookie。',
    '网站只匿名记录次数（打开网页、排盘、问卷、点开大运流年各几次），用来了解网页是否有用，不含任何个人资料。']],
  ['繁体中文', [
    '繁体中文版由简体内容自动转换为台湾正体，使用 OpenCC 开源词库（Apache-2.0 授权），命理用语（如干支、六冲）另经人工校订。']],
  ['使用提醒', [
    '观辰的解读仅供参考与自我了解。任何与健康、法律、财务或重大人生选择有关的决定，请以现实情况为准，必要时咨询相关专业人士。']]
];
function screenAbout() {
  return `<section class="screen">
    <div class="bar">${back}<div class="bar-title">说明与隐私</div>${langBtn()}</div>
    ${ABOUT.map(([h, ps]) => `<div class="soft about"><h2>${esc(h)}</h2>${ps.map(p => `<p>${esc(p)}</p>`).join('')}</div>`).join('')}
    <p class="small" style="text-align:center">观辰 · 计算引擎 v2</p>
  </section>`;
}
const aboutLink = `<button class="linkbtn" data-act="about">说明与隐私</button>`;

const SCREENS = { input: screenInput, quiz: screenQuiz, cands: screenCands, loading: screenLoading, result: screenResult, detail: screenDetail, dayun: screenDayun, year: screenYear, about: screenAbout };
let lastScreen = null;
function render() {
  if (scene) scene.setMode(SCENE_MODE[state.screen] || 'cover');
  app.innerHTML = SCREENS[state.screen]();
  convertDom(app); document.title = L('观辰 · 八字命盘');
  if (lastScreen === state.screen) app.firstElementChild?.classList.add('still');   // no entrance animation when only the content changes
  lastScreen = state.screen;
}

// ---------- sheets ----------
async function openSheet(kind) {
  state.sheet = kind;
  if (kind === 'location' && !state.locations) {
    try { state.locations = await (await fetch('data/locations.json')).json(); } catch { state.error = NET_ERROR; state.sheet = null; render(); return; }
  }
  renderSheet();
}
function closeSheet() { if (state.share?.url) URL.revokeObjectURL(state.share.url); state.share = null; state.sheet = null; sheetRoot.innerHTML = ''; }
function renderSheet() {
  if (!state.sheet) { sheetRoot.innerHTML = ''; return; }
  let title = '', body = '';
  if (state.sheet === 'location') {
    title = '出生地';
    const L = state.locations, cur = L.countries.find(c => c.code === state.sheetCountry) || L.countries[0];
    body = `<div class="chips">${L.countries.map(c => `<button class="chip" data-act="country" data-v="${c.code}" aria-pressed="${c.code === cur.code}">${esc(c.name)}</button>`).join('')}</div>
      ${cur.groups.map(g => `<div style="display:flex;flex-direction:column;gap:8px">${cur.groups.length > 1 || g.label !== cur.name ? `<div class="label">${esc(g.label)}</div>` : ''}
        <div class="grid3">${g.cities.map(x => `<button class="pick" data-act="pickLoc" data-id="${x.id}" data-name="${esc(x.name)}" aria-pressed="${state.form.location === x.id}">${esc(x.name)}</button>`).join('')}</div></div>`).join('')}
      <p class="small">找不到出生的城市？选最近的城市即可，真太阳时的差别通常只有几分钟。</p>`;
  } else if (state.sheet === 'share') {
    title = '分享命盘图卡';
    const sh = state.share || {};
    const canShare = !!(sh.file && navigator.canShare?.({ files: [sh.file] }));
    body = sh.busy ? '<div class="small" style="text-align:center;padding:40px 0">图卡生成中…</div>'
      : sh.failed ? '<div class="error">图卡生成失败，请再试一次。</div>'
      : `<img class="shareimg" src="${sh.url}" alt="观辰命盘图卡">
        <button class="cta" data-act="shareCard">${canShare ? '分享' : '下载图片'}</button>
        <p class="small" style="margin:0;text-align:center">图卡只在你的手机上生成，不会上传。卡上不显示出生日期、时间与地点。${canShare ? '' : '手机上也可以长按图片保存。'}</p>`;
  } else {
    title = '大约什么时候出生？';
    const f = state.form;
    body = `<div class="grid2">${PERIODS.map(([id, n, rg]) => `<button class="pick" data-act="pickPeriod" data-v="${id}" aria-pressed="${f.period === id}">${n}<span class="r">${rg}</span></button>`).join('')}</div>
      <button class="pick" data-act="pickPeriod" data-v="AROUND" aria-pressed="${f.period === 'AROUND'}">我知道大约几点（前后一小时）</button>
      ${f.period === 'AROUND' ? `<label class="label" style="display:flex;flex-direction:column;gap:6px">大约几点<input class="timefield" type="time" data-field="around" value="${esc(f.around)}"></label>
        <button class="cta" data-act="closeSheet" ${f.around ? '' : 'disabled'}>确定</button>` : ''}
      <p class="small">能查到出生证明、出院记录或家人的记录吗？准确的时间永远比推测好。</p>`;
  }
  sheetRoot.innerHTML = `<div class="scrim" data-act="closeSheet"></div>
    <div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="grip" aria-hidden="true"></div>
      <div class="sheet-head"><h2>${esc(title)}</h2><button class="chip" data-act="closeSheet" aria-pressed="true">完成</button></div>
      <div class="scroll">${body}</div></div>`;
  convertDom(sheetRoot);
  sheetRoot.querySelector('.sheet .chip[aria-pressed="true"], .sheet .pick')?.focus({ preventScroll: true });
}

// ---------- flows ----------
function birthBase() { const f = state.form; return { date: f.date, gender: f.gender, location: f.location }; }
function validate() {
  const f = state.form;
  if (!f.date) return '请选择出生日期。';
  const y = +f.date.slice(0, 4); if (y < 1900 || y > 2100) return '出生年份需要在 1900 到 2100 年之间。';
  if (f.timeMode === 'exact' && !f.time) return '请选择出生时间，或改选“大约时段”“不知道”。';
  if (f.timeMode === 'approx' && !f.period) return '请选择大约的出生时段。';
  if (f.timeMode === 'approx' && f.period === 'AROUND' && !f.around) return '请选择大约几点。';
  if (!f.gender) return '请选择性别。';
  if (!f.location) return '请选择出生地。';
  return '';
}
async function submit() {
  const msg = validate(); if (msg) { state.error = msg; render(); return; }
  if (state.form.timeMode === 'exact') return doReading({ time: state.form.time, estimate: null, from: 'input' });
  state.est = { answers: {}, data: null, loading: true };
  count('quiz');
  go('quiz');
  await fetchEstimate();
}
async function fetchEstimate() {
  const f = state.form, e = state.est;
  e.loading = true; render();
  const body = { version: 2, birth: birthBase(), period: f.timeMode === 'unknown' ? 'UNKNOWN' : f.period, answers: e.answers };
  if (body.period === 'AROUND') body.around = f.around;
  try { e.data = await post('/api/v2/time-estimate', body); state.error = ''; }
  catch (err) { state.error = err.message; }
  e.loading = false;
  if (e.data && e.data.questions.length === 0 && state.screen === 'quiz') { go('cands', { push: false }); history.replaceState({ screen: 'cands' }, ''); return; }
  render();
}
async function doReading({ time, estimate, from }) {
  state.busy = true; state.screen = 'loading'; render(); window.scrollTo(0, 0);
  const birth = { ...birthBase(), time };
  const started = performance.now();
  try {
    const body = { version: 2, birth, ...(Object.keys(state.context).length ? { context: state.context } : {}), ...(estimate ? { estimate } : {}) };
    const r = await post('/api/v2/reading', body);
    if (!r.timeKnown || !r.chart) throw new Error(r.message || '目前无法排出这个命盘。');
    state.reading = r; state.lastBirth = birth; state.estimateMark = estimate; state.tab = 0; state.ssOpen = null; state.pd = null; state.resultY = 0; state.periodCounted = false;
    count('reading');
    scene?.setChart({ elements: r.chart.elements, dm: r.chart.dayMaster.element });
    const wait = MIN_STAR_MS - (performance.now() - started); if (wait > 0 && !reduce) await sleep(wait);
    state.busy = false; go('result');
  } catch (err) {
    state.busy = false; state.screen = from; state.error = err.message; render();
  }
}
async function setContext(id, v) {
  state.context = { ...state.context, [id]: state.context[id] === v ? undefined : v };
  Object.keys(state.context).forEach(k => state.context[k] === undefined && delete state.context[k]);
  state.busy = true; render();
  try {
    const body = { version: 2, birth: state.lastBirth, ...(Object.keys(state.context).length ? { context: state.context } : {}), ...(state.estimateMark ? { estimate: state.estimateMark } : {}) };
    state.reading = await post('/api/v2/reading', body); state.error = '';
  } catch (err) { state.error = err.message; }
  state.busy = false; render();
}

function openPeriod(screen, pd, replace) {
  state.pd = pd;
  if (!state.periodCounted) { state.periodCounted = true; count('period'); }   // once per chart
  if (replace && state.screen === screen) { history.replaceState(snap(), ''); render(); window.scrollTo(0, 0); }
  else go(screen);
}

// ---------- events ----------
const ACTIONS = {
  back: () => history.back(),
  timeMode: el => { state.form.timeMode = el.dataset.v; state.error = ''; render(); if (el.dataset.v === 'approx' && !state.form.period) openSheet('period'); },
  gender: el => { state.form.gender = el.dataset.v; render(); },
  sheet: el => openSheet(el.dataset.v),
  closeSheet: () => { closeSheet(); render(); },
  country: el => { state.sheetCountry = el.dataset.v; renderSheet(); },
  pickLoc: el => { state.form.location = el.dataset.id; state.form.locationName = el.dataset.name; closeSheet(); render(); },
  pickPeriod: el => { state.form.period = el.dataset.v; if (el.dataset.v !== 'AROUND') { closeSheet(); render(); } else { renderSheet(); render(); } },
  answer: el => { state.est.answers = { ...state.est.answers, [el.dataset.q]: el.dataset.v }; fetchEstimate(); },
  showCands: () => go('cands'),
  pickCand: el => { const c = state.est.data.candidates.find(x => x.label === el.dataset.label); if (c) doReading({ time: c.fillTime, estimate: { label: c.label, percent: c.percent }, from: 'cands' }); },
  about: () => go('about'),
  lang: () => setLang(LANG === 'tw' ? 'cn' : 'tw'),
  share: () => openShare(),
  shareCard: () => shareCard(),
  restart: () => { state.reading = null; state.context = {}; state.est = null; go('input'); },
  tab: el => { state.tab = +el.dataset.v; history.replaceState(snap(), ''); render(); },
  openQ: el => { state.detail = el.dataset.id; if (el.dataset.replace) { history.replaceState({ ...snap(), screen: 'detail' }, ''); render(); window.scrollTo(0, 0); } else go('detail'); },
  jump: el => document.getElementById('sec-' + el.dataset.v)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }),
  ss: el => { state.ssOpen = state.ssOpen === el.dataset.v ? null : el.dataset.v; render(); },
  openDy: el => openPeriod('dayun', { d: +el.dataset.i }, el.dataset.replace),
  openYr: el => { const y = +el.dataset.y, hit = findYear(y); if (hit) openPeriod('year', { d: hit.i, y }, el.dataset.replace); },
  ctx: el => setContext(el.dataset.id, el.dataset.v)
};
function onClick(e) {
  const native = e.target.closest('input.native');
  if (native) { try { native.showPicker?.(); } catch { /* some browsers only allow it on direct taps */ } return; }
  const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
  e.preventDefault(); ACTIONS[el.dataset.act]?.(el);
}
function onChange(e) {
  const el = e.target.closest('[data-field]'); if (!el) return;
  state.form[el.dataset.field] = el.value; state.error = '';
  if (el.dataset.field === 'around') { renderSheet(); render(); return; }
  render();
}
app.addEventListener('click', onClick); sheetRoot.addEventListener('click', onClick);
app.addEventListener('change', onChange); sheetRoot.addEventListener('change', onChange);
app.addEventListener('submit', e => { e.preventDefault(); submit(); });
addEventListener('keydown', e => { if (e.key === 'Escape' && state.sheet) { closeSheet(); render(); } });

history.replaceState({ screen: 'input' }, '');
if (detectLang() === 'tw') setLang('tw', { save: false }); else render();
count('visit'); loadStats();   // one visit per page open (nothing is stored in the browser)
