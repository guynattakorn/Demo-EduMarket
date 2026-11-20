// components/ReviewList.jsx
// แหล่งโค้ดจริงของ app.js — แก้ไขไฟล์ใน src/ แล้วรัน `npm run build`
import { Avatar } from "./Avatar.jsx";
import { EmptyState } from "./ui.jsx";
import { Q } from "../state/context.js";
import { Pt } from "../utils/format.js";

/** รายการรีวิวของสินค้า/ร้าน — เดิมชื่อ Ku */
export function ReviewList({ productId: t, shopId: e }) {
  let { data: a } = Q(),
    l = e ? a.products.filter((i) => i.shopId === e).map((i) => i.id) : [t],
    n = a.reviews.filter((i) => l.includes(i.productId));
  return (
    <div className="reviews">
      {n.length ? (
        n.map((i) => (
          <div className="review" key={i.id}>
            <Avatar name={a.users.find((c) => c.id === i.userId)?.name || "เพื่อน"} size="small" />
            <div>
              <strong>{a.users.find((c) => c.id === i.userId)?.name || "เพื่อนในโรงเรียน"}</strong>
              <span className="stars">
                {"★".repeat(i.rating)}
                {"☆".repeat(5 - i.rating)}
              </span>
              <p>{i.text}</p>
              <small>{Pt(i.date)}</small>
            </div>
          </div>
        ))
      ) : (
        <EmptyState>ยังไม่มีรีวิว</EmptyState>
      )}
    </div>
  );
}
