// components/OrderList.jsx
// แหล่งโค้ดจริงของ app.js — แก้ไขไฟล์ใน src/ แล้วรัน `npm run build`
import { Q } from "../state/context.js";
import { OrderCard } from "./OrderCard.jsx";
import { EmptyState } from "./ui.jsx";

/** รายการคำสั่งซื้อ (ผู้ซื้อ หรือ ร้านค้าเมื่อส่ง sellerShop) — เดิมชื่อ Vu */
export function OrderList({ sellerShop, filter = () => true, empty = "ยังไม่มีคำสั่งซื้อ" }) {
  const { data, user } = Q();
  const orders = data.orders
    .filter((o) => (sellerShop ? o.shopId === sellerShop : o.buyer === user.id))
    .filter(filter)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  return (
    <div className="stack">
      {orders.length ? orders.map((o) => <OrderCard order={o} key={o.id} />) : <EmptyState>{empty}</EmptyState>}
    </div>
  );
}
