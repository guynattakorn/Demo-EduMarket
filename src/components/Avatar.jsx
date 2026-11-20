// components/Avatar.jsx
// แหล่งโค้ดจริงของ app.js — แก้ไขไฟล์ใน src/ แล้วรัน `npm run build`
// รูปโปรไฟล์ / โลโก้ร้าน / รูปสินค้าสำรอง แบบตัวอักษรย่อ (แทนอีโมจิเดิม)

const PREFIXES = /^(คุณครู|ครู|คุณ|ร้าน|ชมรม)\s*/;
const LEADING_VOWELS = /^[เแโใไ]/;

/** ตัวอักษรย่อจากชื่อ: "ครูพลอย" → "พ", "เบล" → "บ", "mint" → "M" */
export function initialOf(name = "") {
  let s = String(name).trim();
  const stripped = s.replace(PREFIXES, "");
  if (stripped) s = stripped;
  s = s.replace(LEADING_VOWELS, "");
  const ch = Array.from(s)[0] || "?";
  return ch.toUpperCase();
}

/** วงกลมตัวอักษรย่อของผู้ใช้ */
export function Avatar({ name, size = "", className = "" }) {
  return (
    <span className={["avatar", "avatar-initial", size, className].filter(Boolean).join(" ")} aria-hidden="true">
      {initialOf(name)}
    </span>
  );
}

/** โลโก้ร้าน: สี่เหลี่ยมตัวอักษรย่อ สีพื้นตามโทนที่ร้านเลือก */
export function ShopLogo({ shop, size = "", className = "" }) {
  return (
    <span className={["shop-logo", "tone-" + (shop?.color || "lime"), size, className].filter(Boolean).join(" ")} aria-hidden="true">
      {initialOf(shop?.name || "ร")}
    </span>
  );
}
