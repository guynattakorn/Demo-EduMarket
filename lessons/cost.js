'use strict';
// Book 1 "กำไรและต้นทุน": one cookie-shop example from raw materials to net profit.
const $ = (id) => document.getElementById(id);
const VARIABLE_TOTAL = 200; // บาท (page 3)
const MADE = 40; // ชิ้น (page 4)

const state = () => {
  const defect = Number($('defect').value);
  const ready = MADE - defect;
  const unit = VARIABLE_TOTAL / ready;
  const price = Number($('price').value);
  const fixed = Number($('fixed').value);
  const cm = price - unit;
  const exact = cm > 0 ? fixed / cm : null;
  const bep = exact === null ? null : Math.ceil(exact - 1e-9);
  return { defect, ready, unit, price, fixed, cm, exact, bep };
};

/* ---------- Page 4: defects → cost per unit ---------- */
function drawDefects() {
  const s = state();
  $('defectValue').textContent = s.defect;
  $('readyOut').textContent = s.ready + ' ชิ้น';
  $('unitOut').textContent = money(s.unit);
  $('extraOut').textContent = '+' + money(s.unit - VARIABLE_TOTAL / MADE);
  $('defectHeadline').textContent = money(VARIABLE_TOTAL) + ' ÷ ' + s.ready + ' = ' + money(s.unit) + ' บาท/ชิ้น';
  $('defectUnits').innerHTML = Array.from({ length: MADE }, (_, i) => `<span class="${i < s.ready ? 'on' : 'bad'}"></span>`).join('');

  const svg = $('defectChart');
  const maxD = Number($('defect').max);
  const maxCost = VARIABLE_TOTAL / (MADE - maxD);
  const f = plotFrame(svg, { xMax: maxD, yMin: 4, yMax: maxCost, xTicks: [2, 5], yLabel: 'บาท/ชิ้น', xLabel: 'จำนวนชิ้นที่ชำรุด' });
  let g = f.svgStart;
  const pts = [];
  for (let d = 0; d <= maxD; d += 0.5) pts.push(`${f.x(d)},${f.y(VARIABLE_TOTAL / (MADE - d))}`);
  g += `<path d="M${f.L} ${f.y(5)}H${f.R}" stroke="#a1a1aa" stroke-dasharray="5 5"/>`;
  g += `<polyline points="${pts.join(' ')}" fill="none" stroke="${COLOR.ink}" stroke-width="3.5" stroke-linecap="round"/>`;
  g += tag(f.R - 4, f.y(5) + 24, 'ไม่มีของเสีย = 5.00 บาท/ชิ้น', { anchor: 'end', bold: false });
  // highest value in the chart range
  g += `<circle cx="${f.x(maxD)}" cy="${f.y(maxCost)}" r="5" fill="${COLOR.orange}"/>`;
  g += tag(f.x(maxD) - 10, f.y(maxCost) + 4, 'สูงสุดในกราฟ: เสีย ' + maxD + ' ชิ้น = ' + money(maxCost) + ' บาท', { anchor: 'end', fill: COLOR.orangeInk });
  // current value
  const cx = f.x(s.defect), cy = f.y(s.unit);
  g += `<path d="M${cx} ${cy}V${f.B}" stroke="${COLOR.ink}" stroke-dasharray="3 4"/>`;
  g += `<circle cx="${cx}" cy="${cy}" r="8" fill="${COLOR.lime}" stroke="${COLOR.ink}" stroke-width="2.5"/>`;
  if (s.defect < maxD - 4) g += tag(cx - 12, cy + 4, money(s.unit) + ' บาท', { anchor: 'end' });
  paint(svg, f, g);
  svg.setAttribute('aria-label', 'ชำรุด ' + s.defect + ' ชิ้น ต้นทุนผันแปรต่อหน่วย ' + money(s.unit) + ' บาท ค่าสูงสุดในกราฟ ' + money(maxCost) + ' บาท เมื่อชำรุด ' + maxD + ' ชิ้น');
}

