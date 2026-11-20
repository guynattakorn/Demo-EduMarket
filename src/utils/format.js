// utils/format.js
// แหล่งโค้ดจริงของ app.js — แก้ไขไฟล์ใน src/ แล้วรัน `npm run build`

/** จัดรูปแบบตัวเลขแบบไทย (ไม่มีทศนิยม) */
export const Nt = (t) =>
  new Intl.NumberFormat("th-TH", {
    maximumFractionDigits: 0,
  }).format(t);

/** สร้าง id แบบสุ่ม เช่น St("o") -> "o_lx2k..._ab12c" */
export const St = (t) =>
  `${t}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

/** เวลาปัจจุบันแบบ ISO string */
export const ct = () => new Date().toISOString();

/** แสดงวันที่สั้นแบบไทย เช่น "16 พ.ย." */
export const Pt = (t) =>
  new Date(t).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
  });

/** เวลาแบบ 24 ชม. เช่น "12:05" */
export const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

/** เวลาที่ผ่านมาแบบสั้น: "เมื่อสักครู่", "5 นาที", "3 ชม.", หรือวันที่ */
export const timeAgo = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff)) return "";
  if (diff < 60e3) return "เมื่อสักครู่";
  if (diff < 3600e3) return `${Math.floor(diff / 60e3)} นาที`;
  if (diff < 86400e3) return `${Math.floor(diff / 3600e3)} ชม.`;
  return Pt(iso);
};

/** เงินบาท เช่น "฿1,250" (ทศนิยมสูงสุด 2 ตำแหน่ง) */
export const baht = (n) =>
  "฿" + new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(Number(n) || 0);
