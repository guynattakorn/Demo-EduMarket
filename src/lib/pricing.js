// lib/pricing.js
// ราคา ส่วนลด และยอดรวมของตะกร้า — ใช้ร่วมกันทั้งหน้าตลาดนัด ตะกร้า และ reducer (ตอนสร้างออเดอร์)
// เพื่อให้ตัวเลขที่ผู้ซื้อเห็นกับตัวเลขที่บันทึกในออเดอร์ตรงกันเสมอ

const round2 = (n) => Math.round(n * 100) / 100;

/** วันหมดอายุ (YYYY-MM-DD) นับรวมทั้งวันนั้น */
export function isExpired(promo, now = Date.now()) {
  if (!promo.expiresAt) return false;
  const end = new Date(promo.expiresAt + (promo.expiresAt.length <= 10 ? "T23:59:59" : ""));
  return Number.isFinite(end.getTime()) && end.getTime() < now;
}

/** โปรโมชันที่ใช้งานได้ตอนนี้ของร้าน (ไม่ถูกลบ เปิดอยู่ และยังไม่หมดอายุ) */
export function livePromotions(data, shopId, now = Date.now()) {
  return (data.promotions || []).filter(
    (p) => p.shopId === shopId && !p.deleted && p.active !== false && !isExpired(p, now),
  );
}

/** ส่วนลดต่อชิ้นจากโปรโมชันหนึ่งรายการ */
export function unitDiscount(promo, price) {
  const value = Number(promo.value) || 0;
  const off = promo.discountType === "percent" ? (price * Math.min(value, 100)) / 100 : value;
  return round2(Math.max(0, Math.min(price, off)));
}

/** ราคาหลังลดของสินค้า (ใช้ส่วนลดรายสินค้าที่ลดมากที่สุด) */
export function productPricing(data, product, now = Date.now()) {
  const price = Number(product.price) || 0;
  let best = null;
  let bestOff = 0;
  for (const promo of livePromotions(data, product.shopId, now)) {
    if (promo.type !== "discount" || !(promo.productIds || []).includes(product.id)) continue;
    const off = unitDiscount(promo, price);
    if (off > bestOff) {
      best = promo;
      bestOff = off;
    }
  }
  return {
    price: round2(price - bestOff),
    originalPrice: price,
    discount: bestOff,
    promo: best,
    label: best ? (best.discountType === "percent" ? `ลด ${Number(best.value)}%` : `-฿${Number(best.value)}`) : "",
  };
}

/** มูลค่าส่วนลดของคูปอง/โค้ด (บาท) จากยอดรวม */
export function orderDiscount(promo, subtotal) {
  const value = Number(promo.value) || 0;
  const off = promo.discountType === "percent" ? (subtotal * Math.min(value, 100)) / 100 : value;
  return round2(Math.max(0, Math.min(subtotal, off)));
}

/** ตรวจโค้ดส่วนลดของร้าน คืน { promo } หรือ { error } */
export function checkPromoCode(data, shopId, code, subtotal, now = Date.now()) {
  const wanted = String(code || "").trim().toUpperCase();
  if (!wanted) return { error: "" };
  const promo = (data.promotions || []).find(
    (p) => p.shopId === shopId && p.type === "code" && !p.deleted && String(p.code).toUpperCase() === wanted,
  );
  if (!promo) return { error: "ไม่พบโค้ดนี้ในร้าน" };
  if (promo.active === false) return { error: "โค้ดนี้ปิดใช้งานอยู่" };
  if (isExpired(promo, now)) return { error: "โค้ดนี้หมดอายุแล้ว" };
  if (Number(promo.maxUses) > 0 && Number(promo.usedCount || 0) >= Number(promo.maxUses))
    return { error: "สิทธิ์ใช้โค้ดนี้เต็มแล้ว" };
  if (subtotal < (Number(promo.minSpend) || 0))
    return { error: `ซื้อในร้านนี้ให้ครบ ฿${Number(promo.minSpend)} ก่อนใช้โค้ด` };
  return { promo };
}

/**
 * ยอดรวมของสินค้าจาก 1 ร้าน
 * items: [{ productId, qty }]
 * คืน lines, originalSubtotal, subtotal (หลังลดรายสินค้า), voucher, voucherDiscount,
 *     codePromo, codeDiscount, codeError, discountAmount, total
 */
export function shopTotals(data, shopId, items, promoCode = "", now = Date.now()) {
  const lines = items
    .map((it) => {
      const product = data.products.find((p) => p.id === it.productId);
      if (!product) return null;
      const pricing = productPricing(data, product, now);
      return { ...it, product, ...pricing, lineTotal: round2(pricing.price * it.qty) };
    })
    .filter(Boolean);
  const originalSubtotal = round2(lines.reduce((sum, l) => sum + l.originalPrice * l.qty, 0));
  const subtotal = round2(lines.reduce((sum, l) => sum + l.lineTotal, 0));

  // Min-spend shop voucher: the best eligible one applies automatically.
  let voucher = null;
  let voucherDiscount = 0;
  for (const promo of livePromotions(data, shopId, now)) {
    if (promo.type !== "voucher" || subtotal < (Number(promo.minSpend) || 0)) continue;
    const off = orderDiscount(promo, subtotal);
    if (off > voucherDiscount) {
      voucher = promo;
      voucherDiscount = off;
    }
  }

  const afterVoucher = round2(subtotal - voucherDiscount);
  const check = checkPromoCode(data, shopId, promoCode, subtotal, now);
  const codePromo = check.promo || null;
  const codeDiscount = codePromo ? Math.min(afterVoucher, orderDiscount(codePromo, subtotal)) : 0;
  const discountAmount = round2(voucherDiscount + codeDiscount);

  // Next voucher the buyer could unlock (for a gentle hint in the cart).
  const nextVoucher = livePromotions(data, shopId, now)
    .filter((p) => p.type === "voucher" && subtotal < (Number(p.minSpend) || 0))
    .sort((a, b) => Number(a.minSpend) - Number(b.minSpend))[0];

  return {
    lines,
    originalSubtotal,
    productDiscount: round2(originalSubtotal - subtotal),
    subtotal,
    voucher,
    voucherDiscount,
    codePromo,
    codeDiscount,
    codeError: check.error || "",
    discountAmount,
    total: round2(Math.max(0, subtotal - discountAmount)),
    nextVoucher: nextVoucher || null,
  };
}

/** ยอดรวมของออเดอร์ (รองรับออเดอร์เก่าที่ไม่มี total) */
export const orderTotal = (order) =>
  order.total ?? Math.max(0, (order.items || []).reduce((s, it) => s + it.price * it.qty, 0) - (order.discountAmount || 0));