/* ---------- Page 5: contribution margin and break-even ---------- */
function drawBreakEven() {
  const s = state();
  ['p5Price', 'p5Price2'].forEach((id) => ($(id).textContent = fmt(s.price)));
  ['p5Fixed', 'p5Fixed2'].forEach((id) => ($(id).textContent = fmt(s.fixed)));
  $('cmCalc').textContent = fmt(s.price) + ' − ' + money(s.unit) + ' = ' + money(s.cm) + ' บาท/ชิ้น';
  if (s.bep === null) {
    $('bepCalc').textContent = 'ราคาขายไม่สูงกว่าต้นทุนต่อชิ้น จึงไม่มีจุดคุ้มทุน';
    $('bepHeadline').textContent = 'ไม่มีจุดคุ้มทุน';
    $('bepUnits').innerHTML = Array.from({ length: 50 }, () => '<span class="pay"></span>').join('');
    return;
  }
  const rounded = s.exact % 1 > 1e-9 ? ' → ปัดขึ้นเป็น ' + s.bep + ' ชิ้น' : ' ชิ้น';
  $('bepCalc').textContent = fmt(s.fixed) + ' ÷ ' + money(s.cm) + ' = ' + fmt(s.exact) + rounded;
  $('bepHeadline').textContent = 'คุ้มทุนที่ ' + s.bep + ' ชิ้น';
  const n = Math.min(100, Math.max(50, Math.ceil((s.bep + 10) / 10) * 10));
  $('bepUnits').innerHTML = Array.from({ length: n }, (_, i) => `<span class="${i < s.bep ? 'pay' : 'on'}"></span>`).join('');
}

/* ---------- Page 6: revenue vs total cost ---------- */
function chartMax(s) {
  if (s.bep === null || s.bep <= 55) return 80;
  return Math.min(200, Math.ceil((s.bep * 1.45) / 10) * 10);
}

function drawProfit() {
  const s = state();
  const xMax = chartMax(s);
  const qtyInput = $('qty');
  qtyInput.max = xMax;
  const q = Math.min(Number(qtyInput.value), xMax);
  qtyInput.value = q;
  const rev = s.price * q, total = s.fixed + s.unit * q, net = rev - total;
  $('qtyValue').textContent = q;
  $('priceValue').textContent = fmt(s.price);
  $('fixedValue').textContent = fmt(s.fixed);
  $('revOut').textContent = money(rev);
  $('totalOut').textContent = money(total);
  $('netOut').textContent = (net > 0 ? '+' : '') + money(net);
  $('netBox').className = net < 0 ? 'warn' : 'hot';
  $('profitHeadline').textContent = 'ขาย ' + q + ' ชิ้น';
  $('profitValue').textContent = net > 0 ? 'กำไร ' + money(net) + ' บาท' : net < 0 ? 'ขาดทุน ' + money(-net) + ' บาท' : 'คุ้มทุนพอดี';
  $('profitValue').style.color = net < 0 ? COLOR.orangeInk : COLOR.limeStrong;
  $('subst').textContent =
    'รายได้ ' + fmt(s.price) + ' × ' + q + ' = ' + money(rev) + ' บาท\n' +
    'ต้นทุนรวม ' + fmt(s.fixed) + ' + (' + money(s.unit) + ' × ' + q + ') = ' + money(total) + ' บาท\n' +
    'กำไรสุทธิ ' + money(rev) + ' − ' + money(total) + ' = ' + money(net) + ' บาท';

  const svg = $('beChart');
  const revMax = s.price * xMax, totalMax = s.fixed + s.unit * xMax;
  const f = plotFrame(svg, { xMax, yMax: Math.max(revMax, totalMax, 1), xTicks: xMax > 100 ? [20, 50] : [10, 20], yLabel: 'บาท', xLabel: 'จำนวนที่ขายได้ (ชิ้น)' });
  let g = f.svgStart;
  const x0 = f.x(0), xm = f.x(xMax);
  if (s.exact !== null && s.exact <= xMax) {
    const bx = f.x(s.exact), by = f.y(s.price * s.exact);
    g += `<path d="M${x0} ${f.y(0)}L${bx} ${by}L${x0} ${f.y(s.fixed)}Z" fill="${COLOR.orange}" opacity=".14"/>`;
    g += `<path d="M${bx} ${by}L${xm} ${f.y(revMax)}L${xm} ${f.y(totalMax)}Z" fill="${COLOR.lime}" opacity=".45"/>`;
  } else {
    g += `<path d="M${x0} ${f.y(0)}L${xm} ${f.y(revMax)}L${xm} ${f.y(totalMax)}L${x0} ${f.y(s.fixed)}Z" fill="${COLOR.orange}" opacity=".14"/>`;
  }
  g += `<path d="M${f.L} ${f.y(s.fixed)}H${f.R}" stroke="#a1a1aa" stroke-width="2" stroke-dasharray="6 5"/>`;
  g += `<path d="M${x0} ${f.y(0)}L${xm} ${f.y(revMax)}" stroke="${COLOR.limeStrong}" stroke-width="3.5" stroke-linecap="round"/>`;
  g += `<path d="M${x0} ${f.y(s.fixed)}L${xm} ${f.y(totalMax)}" stroke="${COLOR.ink}" stroke-width="3.5" stroke-linecap="round"/>`;

  // current sales
  g += `<path d="M${f.x(q)} ${f.T}V${f.B}" stroke="${COLOR.muted}" stroke-width="1.5" stroke-dasharray="5 5"/>`;
  g += `<circle cx="${f.x(q)}" cy="${f.y(rev)}" r="5" fill="${COLOR.limeStrong}" stroke="#fff" stroke-width="2"/>`;
  g += `<circle cx="${f.x(q)}" cy="${f.y(total)}" r="5" fill="${COLOR.ink}" stroke="#fff" stroke-width="2"/>`;

  // break-even point
  if (s.exact !== null && s.exact <= xMax) {
    const bx = f.x(s.exact), by = f.y(s.price * s.exact);
    g += `<path d="M${bx} ${by}V${f.B}" stroke="${COLOR.ink}" stroke-dasharray="3 4"/>`;
    g += `<circle cx="${bx}" cy="${by}" r="8" fill="${COLOR.lime}" stroke="${COLOR.ink}" stroke-width="2.5"/>`;
    g += tag(Math.max(f.L + 70, bx), by - 18, 'คุ้มทุน ' + s.bep + ' ชิ้น');
  }

  // the most the chart shows: its right edge
  const netMax = revMax - totalMax;
  const edgeText = 'สูงสุดในกราฟ ' + xMax + ' ชิ้น: ' + (netMax >= 0 ? 'กำไร ' + money(netMax) : 'ขาดทุน ' + money(-netMax)) + ' บาท';
  g += `<path d="M${xm} ${f.T}V${f.B}" stroke="${COLOR.orange}" stroke-width="1.5"/>`;
  g += tag(xm, f.T - 2, edgeText, { anchor: 'end', fill: COLOR.orangeInk });

  paint(svg, f, g);
  svg.setAttribute('aria-label', 'ขาย ' + q + ' ชิ้น รายได้ ' + money(rev) + ' บาท ต้นทุนรวม ' + money(total) + ' บาท ' + (s.bep === null ? 'ไม่มีจุดคุ้มทุน' : 'จุดคุ้มทุน ' + s.bep + ' ชิ้น') + ' ' + edgeText);
}

