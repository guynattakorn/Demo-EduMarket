'use strict';
// Book 2 "Stock": demand changes by day → over / under production → the most profitable quantity.
const $ = (id) => document.getElementById(id);
const PRICE = 20, COST = 6;
const DAYS = [
  { id: 'normal', name: 'วันเรียนปกติ', demand: 50, reason: 'ลูกค้ากลุ่มเดิม ช่วงพักเวลาเดิม ใช้ยอดขายครั้งก่อนเป็นฐานได้' },
  { id: 'sports', name: 'วันกีฬาสี', demand: 80, reason: 'นักเรียนอยู่ในโรงเรียนทั้งวันและใช้แรงมาก จึงซื้อขนมมากขึ้น แต่ควรดูว่ามีร้านอื่นหรือขนมแจกฟรีหรือไม่' },
  { id: 'open', name: 'Open House', demand: 70, reason: 'มีผู้ปกครองและผู้มาเยือนเพิ่มจากนักเรียน ลูกค้ามากขึ้นในช่วงที่มีผู้มาร่วมงานมาก' },
  { id: 'exam', name: 'ช่วงสอบ', demand: 35, reason: 'เวลาพักสั้นและแต่ละชั้นพักไม่ตรงกัน ลูกค้ามีเวลาซื้อน้อยลง' },
  { id: 'rain', name: 'วันฝนตก', demand: 30, reason: 'คนออกมาเดินซื้อของที่ร้านน้อยลง ควรผลิตน้อยกว่าวันปกติ' },
];
let day = DAYS[0];
let make = day.demand;

const calc = (m, d = day.demand) => {
  const sold = Math.min(m, d), left = Math.max(0, m - d), short = Math.max(0, d - m);
  return { sold, left, short, missed: short * (PRICE - COST), waste: left * COST, profit: sold * PRICE - m * COST };
};
const maxMake = () => day.demand * 2;

/* ---------- Page 1: demand by day ---------- */
DAYS.forEach((d) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = d.name;
  b.dataset.day = d.id;
  b.addEventListener('click', () => {
    day = d;
    make = d.demand;
    update();
  });
  $('days').appendChild(b);
});

