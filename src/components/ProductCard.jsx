// components/ProductCard.jsx
// แหล่งโค้ดจริงของ app.js — แก้ไขไฟล์ใน src/ แล้วรัน `npm run build`
import { deliveryLabel, leadDaysOf } from "../config/constants.js";
import { productPricing } from "../lib/pricing.js";
import { Q } from "../state/context.js";
import { Xu } from "../state/selectors.js";
import { Nt } from "../utils/format.js";
import { ProductImage } from "./ProductImage.jsx";
import { Icon } from "./ui.jsx";

export const stockLabel = (p) => (p.stock <= 0 ? "หมด" : `เหลือ ${p.stock} ชิ้น`);
/** Cards show stock only when it matters (sold out or 5 left or fewer) */
const LOW_STOCK = 5;

/** การ์ดสินค้าในตลาดนัด (รูป 1:1, ชื่อ 2 บรรทัด, ราคาชิดล่าง) — เดิมชื่อ Gp */
export function ProductCard({ p, observer = false }) {
  const { data, user, dispatch, setModal } = Q();
  const shop = data.shops.find((s) => s.id === p.shopId);
  const pricing = productPricing(data, p);
  const rating = Xu(data, p.id);
  const reviewCount = data.reviews.filter((r) => r.productId === p.id).length;
  const wished = p.wishedBy.includes(user.id);
  const open = () => {
    dispatch({ type: "VIEW", id: p.id });
    setModal({ type: "product", id: p.id });
  };
  return (
    <article className={"pcard" + (p.stock <= 0 ? " is-out" : "")}>
      <div className="pcard-media">
        <button className="pcard-image" onClick={open} aria-label={"ดู " + p.name}>
          <ProductImage p={p} />
        </button>
        <div className="pcard-badges-top">
          {p.stock <= LOW_STOCK && (
            <span className={"pcard-badge" + (p.stock <= 0 ? " out" : "")}>{stockLabel(p)}</span>
          )}
          {leadDaysOf(p) > 0 && <span className="pcard-badge pre">{deliveryLabel(p)}</span>}
          {pricing.discount > 0 && <span className="pcard-badge sale">{pricing.label}</span>}
        </div>
        {!observer && (
          <button
            className={"pcard-wish" + (wished ? " wished" : "")}
            aria-label={(wished ? "นำออกจาก" : "เพิ่มใน") + "รายการที่สนใจ " + p.name}
            aria-pressed={wished}
            onClick={() => dispatch({ type: "WISH", id: p.id, user: user.id })}
          >
            <Icon name="heart" size={18} />
          </button>
        )}
      </div>
      <div className="pcard-body">
        <button className="pcard-name line-clamp-2" onClick={open}>
          {p.name}
        </button>
        {shop && (
          <button className="pcard-shop" onClick={() => setModal({ type: "store", id: shop.id })}>
            <Icon name="store" size={14} />
            <span className="truncate">{shop.name}</span>
          </button>
        )}
        <div className="pcard-foot">
          <span className="pcard-price">
            <strong>฿{Nt(pricing.price)}</strong>
            {pricing.discount > 0 && <s>฿{Nt(pricing.originalPrice)}</s>}
          </span>
          <span className="pcard-rating" aria-label={`คะแนน ${rating.toFixed(1)} จาก ${reviewCount} รีวิว`}>
            ★ {reviewCount ? rating.toFixed(1) : "–"}
          </span>
        </div>
      </div>
    </article>
  );
}