/* ---------- Page 7: summary chain ---------- */
function drawChain() {
  const s = state();
  const q = Number($('qty').value);
  const net = s.price * q - (s.fixed + s.unit * q);
  const rows = [
    ['ต้นทุนผันแปรรวม (หน้า 3)', money(VARIABLE_TOTAL) + ' บาท'],
    ['ผลิต ' + MADE + ' ชิ้น ชำรุด ' + s.defect + ' ชิ้น พร้อมขาย', s.ready + ' ชิ้น'],
    ['ต้นทุนผันแปรต่อหน่วย ' + money(VARIABLE_TOTAL) + ' ÷ ' + s.ready, money(s.unit) + ' บาท'],
    ['กำไรส่วนเกินต่อหน่วย ' + fmt(s.price) + ' − ' + money(s.unit), money(s.cm) + ' บาท'],
    ['จุดคุ้มทุน ' + fmt(s.fixed) + ' ÷ ' + money(s.cm), s.bep === null ? 'ไม่มี' : s.bep + ' ชิ้น'],
    ['ขายได้ ' + q + ' ชิ้น ' + (net < 0 ? 'ขาดทุนสุทธิ' : 'กำไรสุทธิ'), money(Math.abs(net)) + ' บาท'],
  ];
  $('chain').innerHTML = rows.map((r, i) => `<div class="${i === rows.length - 1 ? 'hot' : ''}"><span>${r[0]}</span><b>${r[1]}</b></div>`).join('');
}

function update() {
  drawDefects();
  drawBreakEven();
  drawProfit();
  drawChain();
}
document.querySelectorAll('input[type=range]').forEach((e) => e.addEventListener('input', update));
keepDrawn($('defectChart'), drawDefects);
keepDrawn($('beChart'), drawProfit);
Book.onShow(() => drawChain());
update();
Book.start();