function drawDays() {
  document.querySelectorAll('#days button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.day === day.id)));
  $('dayHeadline').textContent = day.name + ' ' + day.demand + ' ชิ้น';
  $('dayReason').textContent = day.reason;

  const svg = $('dayChart');
  const W = Math.max(300, Math.round(svg.getBoundingClientRect().width || 640));
  const rowH = 44, T = 14, H = T + DAYS.length * rowH + 30;
  const L = 96, R = W - 12, xMax = 100;
  const x = (v) => L + (v / xMax) * (R - L);
  const top = Math.max(...DAYS.map((d) => d.demand));
  let g = `<g font-family="${FONT}" font-size="12" fill="${COLOR.muted}">`;
  for (let v = 0; v <= xMax; v += 25) {
    g += `<path d="M${x(v)} ${T - 4}V${T + DAYS.length * rowH}" stroke="${COLOR.grid}"/>`;
    g += `<text x="${x(v)}" y="${H - 8}" text-anchor="middle">${v}</text>`;
  }
  g += '</g>';
  DAYS.forEach((d, i) => {
    const y = T + i * rowH + 8, on = d.id === day.id;
    g += `<text x="${L - 10}" y="${y + 19}" text-anchor="end" font-family="${FONT}" font-size="13" font-weight="${on ? 800 : 500}" fill="${COLOR.ink}">${d.name}</text>`;
    g += `<rect x="${L}" y="${y}" width="${x(d.demand) - L}" height="28" rx="6" fill="${on ? COLOR.lime : '#d4d4d8'}" stroke="${on ? COLOR.ink : 'none'}" stroke-width="1.5"/>`;
    const label = d.demand === top ? 'สูงสุด ' + top : d.demand;
    g += `<text x="${x(d.demand) - 8}" y="${y + 19}" text-anchor="end" font-family="${FONT}" font-size="13" font-weight="700" fill="${d.demand === top && !on ? COLOR.orangeInk : COLOR.ink}">${label}</text>`;
  });
  paint(svg, { W, H }, g);
  svg.setAttribute('aria-label', DAYS.map((d) => d.name + ' ' + d.demand + ' ชิ้น').join(', ') + ' สูงสุด ' + top + ' ชิ้น');
}

/* ---------- Page 3: over / under, one square per sandwich ---------- */
function presets() {
  const d = day.demand, gap = Math.round(d * 0.4);
  return [
    ['ผลิตขาด ' + gap + ' ชิ้น', d - gap],
    ['ผลิตพอดี', d],
    ['ผลิตเกิน ' + gap + ' ชิ้น', d + gap],
  ];
}
/** Pie chart: sold / left over / customers who missed out. */
function drawPie(r) {
  const parts = [
    { key: 'on', label: 'ขายได้', n: r.sold, fill: COLOR.lime, stroke: '#a9d81f' },
    { key: 'left', label: 'ผลิตเกิน · เหลือ', n: r.left, fill: COLOR.orange, stroke: COLOR.orange },
    { key: 'miss', label: 'ผลิตขาด · ลูกค้าไม่ได้ซื้อ', n: r.short, fill: '#f4f4f5', stroke: COLOR.muted, dash: '4 3' },
  ];
  const total = parts.reduce((a, p) => a + p.n, 0) || 1;
  const cx = 100, cy = 100, R = 92;
  let a0 = -Math.PI / 2, g = '';
  const pt = (a, rad = R) => [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
  parts.filter((p) => p.n > 0).forEach((p) => {
    const share = p.n / total, a1 = a0 + share * 2 * Math.PI;
    const attrs = `fill="${p.fill}" stroke="${p.stroke}" stroke-width="1.5"${p.dash ? ` stroke-dasharray="${p.dash}"` : ''}`;
    if (share >= 0.9999) g += `<circle cx="${cx}" cy="${cy}" r="${R}" ${attrs}/>`;
    else {
      const [x0, y0] = pt(a0), [x1, y1] = pt(a1);
      g += `<path d="M${cx} ${cy}L${x0.toFixed(2)} ${y0.toFixed(2)}A${R} ${R} 0 ${share > 0.5 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}Z" ${attrs} stroke-linejoin="round"/>`;
    }
    if (share >= 0.08) {
      const [tx, ty] = pt((a0 + a1) / 2, share >= 0.9999 ? 0 : R * 0.6);
      g += `<text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-family="${FONT}" font-size="15" font-weight="800" fill="${p.key === 'left' ? '#fff' : COLOR.ink}">${p.n}</text>`;
    }
    a0 = a1;
  });
  $('makePie').innerHTML = g;
  $('makePie').setAttribute('aria-label', parts.map((p) => p.label + ' ' + p.n + ' ชิ้น').join(', '));
  $('makePieLegend').innerHTML = parts.map((p) => `<li><i class="${p.key}"></i><span>${p.label}</span><b>${p.n} ชิ้น · ${Math.round((p.n / total) * 100)}%</b></li>`).join('');
}

function drawUnits() {
  const d = day.demand, r = calc(make);
  $('p3Intro').textContent = day.name + ' คาดว่ามีคนอยากซื้อ ' + d + ' ชิ้น ร้านขายชิ้นละ ' + PRICE + ' บาท ต้นทุนชิ้นละ ' + COST + ' บาท ลองเลื่อนจำนวนที่ผลิต แล้วดูในวงกลมว่าส่วนไหนขายได้ ส่วนไหนเหลือ และมีลูกค้ากี่คนที่ไม่ได้ซื้อ';
  $('make3Value').textContent = make;
  drawPie(r);
  const head = $('makeHeadline'), eff = $('makeEffect');
  if (r.short) {
    head.textContent = 'ผลิตขาด ' + r.short + ' ชิ้น';
    eff.textContent = 'กำไรที่สูญเสีย ' + fmt(r.missed) + ' บาท';
    eff.style.color = COLOR.ink2;
  } else if (r.left) {
    head.textContent = 'ผลิตเกิน ' + r.left + ' ชิ้น';
    eff.textContent = 'ความเสียหาย ' + fmt(r.waste) + ' บาท';
    eff.style.color = COLOR.orangeInk;
  } else {
    head.textContent = 'ผลิตพอดี ' + d + ' ชิ้น';
    eff.textContent = 'ไม่มีความเสียหาย';
    eff.style.color = COLOR.limeStrong;
  }
  $('lossLive').textContent = r.short
    ? 'ลูกค้า ' + r.short + ' คนไม่ได้ซื้อ\nกำไรที่สูญเสีย = ' + r.short + ' × (' + PRICE + ' − ' + COST + ') = ' + fmt(r.missed) + ' บาท'
    : r.left
      ? 'เหลือคุกกี้ ' + r.left + ' ชิ้นที่ขายไม่ได้\nความเสียหาย = ' + r.left + ' × ' + COST + ' = ' + fmt(r.waste) + ' บาท'
      : 'ขายได้ครบ ' + d + ' ชิ้น ไม่มีสินค้าเหลือและไม่มีลูกค้าที่ไม่ได้ซื้อ';
  $('makePresets').innerHTML = presets().map(([label, v]) => `<button type="button" data-make="${v}" aria-pressed="${v === make}">${label}</button>`).join('');
}
$('makePresets').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-make]');
  if (!b) return;
  make = Number(b.dataset.make);
  update();
});

