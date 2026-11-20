// state/migrate.js
// แหล่งโค้ดจริงของ app.js — แก้ไขไฟล์ใน src/ แล้วรัน `npm run build`
import { DEFAULT_BOOTHS, DEFAULT_OPEN_HOURS, SAMPLE_PRODUCT_IMAGES, dmThreadKey, leadDaysOf, shopThreadKey } from "../config/constants.js";
import { Mn } from "../data/seed.js";

/** Migration ของ state เก่าใน localStorage ให้ตรงกับ seed ปัจจุบัน */
export function Qh(t) {
  if (!t.visualVersion) return t;
  let e = Mn();
  for (let l of t.users) {
    let n = e.users.find((i) => i.id === l.id);
    n &&
      ["student1", "student2", "student3", "student4"].includes(l.id) &&
      Object.assign(l, {
        name: n.name,
        classId: n.classId,
      });
  }
  for (let l of t.shops) {
    let n = e.shops.find((i) => i.id === l.id);
    n &&
      (Object.assign(l, {
        name: n.name,
        members: n.members,
        classId: n.classId,
      }),
      delete l.photo);
  }
  for (let l of t.products) {
    let n = e.products.find((i) => i.id === l.id);
    if (n) for (let i of ["name", "description", "category"]) l[i] = n[i];
    l.image?.startsWith("/assets/photos/") && delete l.image;
  }
  let a = t.orders.find((l) => l.id === "demo-visual-pickup");
  if (a?.status === "awaiting")
    for (let l of a.items) {
      let n = t.products.find((i) => i.id === l.productId);
      n && (n.stock += l.qty);
    }
  t.orders = t.orders.filter((l) => l.id !== "demo-visual-pickup");
  for (let l of t.orders)
    if (l.demo)
      for (let n of l.items) {
        let i = e.products.find((c) => c.id === n.productId);
        i && (n.name = i.name);
      }
  return (delete t.visualVersion, t);
}

/**
 * อัปเกรด state ทุกเวอร์ชันให้มีฟิลด์ใหม่ของ Phase 1–8 (idempotent — เรียกซ้ำได้)
 * ใช้กับข้อมูลจาก localStorage, data/local-db.json และ Supabase
 */
export function upgradeState(state) {
  const s = state;
  for (const key of ["promotions", "chatAppointments", "announcements", "feedback", "logs", "messages", "notifications", "submissions", "contents", "assignments", "reviews", "orders"]) {
    if (!Array.isArray(s[key])) s[key] = [];
  }
  if (!s.progress || typeof s.progress !== "object") s.progress = {};

  s.shops.forEach((shop, index) => {
    if (!Array.isArray(shop.members)) shop.members = [];
    if (shop.boothLocation === undefined)
      shop.boothLocation = DEFAULT_BOOTHS[shop.id] || `บูธ ${String.fromCharCode(65 + (index % 26))}${index + 1} ลานกิจกรรม`;
    if (shop.openHours === undefined) shop.openHours = DEFAULT_OPEN_HOURS;
    if (shop.ownerId === undefined) shop.ownerId = shop.members[0] || null;
  });

  s.products.forEach((p) => {
    if (p.active === undefined) p.active = true;
    // "พรีออเดอร์" (preorder) became a delivery lead time in days
    if (p.leadDays === undefined) p.leadDays = leadDaysOf(p);
    delete p.preorder;
    // Sample products get a real photo once (never over an uploaded photo or one the shop removed: "")
    const sample = SAMPLE_PRODUCT_IMAGES[p.id];
    if (sample && sample.name === p.name && (p.image === undefined || p.image === null)) p.image = sample.image;
    if (!Array.isArray(p.wishedBy)) p.wishedBy = [];
  });

  s.orders.forEach((o) => {
    if (!o.pickupType) o.pickupType = "meetup";
    const subtotal = (o.items || []).reduce((sum, it) => sum + it.price * it.qty, 0);
    if (o.subtotal === undefined) o.subtotal = subtotal;
    if (o.discountAmount === undefined) o.discountAmount = 0;
    if (o.total === undefined) o.total = Math.max(0, o.subtotal - o.discountAmount);
  });

  // Legacy messages had only from/to — attach them to a shop thread (shopId + buyerId) when possible.
  const shopOf = (userId) => s.shops.find((sh) => sh.members.includes(userId));
  const roleOf = (userId) => s.users.find((u) => u.id === userId)?.role;
  s.messages.forEach((m) => {
    if (m.threadKey) return;
    const toShop = shopOf(m.to);
    const fromShop = shopOf(m.from);
    const studentsOnly = roleOf(m.from) !== "teacher" && roleOf(m.to) !== "teacher";
    if (studentsOnly && toShop && !toShop.members.includes(m.from)) {
      Object.assign(m, { shopId: toShop.id, buyerId: m.from, threadKey: shopThreadKey(toShop.id, m.from) });
    } else if (studentsOnly && fromShop && !fromShop.members.includes(m.to)) {
      Object.assign(m, { shopId: fromShop.id, buyerId: m.to, threadKey: shopThreadKey(fromShop.id, m.to) });
    } else {
      Object.assign(m, { shopId: null, buyerId: null, threadKey: dmThreadKey(m.from, m.to) });
    }
  });

  [...s.assignments, ...s.contents].forEach((item) => {
    if (!Array.isArray(item.attachments)) item.attachments = [];
  });
  return s;
}
