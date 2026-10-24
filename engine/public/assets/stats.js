// 观辰 · 使用统计页 (P8-1). Separate file so the site can use a strict Content-Security-Policy.
const L = [['visit', '访问'], ['reading', '排盘'], ['quiz', '问卷'], ['period', '大运流年']];
const nf = n => Number(n || 0).toLocaleString('en-US');
fetch('/api/v2/stats?days=30').then(r => r.json()).then(d => {
  document.getElementById('tiles').innerHTML = L.map(([k, n]) => `<div class="tile"><span class="small">累计${n}</span><b>${nf(d.total[k])}</b></div>`).join('');
  document.getElementById('days').innerHTML = `<tr><th>日期</th>${L.map(([, n]) => `<th>${n}</th>`).join('')}</tr>` + d.days.map(x => `<tr><td>${x.date}</td>${L.map(([k]) => `<td>${nf(x[k])}</td>`).join('')}</tr>`).join('');
}).catch(() => { document.getElementById('tiles').textContent = '暂时读取不到统计。'; });