/* ---------- Page 4: profit for every quantity ---------- */
function drawCases() {
  const d = day.demand, gap = Math.round(d * 0.4);
  const lo = calc(d - gap), hi = calc(d + gap), best = calc(d);
  $('p4Intro').textContent = day.name + ' มีคนอยากซื้อ ' + d + ' ชิ้น ลองเปรียบเทียบการผลิต 3 แบบ (ขายชิ้นละ ' + PRICE + ' บาท ต้นทุนชิ้นละ ' + COST + ' บาท)';
  $('cases').innerHTML = [
    ['ผลิต ' + (d - gap) + ' ชิ้น (ผลิตขาด)', 'ขายหมด ' + lo.sold + ' ชิ้น แต่ลูกค้าอีก ' + lo.short + ' คนไม่ได้ซื้อ', lo.sold + ' × ' + PRICE + ' − ' + (d - gap) + ' × ' + COST + ' = ' + fmt(lo.profit) + ' บาท', ''],
    ['ผลิต ' + (d + gap) + ' ชิ้น (ผลิตเกิน)', 'ขายได้ ' + hi.sold + ' ชิ้น เหลือ ' + hi.left + ' ชิ้น', hi.sold + ' × ' + PRICE + ' − ' + (d + gap) + ' × ' + COST + ' = ' + fmt(hi.profit) + ' บาท', ''],
    ['ผลิต ' + d + ' ชิ้น (พอดี)', 'ขายได้ครบทุกชิ้น', best.sold + ' × ' + PRICE + ' − ' + d + ' × ' + COST + ' = ' + fmt(best.profit) + ' บาท', 'hot'],
  ].map((c, i) => `<li><span class="n">${i + 1}</span><p><b>${c[0]}</b><br>${c[1]}<br><span class="calc ${c[3]}">${c[2]}</span></p></li>`).join('') +
    `<li><span class="n">=</span><p>ผลิตขาดได้กำไร ${fmt(lo.profit)} บาท ผลิตเกินได้ ${fmt(hi.profit)} บาท ทั้งสองแบบได้น้อยกว่าผลิตพอดี แต่เสียไปคนละแบบ แบบแรกเสียโอกาสขาย แบบที่สองเสียเงินค่าวัตถุดิบ</p></li>`;
}

