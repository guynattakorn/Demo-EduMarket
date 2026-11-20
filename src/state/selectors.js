// state/selectors.js
// แหล่งโค้ดจริงของ app.js — แก้ไขไฟล์ใน src/ แล้วรัน `npm run build`

/** จำนวนคนกดถูกใจของสินค้า (wishBase + wishedBy) */
export const bl = (t) => t.wishBase + t.wishedBy.length;

/** คะแนนรีวิวเฉลี่ยของสินค้า */
export function Xu(t, e) {
  let a = t.reviews.filter((l) => l.productId === e);
  return a.length ? a.reduce((l, n) => l + n.rating, 0) / a.length : 0;
}

/**
 * สรุปยอดขาย/ต้นทุน/กำไรของร้านจากออเดอร์ที่ส่งมอบแล้ว
 * revenue = ยอดขายสุทธิหลังหักส่วนลดคูปอง/โค้ด (ราคาในรายการสินค้าเป็นราคาหลังลดรายสินค้าแล้ว)
 */
export function na(state, shopId) {
  const delivered = state.orders.filter((o) => o.shopId === shopId && o.status === "delivered");
  const items = delivered.flatMap((o) => o.items);
  const gross = items.reduce((sum, it) => sum + it.price * it.qty, 0);
  const discount = delivered.reduce((sum, o) => sum + (Number(o.discountAmount) || 0), 0);
  const known = items.filter((it) => it.cost !== null && it.cost !== undefined);
  const cost = known.reduce((sum, it) => sum + it.cost * it.qty, 0);
  const products = state.products.filter((p) => p.shopId === shopId);
  const reviews = state.reviews.filter((r) => products.some((p) => p.id === r.productId));
  return {
    revenue: gross - discount,
    grossRevenue: gross,
    discount,
    cost,
    profit: known.reduce((sum, it) => sum + (it.price - it.cost) * it.qty, 0) - discount,
    unknownCost: items.length !== known.length,
    sold: items.reduce((sum, it) => sum + it.qty, 0),
    orders: delivered.length,
    views: products.reduce((sum, p) => sum + p.views, 0),
    wishes: products.reduce((sum, p) => sum + bl(p), 0),
    rating: reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0,
    reviewCount: reviews.length,
  };
}

/** คำนวณกำไร/จุดคุ้มทุนแบบง่ายสำหรับเครื่องคิดเลข */
export const Qu = (t, e, a = 100, l = 20) => ({
  profit: (t - l) * e - a,
  revenue: t * e,
  cost: a + l * e,
  unit: l + a / e,
  breakeven: t > l ? Math.ceil(a / (t - l)) : null,
});
