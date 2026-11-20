// modals/OrderDetailModal.jsx
// แหล่งโค้ดจริงของ app.js — แก้ไขไฟล์ใน src/ แล้วรัน `npm run build`
import { OrderCard } from "../components/OrderCard.jsx";
import { EmptyState } from "../components/ui.jsx";
import { ORDER_STATUS } from "../config/constants.js";
import { Q } from "../state/context.js";
import { Nt, Pt, fmtTime } from "../utils/format.js";

/** รายละเอียดคำสั่งซื้อ + ประวัติสถานะ (เปิดจากการกดแจ้งเตือน) */
export function OrderDetailModal({ id }) {
  const { data } = Q();
  const order = data.orders.find((o) => o.id === id);
  if (!order) return <EmptyState>ไม่พบคำสั่งซื้อนี้</EmptyState>;
  const name = (uid) => data.users.find((u) => u.id === uid)?.name || "ระบบ";
  return (
    <div className="stack">
      <OrderCard order={order} />
      <section className="order-lines">
        <h3>รายการสินค้า</h3>
        {order.items.map((it) => (
          <div className="row-between" key={it.productId}>
            <span>
              {it.name} × {it.qty}
            </span>
            <span>
              ฿{Nt(it.price * it.qty)}
              {it.originalPrice > it.price && <s className="muted"> ฿{Nt(it.originalPrice * it.qty)}</s>}
            </span>
          </div>
        ))}
        {order.discountAmount > 0 && (
          <div className="row-between discount">
            <span>ส่วนลดโปรโมชัน/โค้ด</span>
            <span>-฿{Nt(order.discountAmount)}</span>
          </div>
        )}
      </section>
      {order.history?.length > 0 && (
        <section className="order-history">
          <h3>ประวัติสถานะ</h3>
          <ol>
            {order.history.map((h, i) => (
              <li key={i}>
                <strong>{ORDER_STATUS[h.status]?.label || h.status}</strong>
                <small>
                  {name(h.by)} · {Pt(h.date)} {fmtTime(h.date)}
                </small>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
