// components/ProductImage.jsx
// แหล่งโค้ดจริงของ app.js — แก้ไขไฟล์ใน src/ แล้วรัน `npm run build`
import { initialOf } from "./Avatar.jsx";

/** รูปสินค้า (ถ้ายังไม่มีรูป แสดงตัวอักษรย่อบนพื้นเทา) — เดิมชื่อ Lu */
export function ProductImage({ p, large = false }) {
  return (
    <div className={"product-art" + (large ? " large" : "")}>
      {p.image ? (
        <img src={p.image} alt={p.name} loading="lazy" />
      ) : (
        <span className="product-emoji product-initial" role="img" aria-label={p.name}>
          {initialOf(p.name)}
        </span>
      )}
    </div>
  );
}