function drawProfit() {
  const d = day.demand, m = maxMake(), r = calc(make), best = calc(d);
  $('make4Value').textContent = make;
  $('profitHeadline').textContent = 'ผลิต ' + make + ' ชิ้น';
  $('profitValue').textContent = 'กำไร ' + fmt(r.profit) + ' บาท';
  $('profitValue').style.color = make === d ? COLOR.limeStrong : COLOR.ink;

  const svg = $('profitChart');
  const f = plotFrame(svg, { xMax: m, yMax: best.profit, xTicks: [niceStep(m / 8), niceStep(m / 4)], yLabel: 'กำไร (บาท)', xLabel: 'จำนวนที่ผลิต (ชิ้น)' });
  let g = f.svgStart;
  // shaded sides
  g += `<rect x="${f.x(0)}" y="${f.T}" width="${f.x(d) - f.x(0)}" height="${f.B - f.T}" fill="#27272a" opacity=".05"/>`;
  g += `<rect x="${f.x(d)}" y="${f.T}" width="${f.x(m) - f.x(d)}" height="${f.B - f.T}" fill="${COLOR.orange}" opacity=".08"/>`;
  g += `<text x="${f.x(d / 2)}" y="${f.B - 10}" text-anchor="middle" font-family="${FONT}" font-size="13" font-weight="700" fill="${COLOR.ink2}">ผลิตขาด</text>`;
  g += `<text x="${f.x(d * 1.5)}" y="${f.B - 10}" text-anchor="middle" font-family="${FONT}" font-size="13" font-weight="700" fill="${COLOR.orangeInk}">ผลิตเกิน</text>`;
  g += `<path d="M${f.x(0)} ${f.y(0)}L${f.x(d)} ${f.y(best.profit)}L${f.x(m)} ${f.y(calc(m).profit)}" fill="none" stroke="${COLOR.ink}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>`;
  // highest point
  g += `<path d="M${f.x(d)} ${f.y(best.profit)}V${f.B}" stroke="${COLOR.limeStrong}" stroke-dasharray="4 4"/>`;
  g += tag(f.x(d), f.y(best.profit) - 16, 'กำไรสูงสุด ' + fmt(best.profit) + ' บาท ที่ผลิต ' + d + ' ชิ้น', { fill: COLOR.limeStrong });
  // current
  g += `<path d="M${f.x(make)} ${f.y(r.profit)}V${f.B}" stroke="${COLOR.ink}" stroke-dasharray="3 4"/>`;
  g += `<circle cx="${f.x(make)}" cy="${f.y(r.profit)}" r="8" fill="${COLOR.lime}" stroke="${COLOR.ink}" stroke-width="2.5"/>`;
  paint(svg, f, g);
  svg.setAttribute('aria-label', 'ผลิต ' + make + ' ชิ้น กำไร ' + fmt(r.profit) + ' บาท กำไรสูงสุด ' + fmt(best.profit) + ' บาท เมื่อผลิต ' + d + ' ชิ้น');
}

/* ---------- Page 5: summary ---------- */
function drawChain() {
  const d = day.demand, r = calc(make);
  const rows = [
    ['สถานการณ์ที่เลือก', day.name],
    ['ความต้องการซื้อ', d + ' ชิ้น'],
    ['จำนวนที่ผลิต', make + ' ชิ้น'],
    [r.short ? 'ผลิตขาด · กำไรที่สูญเสีย' : r.left ? 'ผลิตเกิน · ความเสียหาย' : 'ผลิตพอดี · ความเสียหาย', fmt(r.short ? r.missed : r.waste) + ' บาท'],
    ['กำไร (ยังไม่หักต้นทุนคงที่)', fmt(r.profit) + ' บาท'],
  ];
  $('chain').innerHTML = rows.map((row, i) => `<div class="${i === rows.length - 1 ? 'hot' : ''}"><span>${row[0]}</span><b>${row[1]}</b></div>`).join('');
}

function update() {
  ['make3', 'make4'].forEach((id) => {
    $(id).max = maxMake();
    $(id).value = make;
  });
  drawDays();
  drawUnits();
  drawCases();
  drawProfit();
  drawChain();
}
['make3', 'make4'].forEach((id) =>
  $(id).addEventListener('input', (e) => {
    make = Number(e.target.value);
    update();
  }),
);
keepDrawn($('dayChart'), drawDays);
keepDrawn($('profitChart'), drawProfit);
update();
Book.start();
