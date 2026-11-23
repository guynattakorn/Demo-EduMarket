// components/ProjectInsights.jsx
// แหล่งโค้ดจริงของ app.js — แก้ไขไฟล์ใน src/ แล้วรัน `npm run build`
// แดชบอร์ด "วิเคราะห์โปรเจกต์" ในแท็บสรุปผล (ยกมาจาก EduMarket Project Insights)
// - ร้านของฉัน: ใช้ออเดอร์ สินค้า และสต็อกจริงของร้าน
// - ร้านตัวอย่าง: ร้านขนมข้อมูลสมมติ 5 วันเรียน
// - ภาพรวมโรงเรียน: ยอดส่งมอบของทุกร้าน (หรือตลาดตัวอย่าง)
import { useMemo, useState } from "react";
import { Q } from "../state/context.js";
import { bl } from "../state/selectors.js";
import {
  thaiDate,
  today,
  shift,
  dateOf,
  num,
  money,
  report,
  change,
  prediction,
  projectLessons,
  timeLesson,
  slotNames,
  demo,
} from "../lib/insights.js";
import { snackDemo, snackFunnel, snackAudience, snackTiming, snackStock, snackFinance } from "../lib/insights-demo.js";

const satang = (baht) => Math.round(Number(baht || 0) * 100);
const pct = (x) => (x > 0 ? "+" : "") + num(Math.round(x * 10) / 10) + "%";
const fmtMetric = (key, v) => (key === "units" ? num(v) + " ชิ้น" : money(v));
const BAR = ["var(--ink)", "var(--primary)", "#a1a1aa", "#d4d4d8"];

/** แปลงข้อมูลร้านจริงของ EduMarket เป็นรูปแบบที่สูตรวิเคราะห์ใช้ */
function shopDataset(state, shopId) {
  const products = state.products.filter((p) => p.shopId === shopId);
  const posts = products.map((p) => ({
    id: p.id,
    title: p.name,
    price: satang(p.price),
    cost: satang(p.cost),
    costKnown: p.cost !== null && p.cost !== undefined && p.cost !== "",
    stock: Number(p.stock) || 0,
    fixed: 0,
    created: p.createdAt || "2026-01-01T00:00:00Z",
  }));
  const sales = [];
  for (const o of state.orders) {
    if (o.shopId !== shopId) continue;
    const deliveredAt = (o.history || []).find((h) => h.status === "delivered")?.date || o.date;
    const status = o.status === "delivered" ? "delivered" : o.status === "cancelled" ? "cancelled" : "pending";
    o.items.forEach((it, i) => {
      sales.push({
        id: o.id + "-" + i,
        post: it.productId,
        quantity: Number(it.qty) || 0,
        price: satang(it.price),
        cost: satang(it.cost),
        status,
        first: i === 0,
        created: o.date,
        delivered: status === "delivered" ? deliveredAt : null,
      });
    });
  }
  return { posts, visits: [], sales };
}

/** ยอดเข้าชม สนใจ และสั่งซื้อ (นับรวมตั้งแต่เปิดร้าน) ของสินค้าที่เลือก */
function shopFunnel(state, shopId, filter) {
  const products = state.products.filter((p) => p.shopId === shopId && (filter === "all" || p.id === filter));
  const ids = new Set(products.map((p) => p.id));
  const placed = state.orders.filter(
    (o) => o.shopId === shopId && o.status !== "cancelled" && o.items.some((it) => ids.has(it.productId)),
  ).length;
  return {
    products: products.length,
    views: products.reduce((s, p) => s + (Number(p.views) || 0), 0),
    wishes: products.reduce((s, p) => s + bl(p), 0),
    placed,
  };
}

/** ค่าเฉลี่ยรวมของร้านอื่น (ต้องมีอย่างน้อย 3 ร้านที่มีคนเข้าชม) */
function peerFunnel(state, shopId) {
  const shops = state.shops.filter((s) => s.id !== shopId);
  const rows = shops.map((s) => ({ id: s.id, ...shopFunnel(state, s.id, "all") })).filter((s) => s.views > 0);
  if (rows.length < 3) return null;
  const sum = (k) => rows.reduce((a, r) => a + r[k], 0);
  return { shops: rows.length, products: sum("products"), views: sum("views"), wishes: sum("wishes"), placed: sum("placed") };
}

