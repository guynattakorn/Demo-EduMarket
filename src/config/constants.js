// config/constants.js
// แหล่งโค้ดจริงของ app.js — แก้ไขไฟล์ใน src/ แล้วรัน `npm run build`

/** คีย์ localStorage ของ state ทั้งแอป (sync-bridge.js ใช้คีย์เดียวกัน) */
export const Gu = "edu-marketplace-classroom-v2";

/** รายการบทเรียนหลัก (iframe) ที่เปิดในหน้า "บทเรียน" */
export const Ea = [
  { id: "profit-cost", title: "กำไรและต้นทุน", subtitle: "ต้นทุนต่อชิ้น ผลของสินค้าชำรุด และจุดคุ้มทุน", icon: "coin", color: "lime", src: "lessons/cost.html" },
  { id: "stock-plan", title: "Stock", subtitle: "ความต้องการซื้อแต่ละวัน การผลิตเกิน และการผลิตขาด", icon: "box", color: "lime", src: "lessons/stock.html" },
];

export const completedLessons = (progress = []) =>
  Ea.filter((lesson) => progress.includes(lesson.id)).length;

/** จุดนัดรับในโรงเรียนแบบสำเร็จรูป */
export const vl = ["โรงอาหารกลาง", "ศาลาหน้าเสาธง", "หน้าห้องพักครู", "ใต้ตึกเรียน 3"];

/** รอบเวลานัดรับแบบสำเร็จรูป */
export const ls = ["10:30", "12:00", "16:00"];

/** หมวดหมู่สินค้า */
export const CATEGORIES = ["อาหาร & เครื่องดื่ม", "แฮนด์เมด", "เครื่องเขียน"];

/** จุดนัดเจอในโรงเรียน (ตัวเลือกสำเร็จรูป + "อื่นๆ (ระบุเอง)") */
export const MEETUP_POINTS = vl;
export const CUSTOM_OPTION = "__custom__";

/** รอบเวลานัดรับ */
export const PICKUP_TIMES = [
  { value: "10:30", label: "พักเช้า 10:30" },
  { value: "12:00", label: "พักเที่ยง 12:00" },
  { value: "16:00", label: "หลังเลิกเรียน 16:00" },
];
export const timeLabel = (value) => PICKUP_TIMES.find((t) => t.value === value)?.label || value;

/** วิธีรับของภายในโรงเรียน */
export const PICKUP_TYPES = {
  booth: { label: "รับที่บูธ", short: "รับที่บูธ", icon: "store" },
  meetup: { label: "นัดเจอในโรงเรียน", short: "นัดเจอ", icon: "users" },
};

/** ค่าเริ่มต้นของบูธ/เวลาเปิดร้าน */
export const DEFAULT_BOOTHS = {
  s1: "บูธ A1 ลานอเนกประสงค์",
  s2: "บูธ B2 หน้าโรงอาหาร",
  s3: "บูธ C3 ใต้ตึกเรียน 3",
};
export const DEFAULT_OPEN_HOURS = "พักเที่ยง 12:00–13:00 น.";

/** สถานะคำสั่งซื้อ (Phase 3) */
export const ORDER_STEPS = [
  { status: "confirmed", label: "รับออเดอร์แล้ว" },
  { status: "preparing", label: "กำลังเตรียมของ" },
  { status: "ready", label: "พร้อมรับที่จุดนัด" },
  { status: "delivered", label: "ส่งมอบสำเร็จ" },
];
export const ORDER_STATUS = {
  awaiting: { label: "รอร้านค้ายืนยัน", color: "yellow" },
  confirmed: { label: "รับออเดอร์แล้ว", color: "blue" },
  preparing: { label: "กำลังเตรียมของ", color: "violet" },
  ready: { label: "พร้อมรับ ณ จุดนัด", color: "lime" },
  delivered: { label: "ส่งมอบสำเร็จ", color: "green" },
  cancelled: { label: "ยกเลิกแล้ว", color: "red" },
};
export const ACTIVE_ORDER_STATUSES = ["awaiting", "confirmed", "preparing", "ready"];

/** Thread key ของห้องแชท: ร้านค้า + ผู้ซื้อ หรือ แชทตรงระหว่าง 2 คน */
export const shopThreadKey = (shopId, buyerId) => `shop:${shopId}:${buyerId}`;
export const dmThreadKey = (a, b) => `dm:${[a, b].sort().join(":")}`;

/** รูปถ่ายจริงของสินค้าตัวอย่าง (assets/products, ที่มาใน CREDITS.md) — ใส่ให้เฉพาะสินค้าตัวอย่างที่ยังไม่เคยมีรูป */
export const SAMPLE_PRODUCT_IMAGES = {
  p1: { name: "แซนด์วิชไข่ อิ่มก่อนเรียน", image: "/assets/products/sandwich.jpg" },
  p2: { name: "กำไลลูกปัด สีของเธอ", image: "/assets/products/bracelet.jpg" },
  p3: { name: "สมุดโน้ต ไอเดียเล็ก ๆ", image: "/assets/products/notebook.jpg" },
  p4: { name: "ส้มสดใส น้ำส้มคั้น", image: "/assets/products/orange-juice.jpg" },
  p5: { name: "สติกเกอร์ วันเรียนแสนดี", image: "/assets/products/stickers.jpg" },
  p6: { name: "บราวนี ช็อกเต็มคำ", image: "/assets/products/brownie.jpg" },
};

/** เวลาเตรียมของ: สินค้าพร้อมส่งมอบภายในกี่วันหลังสั่ง (0 = พร้อมส่งทันที). ข้อมูลเก่าที่เป็น "พรีออเดอร์" = 1 วัน */
export const MAX_LEAD_DAYS = 30;
export const leadDaysOf = (p) => {
  const n = Number(p?.leadDays);
  if (Number.isFinite(n) && n >= 0) return Math.min(MAX_LEAD_DAYS, Math.round(n));
  return p?.preorder ? 1 : 0;
};
export const deliveryLabel = (p) => {
  const n = leadDaysOf(p);
  return n === 0 ? "พร้อมส่งทันที" : n === 1 ? "ส่งมอบพรุ่งนี้" : `ส่งมอบใน ${n} วัน`;
};
/** วันที่พร้อมส่งมอบ (ISO) นับจาก from */
export const readyByDate = (days, from = new Date()) => {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d.toISOString();
};

