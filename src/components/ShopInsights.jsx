// components/ShopInsights.jsx
// แหล่งโค้ดจริงของ app.js — แก้ไขไฟล์ใน src/ แล้วรัน `npm run build`
import { useState } from "react";
import { EmptyState, SectionTitle } from "./ui.jsx";
import { Q } from "../state/context.js";
import { bl, na } from "../state/selectors.js";
import { Nt, Pt } from "../utils/format.js";

/** สรุปผลประกอบการของร้าน — เดิมชื่อ Xp */
export function ShopInsights({ shop: t }) {
  let { data: e } = Q(),
    [a, l] = useState("all"),
    n = na(e, t.id),
    i = e.products.filter((p) => p.shopId === t.id),
    c = i.filter((p) => a === "all" || p.id === a),
    u = e.logs.filter((p) => p.shopId === t.id && (a === "all" || p.productId === a)),
    o = Math.max(1, ...c.map((p) => p.views)),
    d = e.orders
      .filter((p) => p.shopId === t.id && p.status === "delivered")
      .map((p) => ({
        ...p,
        items: p.items.filter((r) => a === "all" || r.productId === a),
      })),
    g = Array.from(
      {
        length: 7,
      },
      (p, r) => {
        let v = new Date(Date.now() - (6 - r) * 864e5).toISOString().slice(0, 10),
          b = d.filter((z) => z.date.slice(0, 10) === v).flatMap((z) => z.items);
        return {
          date: v,
          revenue: b.reduce((z, f) => z + f.price * f.qty, 0),
          cost: b.reduce((z, f) => z + (f.cost ?? 0) * f.qty, 0),
          profit: b
            .filter((z) => z.cost !== null && z.cost !== void 0)
            .reduce((z, f) => z + (f.price - f.cost) * f.qty, 0),
        };
      },
    ),
    h = Math.max(1, ...g.map((p) => Math.max(p.revenue, p.cost, Math.abs(p.profit))));
  return (
    <>
      <div className="analytics-filter">
        <label htmlFor="product-stat-filter">สินค้า</label>
        <select id="product-stat-filter" value={a} onChange={(p) => l(p.target.value)}>
          <option value="all">ทั้งหมด</option>
          {i.map((p) => (
            <option value={p.id} key={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div className="two-col">
        <section className="card">
          <SectionTitle title="รายรับและกำไร 7 วัน" />
          <div className="chart-legend">
            <span>
              <i className="lime" />
              รายรับ
            </span>
            <span>
              <i className="orange" />
              ต้นทุน
            </span>
            <span>
              <i className="lavender" />
              กำไร
            </span>
          </div>
          <div
            className="bar-chart"
            role="img"
            aria-label="กราฟรายรับ ต้นทุนสินค้า และกำไรประมาณการ 7 วัน แท่งลายแดงคือขาดทุน"
          >
            <div className="bar-chart-grid">
              {g.map((p) => (
                <div className="bar-day" key={p.date}>
                  <div className="bar-pair">
                    <div
                      className="bar lime"
                      style={{
                        height: `${(p.revenue / h) * 140 + 2}px`,
                      }}
                      title={"รายรับ ฿" + p.revenue}
                    />
                    <div
                      className="bar orange"
                      style={{
                        height: `${(p.cost / h) * 140 + 2}px`,
                      }}
                      title={"ต้นทุน ฿" + p.cost}
                    />
                    <div
                      className={"bar " + (p.profit < 0 ? "negative-bar" : "lavender")}
                      style={{
                        height: `${(Math.abs(p.profit) / h) * 140 + 2}px`,
                      }}
                      title={"กำไรประมาณการ ฿" + p.profit}
                    />
                  </div>
                  <small>{new Date(p.date).getDate()}</small>
                </div>
              ))}
            </div>
          </div>
          <div className="chart-totals">
            <span>
              {"รายรับ "}
              <b>฿{Nt(g.reduce((p, r) => p + r.revenue, 0))}</b>
            </span>
            <span>
              {"ต้นทุน "}
              <b>฿{Nt(g.reduce((p, r) => p + r.cost, 0))}</b>
            </span>
          </div>
          <p className="hint">
            นับเฉพาะออเดอร์ที่ส่งมอบแล้ว · แท่งแดง = ขาดทุน
            {n.unknownCost ? " \xB7 บางสินค้ายังไม่ใส่ต้นทุน" : ""}
          </p>
          <details>
            <summary>ตัวเลขรายวัน</summary>
            <table>
              <thead>
                <tr>
                  <th>วัน</th>
                  <th>รายรับ</th>
                  <th>ต้นทุน</th>
                  <th>กำไร</th>
                </tr>
              </thead>
              <tbody>
                {g.map((p) => (
                  <tr key={p.date}>
                    <td>{Pt(p.date)}</td>
                    <td>{p.revenue}</td>
                    <td>{p.cost}</td>
                    <td>{p.profit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </section>
        <section className="card">
          <SectionTitle title="เข้าชม · สนใจ · ขาย" />
          <div className="chart-legend">
            <span>
              <i className="soft-gray" />
              เข้าชม
            </span>
            <span>
              <i className="orange" />
              สนใจ
            </span>
            <span>
              <i className="lime" />
              ขายแล้ว
            </span>
          </div>
          {c.map((p) => {
            let r = d
              .flatMap((v) => v.items)
              .filter((v) => v.productId === p.id)
              .reduce((v, b) => v + b.qty, 0);
            return (
              <div className="demand-row" key={p.id}>
                <strong>{p.name}</strong>
                <div className="demand-track">
                  <i
                    className="soft-gray"
                    style={{
                      width: `${(p.views / o) * 100}%`,
                    }}
                  />
                </div>
                <div className="demand-track">
                  <i
                    className="orange"
                    style={{
                      width: `${(bl(p) / o) * 100}%`,
                    }}
                  />
                </div>
                <div className="demand-track">
                  <i
                    className="lime"
                    style={{
                      width: `${Math.min((r / o) * 100, 100)}%`,
                    }}
                  />
                </div>
                <small>
                  {"เข้าชม "}
                  {p.views}
                  {" \xB7 สนใจ "}
                  {bl(p)}
                  {" \xB7 ขายแล้ว "}
                  {r}
                </small>
              </div>
            );
          })}
        </section>
      </div>
      <section className="card decision-card">
        <SectionTitle title="บันทึกการตัดสินใจ" />
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>วันที่ / สินค้า</th>
                <th>ปรับอะไร</th>
                <th>ก่อน → หลัง</th>
                <th>เหตุผล</th>
                <th>ผู้ปรับ</th>
              </tr>
            </thead>
            <tbody>
              {u.map((p) => (
                <tr key={p.id}>
                  <td>
                    <small>{Pt(p.date)}</small>
                    <strong>{e.products.find((r) => r.id === p.productId)?.name || "สินค้า"}</strong>
                  </td>
                  <td>{p.type}</td>
                  <td>
                    <b>
                      {p.before}
                      {" → "}
                      {p.after}
                    </b>
                  </td>
                  <td>{p.reason}</td>
                  <td>{e.users.find((r) => r.id === p.actor)?.name || p.actor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!u.length && <EmptyState>ยังไม่มีการปรับราคาหรือสต็อก</EmptyState>}
      </section>
    </>
  );
}