function mineFunnelLesson(f) {
  if (!f.views)
    return {
      meaning: "ยังไม่มีคนเข้าชมสินค้าของร้าน จึงยังบอกไม่ได้ว่าควรปรับขั้นไหน",
      action: "แชร์ลิงก์สินค้าในช่องทางเดียวก่อน แล้วดูว่ายอดเข้าชมเพิ่มขึ้นเท่าไร",
    };
  const orderRate = (100 * f.placed) / f.views;
  const meaning =
    "จากการเข้าชม 100 ครั้ง มีการสั่งซื้อ " +
    num(Math.round(orderRate * 10) / 10) +
    " ครั้ง และมีคนกดสนใจรวม " +
    num(f.wishes) +
    " ครั้ง ตัวเลขนี้นับรวมตั้งแต่เปิดร้าน จึงใช้ดูภาพรวม แต่ยังเทียบรายสัปดาห์ไม่ได้";
  const action =
    f.wishes > f.placed
      ? "มีคนกดสนใจ " + num(f.wishes) + " ครั้ง แต่สั่งจริง " + num(f.placed) + " ครั้ง ลองบอกจุดรับและเวลารับสินค้าให้ชัดในรายละเอียด โดยคงราคาเดิม แล้วเทียบจำนวนสั่งซื้อในรอบถัดไป"
      : "ลองเปลี่ยนรูปแรกของสินค้าอย่างเดียว โดยคงราคาเดิม แล้วเทียบจำนวนสั่งซื้อต่อการเข้าชมกับตอนนี้";
  return { meaning, action };
}

function Coach({ lesson, extra }) {
  if (!lesson) return null;
  return (
    <div className="pi-coach">
      <h3>สรุปข้อมูลจากกราฟ</h3>
      <p>{lesson.meaning}</p>
      <p className="pi-try">
        <strong>ข้อเสนอแนะ</strong>
        {lesson.action}
      </p>
      {extra && (
        <details>
          <summary>คาดการณ์ยอดขายวันนี้</summary>
          <p>{extra}</p>
        </details>
      )}
    </div>
  );
}

