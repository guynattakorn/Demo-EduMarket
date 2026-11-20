// components/PromoChips.jsx
// แหล่งโค้ดจริงของ app.js — แก้ไขไฟล์ใน src/ แล้วรัน `npm run build`
import { livePromotions } from "../lib/pricing.js";
import { Q } from "../state/context.js";
import { Nt } from "../utils/format.js";
import { Icon } from "./ui.jsx";

export const promoValueText = (p) => (p.discountType === "percent" ? `ลด ${Number(p.value)}%` : `ลด ฿${Nt(Number(p.value))}`);

/** ป้ายคูปอง/โค้ดส่วนลดของร้าน (กดที่โค้ดเพื่อคัดลอก หรือส่ง onApply เพื่อใช้ทันทีในตะกร้า) */
export function PromoChips({ shopId, onApply }) {
  const { data, toast } = Q();
  const promos = livePromotions(data, shopId).filter((p) => p.type === "voucher" || p.type === "code");
  if (!promos.length) return null;
  const copy = async (code) => {
    if (onApply) return onApply(code);
    try {
      await navigator.clipboard.writeText(code);
      toast(`คัดลอกโค้ด ${code} แล้ว`);
    } catch {
      toast(`โค้ดส่วนลด: ${code}`);
    }
  };
  return (
    <div className="promo-chips">
      {promos.map((p) =>
        p.type === "voucher" ? (
          <span className="promo-chip voucher" key={p.id}>
            <Icon name="ticket" size={14} /> ซื้อครบ ฿{Nt(Number(p.minSpend) || 0)} {promoValueText(p)}
          </span>
        ) : (
          <button type="button" className="promo-chip code" onClick={() => copy(p.code)} key={p.id}>
            <Icon name="tag" size={14} /> <b>{p.code}</b> {promoValueText(p)}
            {Number(p.minSpend) > 0 ? ` ขั้นต่ำ ฿${Nt(Number(p.minSpend))}` : ""}
            <small>{onApply ? "ใช้โค้ด" : "คัดลอก"}</small>
          </button>
        ),
      )}
    </div>
  );
}
