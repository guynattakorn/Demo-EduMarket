// components/ShopInsights.jsx
// แหล่งโค้ดจริงของ app.js — แก้ไขไฟล์ใน src/ แล้วรัน `npm run build`
import { EmptyState, SectionTitle } from "./ui.jsx";
import { Q } from "../state/context.js";
import { Pt } from "../utils/format.js";
import { ProjectInsights } from "./ProjectInsights.jsx";

/** สรุปผลของร้าน: แดชบอร์ดวิเคราะห์โปรเจกต์ + บันทึกการตัดสินใจ — เดิมชื่อ Xp */
export function ShopInsights({ shop: t }) {
  let { data: e } = Q(),
    u = e.logs.filter((p) => p.shopId === t.id);
  return (
    <>
      <ProjectInsights shop={t} />
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