function Bars({ items, format = num }) {
  const max = Math.max(1, ...items.map((v) => Math.abs(v[1])));
  return (
    <div className="pi-bars">
      {items.map(([name, v, color]) => (
        <div className="pi-barrow" key={name}>
          <div className="pi-barhead">
            <span>{name}</span>
            <strong>{format(v)}</strong>
          </div>
          <div className="pi-track">
            <i style={{ width: (Math.abs(v) / max) * 100 + "%", background: color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** กราฟเส้นช่วงที่เลือกเทียบช่วงก่อนหน้า (ค่าเป็นสตางค์ ยกเว้น unit=1) */
function LineChart({ current, previous, valueOf, unit, format, readout, height = 220 }) {
  const n = current.length;
  const [index, setIndex] = useState(null);
  const W = 640,
    H = height,
    L = 56,
    R = 14,
    T = 14,
    B = 30;
  const vals = [...current, ...previous].map(valueOf);
  const max = Math.max(unit, ...vals),
    min = Math.min(0, ...vals);
  const rough = (max - min) / 4 / unit,
    exp = 10 ** Math.floor(Math.log10(rough || 1)),
    nice = ([1, 2, 5, 10].find((k) => k >= rough / exp) || 10) * exp * unit;
  const lo = Math.floor(min / nice) * nice,
    hi = Math.max(lo + nice, Math.ceil(max / nice) * nice);
  const X = (i) => L + (i * (W - L - R)) / Math.max(1, n - 1);
  const Y = (v) => T + ((hi - v) / (hi - lo)) * (H - T - B);
  const pts = (arr) => arr.map((d, i) => X(i).toFixed(1) + "," + Y(valueOf(d)).toFixed(1)).join(" ");
  const grid = [];
  for (let v = lo; v <= hi + 0.01; v += nice) grid.push(v);
  const ticks = [...new Set([0, Math.round((n - 1) / 3), Math.round(((n - 1) * 2) / 3), n - 1])];
  const at = Math.min(index ?? n - 1, n - 1);
  const move = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((((e.clientX - rect.left) * W) / rect.width - L) / (W - L - R)) * (n - 1));
    setIndex(Math.max(0, Math.min(n - 1, i)));
  };
  const key = (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    setIndex(Math.max(0, Math.min(n - 1, at + (e.key === "ArrowRight" ? 1 : -1))));
  };
  if (!n) return null;
  return (
    <>
      <div className="pi-legend">
        <span>
          <i />
          ช่วงที่เลือก
        </span>
        <span>
          <i className="prev" />
          ช่วงก่อนหน้า
        </span>
      </div>
      <svg
        className="pi-chart"
        viewBox={`0 0 ${W} ${H}`}
        tabIndex={0}
        role="img"
        aria-label="กราฟเปรียบเทียบรายวัน กดลูกศรซ้ายขวาเพื่ออ่านแต่ละวัน"
        onPointerMove={move}
        onKeyDown={key}
      >
        {grid.map((v) => (
          <g key={v}>
            <path d={`M${L} ${Y(v)}H${W - R}`} stroke="#e4e4e7" strokeDasharray="3 4" />
            <text x={L - 8} y={Y(v) + 4} textAnchor="end">
              {num(v / unit)}
            </text>
          </g>
        ))}
        <polygon points={`${L},${Y(0)} ${pts(current)} ${X(n - 1)},${Y(0)}`} fill="rgba(198,250,49,.35)" />
        <polyline points={pts(previous)} fill="none" stroke="#a1a1aa" strokeWidth="2" strokeDasharray="6 5" />
        <polyline points={pts(current)} fill="none" stroke="#09090b" strokeWidth="3" strokeLinejoin="round" />
        {ticks.map((i) => (
          <text key={i} x={X(i)} y={H - 7} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}>
            {thaiDate(current[i].day)}
          </text>
        ))}
        <path d={`M${X(at)} ${T}V${H - B}`} stroke="#d4d4d8" />
        <circle cx={X(at)} cy={Y(valueOf(current[at]))} r="5" fill="#c6fa31" stroke="#09090b" strokeWidth="2" />
      </svg>
      <div className="pi-readout">{readout(at, format)}</div>
    </>
  );
}

function Kpis({ items }) {
  return (
    <section className="pi-kpis" aria-label="ตัวเลขสำคัญ">
      {items.map((k) => (
        <article className="pi-kpi" key={k.title}>
          <div className="pi-khead">{k.title}</div>
          <div className="pi-big">
            {k.value} {k.unit && <small>{k.unit}</small>}
          </div>
          {k.badge !== undefined && <span className={"pi-change" + (k.down ? " neg" : "")}>{k.badge}</span>}
          {k.note && <span className="pi-note">{k.note}</span>}
        </article>
      ))}
    </section>
  );
}

function Seg({ value, options, onChange, label }) {
  return (
    <div className="pi-seg" role="group" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={v} type="button" className={v === value ? "sel" : ""} aria-pressed={v === value} onClick={() => onChange(v)}>
          {text}
        </button>
      ))}
    </div>
  );
}

/* ======================================================================= */

function ProjectView({ shop, source, setSource }) {
  const { data: state } = Q();
  const [days, setDays] = useState(7);
  const [filter, setFilter] = useState("all");
  const [metric, setMetric] = useState("revenue");
  const [timeMetric, setTimeMetric] = useState("order");
  const [audienceBy, setAudienceBy] = useState("grade");
  const sample = source === "demo";

  const demoData = useMemo(() => snackDemo(), []);
  const mineData = useMemo(() => shopDataset(state, shop.id), [state, shop.id]);
  const data = sample ? demoData : mineData;
  const n = sample ? 5 : days;
  const f = data.posts.some((p) => p.id === filter) ? filter : "all";
  const r = useMemo(() => report(data, n, f), [data, n, f]);
  const a = r.now;

  const funnel = sample ? null : shopFunnel(state, shop.id, f);
  const peers = sample ? null : peerFunnel(state, shop.id);
  const unknownCost = !sample && r.posts.some((p) => !p.costKnown);
  const hasDelivered = data.sales.some((s) => s.status === "delivered");

  const badge = (x, y) => (r.priorComplete ? (change(x, y) === null ? "ยังเทียบไม่ได้" : pct(change(x, y))) : "รอข้อมูล");
  const kpis = [
    { title: "ยอดขาย", value: money(a.revenue), badge: badge(a.revenue, r.before.revenue), down: a.revenue < r.before.revenue, note: "เทียบช่วงก่อน" },
    sample
      ? { title: "การเห็นโพสต์", value: num(a.seen), unit: "คน", badge: "ยังเทียบไม่ได้", note: "เทียบช่วงก่อน" }
      : { title: "การเข้าชม", value: num(funnel.views), unit: "ครั้ง", note: "รวมตั้งแต่เปิดร้าน" },
    { title: "ออเดอร์ส่งมอบ", value: num(a.orders), unit: "ออเดอร์", badge: badge(a.orders, r.before.orders), down: a.orders < r.before.orders, note: "เทียบช่วงก่อน" },
    { title: "กำไรหลังหักต้นทุน", value: money(a.profit), badge: badge(a.profit, r.before.profit), down: a.profit < r.before.profit, note: "เทียบช่วงก่อน" },
  ];

  // บทเรียนใต้กราฟ
  const productRows = r.posts.map((p) => ({ p, m: r.product[p.id] })).sort((x, y) => y.m.revenue - x.m.revenue);
  let growthLesson, funnelLesson, profitLesson, mixLesson, forecastText, funnelTable, timing, audience;
  if (sample) {
    const bench = snackFunnel(data, r);
    funnelTable = bench;
    funnelLesson = bench;
    const growth = change(a.revenue, r.before.revenue);
    const byProduct = productRows
      .map(({ p, m }) => {
        const diff = m.revenue - report(data, n, p.id).before.revenue;
        return p.title + "ทำรายได้" + (diff < 0 ? "ลดลง " : "เพิ่ม ") + money(Math.abs(diff));
      })
      .join(" ส่วน");
    const mg = data.peers.marketGrowth,
      gap = growth - mg;
    const ctx = r.posts.length === data.posts.length ? " หมวดขนมโรงเรียนในตัวอย่างโต " + num(mg) + "% ร้านโต" + (gap >= 0 ? "สูงกว่า " : "ต่ำกว่า ") + num(Math.abs(gap)) + " จุดเปอร์เซ็นต์" : "";
    growthLesson = {
      meaning: "รายได้" + (growth < 0 ? "ลดลง " : "โต ") + num(Math.abs(growth)) + "% จาก " + money(r.before.revenue) + " เป็น " + money(a.revenue) + " เพราะ" + byProduct + ctx,
      action: r.posts.some((p) => p.id === "brownie")
        ? "ใช้ยอดจองบราวนี่เป็นตัวกำหนดจำนวนที่จะทำเพิ่มรอบหน้า แล้วเทียบกำไรรวมกับสัปดาห์นี้ หากยอดขายเพิ่มแต่กำไรลด ให้ตรวจต้นทุนของรอบที่เพิ่มก่อนขยายต่อ"
        : "ลองเสนอคุกกี้ที่มีอยู่ให้ลูกค้าชิมหนึ่งรอบ บันทึกต้นทุนที่ใช้ชิม แล้วเทียบกำไรหลังหักค่านี้กับรอบปกติก่อนทำซ้ำ",
    };
    mixLesson = snackStock(r);
    profitLesson = snackFinance(r);
    timing = snackTiming(data, r, timeMetric === "delivery");
    audience = snackAudience(r.posts, audienceBy);
  } else {
    const forecast = prediction(data, f);
    const [finance, , growth, mix] = projectLessons(r, null, forecast);
    growthLesson = growth;
    forecastText = forecast === null ? "" : growth.measure;
    profitLesson = finance;
    mixLesson = { ...mix, meaning: mix.evidence + " " + mix.meaning };
    funnelLesson = mineFunnelLesson(funnel);
    const t = timeLesson(a, timeMetric === "delivery");
    timing = { ...t, labels: slotNames, counts: timeMetric === "delivery" ? a.slots : a.orderSlots };
    if (peers && funnel.products) {
      funnelTable = {
        shops: peers.shops,
        rows: [
          ["เข้าชมเฉลี่ยต่อสินค้า", funnel.views / funnel.products, peers.views / peers.products, "ครั้ง"],
          ["สั่งซื้อเฉลี่ยต่อสินค้า", funnel.placed / funnel.products, peers.placed / peers.products, "ครั้ง"],
          ["สั่งซื้อจากการเข้าชม", funnel.views ? (100 * funnel.placed) / funnel.views : null, (100 * peers.placed) / peers.views, "%"],
        ],
      };
    }
  }

  const timeUnit = timeMetric === "delivery" ? " ชิ้น" : " ออเดอร์";

  return (
    <>
      <div className="pi-filters">
        <div className="pi-filter-left">
          <select aria-label="กรองตามสินค้า" value={f} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">สินค้าทั้งหมด</option>
            {data.posts.map((p) => (
              <option value={p.id} key={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          <span className="pi-dates">
            {thaiDate(r.start)} – {thaiDate(r.end)}
          </span>
          {sample && <span className="pi-sample">ร้านขนม · ข้อมูลสมมติ 5 วันเรียน</span>}
        </div>
        {!sample && (
          <Seg
            label="ช่วงเวลา"
            value={days}
            onChange={setDays}
            options={[
              [7, "7 วัน"],
              [14, "14 วัน"],
              [30, "30 วัน"],
            ]}
          />
        )}
      </div>

      {!sample && !hasDelivered && (
        <div className="pi-status">
          ร้านยังไม่มีออเดอร์ที่ส่งมอบ ตัวเลขจะเริ่มขึ้นเมื่อส่งมอบออเดอร์แรก
          <button type="button" className="pi-link" onClick={() => setSource("demo")}>
            ดูร้านตัวอย่าง
          </button>
        </div>
      )}

      <Kpis items={kpis} />

      <section className="pi-panel pi-growth">
        <div className="pi-panelhead">
          <h2>การเติบโตของร้านเรา</h2>
          <select aria-label="ตัวชี้วัดในกราฟ" value={metric} onChange={(e) => setMetric(e.target.value)}>
            <option value="revenue">ยอดขาย</option>
            <option value="units">จำนวนชิ้น</option>
            <option value="profit">กำไร</option>
          </select>
        </div>
        <LineChart
          current={r.current}
          previous={r.previous}
          valueOf={(d) => d[metric]}
          unit={metric === "units" ? 1 : 100}
          format={(v) => fmtMetric(metric, v)}
          readout={(i) =>
            thaiDate(r.current[i].day) + " · " + fmtMetric(metric, r.current[i][metric]) + "   /   " + thaiDate(r.previous[i].day) + " · " + fmtMetric(metric, r.previous[i][metric])
          }
        />
        <p className="pi-compare">
          {!r.priorComplete
            ? "ยังมีประวัติไม่ครบสองช่วง"
            : r.before[metric] <= 0
              ? "ช่วงก่อน " + fmtMetric(metric, r.before[metric]) + " · ต่างกัน " + fmtMetric(metric, a[metric] - r.before[metric])
              : "จาก " + fmtMetric(metric, r.before[metric]) + " เป็น " + fmtMetric(metric, a[metric]) + " (" + pct(change(a[metric], r.before[metric])) + ")"}
        </p>
        <Coach lesson={growthLesson} extra={forecastText} />
      </section>

      <div className="pi-details">
        <section className="pi-panel">
          <h2>จำนวนผู้ที่เข้าถึงสินค้า</h2>
          {sample ? (
            <Bars
              items={[
                ["เห็นโพสต์", a.seen, BAR[0]],
                ["เปิดดูสินค้า", a.opened, BAR[1]],
                ["สั่งซื้อ", a.placed, BAR[2]],
              ]}
              format={(v) => num(v) + " คน"}
            />
          ) : (
            <Bars
              items={[
                ["เข้าชม", funnel.views, BAR[0]],
                ["กดสนใจ", funnel.wishes, BAR[1]],
                ["สั่งซื้อ", funnel.placed, BAR[2]],
              ]}
              format={(v) => num(v) + " ครั้ง"}
            />
          )}
          <p className="pi-caption">
            {sample ? "กดใจ " + num(a.liked) + " คน · แสดงแยกจากขั้นตอนสั่งซื้อ" : "นับรวมตั้งแต่เปิดร้าน · ระบบยังไม่เก็บยอดเข้าชมรายวัน"}
          </p>
          {funnelTable ? (
            <>
              <table className="pi-table">
                <caption>
                  เทียบกับ{sample ? "ร้านขนมตัวอย่าง" : "ร้านอื่น"} {num(funnelTable.shops)} ร้าน
                </caption>
                <thead>
                  <tr>
                    <th scope="col">ตัวชี้วัด</th>
                    <th scope="col">ร้านของคุณ</th>
                    <th scope="col">ร้านอื่น</th>
                  </tr>
                </thead>
                <tbody>
                  {funnelTable.rows.map(([label, mine, other, unit]) => (
                    <tr key={label}>
                      <th scope="row">{label}</th>
                      <td>{mine === null ? "—" : num(Math.round(mine * 100) / 100) + (unit === "%" ? "%" : " " + unit)}</td>
                      <td>{num(Math.round(other * 100) / 100) + (unit === "%" ? "%" : " " + unit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            !sample && <p className="pi-caption">จะแสดงค่าเฉลี่ยเมื่อมีร้านอื่นอย่างน้อย 3 ร้านที่มีคนเข้าชม</p>
          )}
          <Coach lesson={funnelLesson} />
        </section>

        <section className="pi-panel">
          <div className="pi-panelhead">
            <h2>ขายดีช่วงไหน</h2>
            <select aria-label="เลือกข้อมูลเวลา" value={timeMetric} onChange={(e) => setTimeMetric(e.target.value)}>
              <option value="order">เวลาสั่งซื้อ</option>
              <option value="delivery">เวลาส่งมอบ</option>
            </select>
          </div>
          <Bars items={timing.labels.map((name, i) => [name, timing.counts[i], BAR[i % 4]])} format={(v) => num(v) + timeUnit} />
          {sample && (
            <details className="pi-daily">
              <summary>ดูยอดแยกตามวัน</summary>
              <Bars items={timing.days.map(([name, count]) => [name, count, BAR[0]])} format={(v) => num(v) + timeUnit} />
            </details>
          )}
          <Coach lesson={timing} />
        </section>

        {sample && (
          <section className="pi-panel">
            <div className="pi-panelhead">
              <h2>ใครเห็นโพสต์แล้วสั่งซื้อ</h2>
              <select aria-label="เลือกวิธีแบ่งกลุ่มลูกค้า" value={audienceBy} onChange={(e) => setAudienceBy(e.target.value)}>
                <option value="grade">ระดับชั้น</option>
                <option value="gender">เพศ</option>
              </select>
            </div>
            <table className="pi-table">
              <thead>
                <tr>
                  <th scope="col">{audienceBy === "gender" ? "เพศ" : "ระดับชั้น"}</th>
                  <th scope="col">เห็นโพสต์</th>
                  <th scope="col">สั่งซื้อ</th>
                  <th scope="col">สั่งต่อคนเห็น</th>
                </tr>
              </thead>
              <tbody>
                {audience.rows.map((row) => (
                  <tr key={row.name}>
                    <th scope="row">{row.name}</th>
                    <td>{num(row.seen)}</td>
                    <td>{num(row.orders)}</td>
                    <td>{num(Math.round(row.rate * 100) / 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Coach lesson={audience} />
          </section>
        )}

        <section className="pi-panel">
          <h2>ยอดขายเหลือกำไรเท่าไหร่</h2>
          <Bars
            items={[
              ["ยอดขายที่ส่งมอบ", a.revenue, BAR[0]],
              ["ต้นทุนสินค้าที่ขาย", a.variable, BAR[2]],
              ["ค่าใช้จ่ายคงที่", a.fixed, BAR[3]],
              [a.profit < 0 ? "ขาดทุน" : "กำไร", a.profit, a.profit < 0 ? "var(--danger)" : BAR[1]],
            ]}
            format={money}
          />
          {!sample && (
            <p className="pi-caption">
              ใช้ราคาและต้นทุนตอนขาย · ระบบยังไม่มีบันทึกค่าใช้จ่ายคงที่{unknownCost ? " · บางสินค้ายังไม่ใส่ต้นทุน" : ""}
            </p>
          )}
          <Coach lesson={profitLesson} />
        </section>

        <section className={"pi-panel" + (sample ? " pi-wide" : "")}>
          <h2>ภาพรวมของสินค้า</h2>
          {productRows.length ? (
            <div className="pi-scroll">
              <table className="pi-table pi-sales">
                <thead>
                  <tr>
                    <th scope="col">สินค้า</th>
                    <th scope="col">ขาย (ชิ้น)</th>
                    <th scope="col">ราคา/ชิ้น</th>
                    <th scope="col">ช่วงก่อน (ชิ้น)</th>
                    <th scope="col">สต็อกเหลือ</th>
                    <th scope="col">ยอดขาย</th>
                    <th scope="col">กำไร</th>
                  </tr>
                </thead>
                <tbody>
                  {productRows.map(({ p, m }) => (
                    <tr key={p.id}>
                      <th scope="row">
                        <span>{p.title}</span>
                        <i className="pi-mixbar" style={{ width: (productRows[0].m.revenue ? (m.revenue / productRows[0].m.revenue) * 100 : 0) + "%" }} />
                      </th>
                      <td data-label="ขาย (ชิ้น)">{num(m.units)}</td>
                      <td data-label="ราคา/ชิ้น">{money(p.price)}</td>
                      <td data-label="ช่วงก่อน (ชิ้น)">{num(report(data, n, p.id).before.units)}</td>
                      <td data-label="สต็อกเหลือ">{num(p.stock)}</td>
                      <td data-label="ยอดขาย">{money(m.revenue)}</td>
                      <td data-label="กำไร" className={m.profit < 0 ? "neg" : ""}>{money(m.profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="pi-caption">ยังไม่มีสินค้า</p>
          )}
          <Coach lesson={mixLesson} />
        </section>
      </div>
    </>
  );
}

/* ======================================================================= */

function sampleMarket() {
  const d = demo();
  return {
    posts: d.posts.map(({ id, title, created }) => ({ id, title, created })),
    sales: d.posts.flatMap((p) => {
      const rep = report(d, 30, p.id);
      return rep.current.concat(rep.previous).map((x) => ({ post: p.id, day: x.day, revenue: x.revenue, units: x.units, orders: x.orders }));
    }),
  };
}

function realMarket(state) {
  const posts = state.products.map((p) => ({
    id: p.id,
    title: p.name + " · " + (state.shops.find((s) => s.id === p.shopId)?.name || "ร้าน"),
  }));
  const sales = [];
  for (const o of state.orders) {
    if (o.status !== "delivered") continue;
    const at = (o.history || []).find((h) => h.status === "delivered")?.date || o.date;
    const day = dateOf(at);
    o.items.forEach((it, i) => sales.push({ post: it.productId, day, revenue: satang(it.price) * it.qty, units: Number(it.qty) || 0, orders: i === 0 ? 1 : 0 }));
  }
  return { posts, sales };
}

function schoolReport(dataset, days) {
  const end = today(),
    start = shift(end, 1 - days),
    prevStart = shift(start, -days);
  const rows = Array.from({ length: days * 2 }, (_, i) => ({ day: shift(prevStart, i), revenue: 0, orders: 0, units: 0 }));
  const byDate = new Map(rows.map((d) => [d.day, d]));
  const products = new Map(dataset.posts.map((p) => [p.id, { ...p, sales: 0, before: 0, units: 0, orders: 0, points: Array(days).fill(0) }]));
  for (const s of dataset.sales) {
    const d = byDate.get(s.day),
      p = products.get(s.post);
    if (!d || !p) continue;
    d.revenue += s.revenue;
    d.orders += s.orders;
    d.units += s.units;
    if (s.day >= start) {
      p.sales += s.revenue;
      p.orders += s.orders;
      p.units += s.units;
      p.points[Math.round((Date.parse(s.day) - Date.parse(start)) / 864e5)] += s.revenue;
    } else p.before += s.revenue;
  }
  const current = rows.slice(days),
    previous = rows.slice(0, days);
  const total = (items) => items.reduce((x, y) => ({ revenue: x.revenue + y.revenue, units: x.units + y.units, orders: x.orders + y.orders }), { revenue: 0, units: 0, orders: 0 });
  return { current, previous, now: total(current), before: total(previous), products: [...products.values()], start, end };
}

function Spark({ points, down }) {
  const lo = Math.min(0, ...points),
    hi = Math.max(1, ...points);
  const path = points.map((v, i) => ((i * 120) / Math.max(1, points.length - 1)).toFixed(1) + "," + (29 - ((v - lo) / (hi - lo)) * 26).toFixed(1)).join(" ");
  return (
    <svg className="pi-spark" viewBox="0 0 120 32" aria-hidden="true">
      <polyline points={path} stroke={down ? "#dc2626" : "#09090b"} fill="none" strokeWidth="2.5" />
    </svg>
  );
}

function SchoolView({ onProject }) {
  const { data: state } = Q();
  const [days, setDays] = useState(7);
  const [mode, setMode] = useState("real");
  const [sort, setSort] = useState("sales");
  const sampleData = useMemo(() => sampleMarket(), []);
  const realData = useMemo(() => realMarket(state), [state]);
  const a = schoolReport(mode === "demo" ? sampleData : realData, days);

  const growth = change(a.now.revenue, a.before.revenue);
  const active = a.products.filter((p) => p.sales > 0 || p.before > 0);
  const delta = (p) => change(p.sales, p.before);
  const growthLabel = (p) => (delta(p) === null ? (p.sales ? "เริ่มมียอดขาย" : "—") : pct(delta(p)));
  const trend = (p) => (p.sales > p.before ? "up" : p.sales < p.before ? "down" : "flat");
  const sorted = [...active].sort((x, y) => (sort === "growth" ? (delta(y) ?? -Infinity) - (delta(x) ?? -Infinity) || y.sales - x.sales : y.sales - x.sales));
  const up = active.filter((p) => p.sales > p.before).length,
    down = active.filter((p) => p.sales < p.before).length;
  const leader = active.reduce((best, p) => (!best || p.sales > best.sales ? p : best), null);
  const total = a.now.revenue;
  const share = (x, y) => (y ? num(Math.round((x / y) * 1000) / 10) + "%" : "—");
  const headline =
    growth === null
      ? total
        ? "เริ่มมียอดขายในช่วงที่เลือก"
        : "ยังอ่านทิศทางตลาดไม่ได้"
      : growth === 0
        ? "ยอดขายรวมทรงตัว"
        : "ยอดขายรวม" + (growth > 0 ? "เพิ่มขึ้น " : "ลดลง ") + share(Math.abs(total - a.before.revenue), a.before.revenue);
  const lesson = {
    meaning:
      headline +
      " · ส่งมอบ " +
      num(a.now.units) +
      " ชิ้น รวม " +
      money(total) +
      " เทียบกับ " +
      num(a.before.units) +
      " ชิ้น และ " +
      money(a.before.revenue) +
      " ในช่วงก่อน " +
      (total && leader
        ? leader.title + " คิดเป็น " + share(leader.sales, total) + " ของยอดขายรวม มีสินค้า " + num(up) + " รายการที่ยอดเพิ่ม และ " + num(down) + " รายการที่ยอดลด"
        : a.before.revenue
          ? "ช่วงก่อนมียอดส่งมอบ แต่ช่วงนี้ยังไม่พบยอดส่งมอบ"
          : "เมื่อมีออเดอร์ส่งมอบ จะเริ่มเห็นว่าสินค้าใดมีส่วนต่อยอดขายของโรงเรียน"),
    action: total
      ? "เลือกสินค้าที่ทั้งยอดขายและจำนวนชิ้นเพิ่ม แล้วลองเปิดรับจองสินค้าคล้ายกันหนึ่งรอบ ใช้จำนวนจองจริงกำหนดจำนวนผลิต และเช็กกำไรหลังส่งมอบ"
      : "เปิดโปรเจกต์เพื่อตรวจต้นทุนและวางแผนออเดอร์แรก",
  };

  return (
    <>
      <div className="pi-filters">
        <div className="pi-filter-left">
          <select aria-label="แหล่งข้อมูลตลาด" value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="real">ข้อมูลจริง</option>
            <option value="demo">ตลาดตัวอย่าง</option>
          </select>
          <span className="pi-dates">
            {thaiDate(a.start)} – {thaiDate(a.end)} · เทียบ {days} วันก่อน
          </span>
        </div>
        <Seg
          label="ช่วงเวลาตลาด"
          value={days}
          onChange={setDays}
          options={[
            [7, "7 วัน"],
            [14, "14 วัน"],
            [30, "30 วัน"],
          ]}
        />
      </div>
      {mode === "real" && !realData.sales.length && <div className="pi-status">ยังไม่มียอดขายที่ส่งมอบในระบบนี้</div>}

      <Kpis
        items={[
          { title: "ยอดขายรวม", value: money(a.now.revenue) },
          { title: "ชิ้นที่ขายได้", value: num(a.now.units), unit: "ชิ้น" },
          { title: "ออเดอร์ส่งมอบ", value: num(a.now.orders), unit: "ออเดอร์" },
          { title: "สินค้าที่มียอดขาย", value: num(a.products.filter((p) => p.sales > 0).length), unit: "รายการ" },
        ]}
      />

      <section className="pi-panel pi-growth">
        <div className="pi-panelhead">
          <h2>ยอดขายรวมรายวัน</h2>
          <strong className={a.now.revenue < a.before.revenue ? "down" : "up"}>{growth === null ? "ยังเทียบไม่ได้" : pct(growth)}</strong>
        </div>
        <LineChart
          current={a.current}
          previous={a.previous}
          valueOf={(d) => d.revenue}
          unit={100}
          format={money}
          readout={(i) => thaiDate(a.current[i].day) + " · " + money(a.current[i].revenue) + " · " + num(a.current[i].units) + " ชิ้น"}
        />
        <Coach lesson={lesson} />
        <button type="button" className="pi-outline" onClick={onProject}>
          วิเคราะห์ต้นทุนของโปรเจกต์
        </button>
      </section>

      <div className="pi-market">
        <section className="pi-panel">
          <h2>กระดานยอดขายสินค้า</h2>
          <div className="pi-scroll">
            <table className="pi-table pi-board">
              <thead>
                <tr>
                  <th scope="col">สินค้า</th>
                  <th scope="col">
                    <button type="button" onClick={() => setSort("sales")} aria-pressed={sort === "sales"}>
                      ยอดขาย ↕
                    </button>
                  </th>
                  <th scope="col">
                    <button type="button" onClick={() => setSort("growth")} aria-pressed={sort === "growth"}>
                      เติบโต ↕
                    </button>
                  </th>
                  <th scope="col">ชิ้น</th>
                  <th scope="col">แนวโน้ม</th>
                </tr>
              </thead>
              <tbody>
                {sorted.length ? (
                  sorted.map((p) => (
                    <tr key={p.id}>
                      <th scope="row">{p.title}</th>
                      <td data-label="ยอดขาย">{money(p.sales)}</td>
                      <td data-label="เติบโต" className={trend(p)}>{growthLabel(p)}</td>
                      <td data-label="ชิ้น">{num(p.units)}</td>
                      <td data-label="แนวโน้ม">
                        <Spark points={p.points} down={p.sales < p.before} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5}>ยังไม่มียอดขายในช่วงนี้</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        <aside className="pi-panel">
          <h2>ทิศทางตลาด</h2>
          <div className="pi-breadth">
            <div>
              <strong className="up">{up}</strong>
              <span>เพิ่มขึ้น</span>
            </div>
            <div>
              <strong className="flat">{active.length - up - down}</strong>
              <span>ทรงตัว</span>
            </div>
            <div>
              <strong className="down">{down}</strong>
              <span>ลดลง</span>
            </div>
          </div>
          <h2 className="pi-share-title">สัดส่วนยอดขาย</h2>
          <Bars
            items={[...active].sort((x, y) => y.sales - x.sales).map((p, i) => [p.title, total ? (p.sales / total) * 100 : 0, BAR[i % 4]])}
            format={(v) => num(Math.round(v * 10) / 10) + "%"}
          />
        </aside>
      </div>
    </>
  );
}

/* ======================================================================= */

export function ProjectInsights({ shop }) {
  const [view, setView] = useState("project");
  const [source, setSource] = useState("mine");
  return (
    <div className="pi">
      <div className="pi-heading">
        <Seg
          label="มุมมอง"
          value={view}
          onChange={setView}
          options={[
            ["project", "โปรเจกต์ของฉัน"],
            ["school", "ภาพรวมโรงเรียน"],
          ]}
        />
        {view === "project" && (
          <label className="pi-source">
            <span>แหล่งข้อมูล</span>
            <select value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="mine">ร้านของฉัน</option>
              <option value="demo">ร้านตัวอย่าง</option>
            </select>
          </label>
        )}
      </div>
      {view === "project" ? (
        <ProjectView shop={shop} source={source} setSource={setSource} key={source} />
      ) : (
        <SchoolView
          onProject={() => {
            setView("project");
          }}
        />
      )}
    </div>
  );
}
