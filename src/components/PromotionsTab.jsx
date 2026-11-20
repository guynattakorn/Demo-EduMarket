// components/PromotionsTab.jsx
// แหล่งโค้ดจริงของ app.js — แก้ไขไฟล์ใน src/ แล้วรัน `npm run build`
import { isExpired } from "../lib/pricing.js";
import { Q } from "../state/context.js";
import { Nt, Pt } from "../utils/format.js";
import { promoValueText } from "./PromoChips.jsx";
import { Button, EmptyState, Icon, StatusChip } from "./ui.jsx";

const TYPE_LABEL = { discount: "ส่วนลดรายสินค้า", voucher: "คูปองซื้อครบลด", code: "โค้ดส่วนลด" };

/** แท็บ "โปรโมชันร้านค้า": สร้าง เปิด/ปิด และลบโปรโมชันของร้าน */
export function PromotionsTab({ shop }) {
  const { data, dispatch, setModal, toast } = Q();
  const promos = (data.promotions || [])
    .filter((p) => p.shopId === shop.id && !p.deleted)
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const productName = (id) => data.products.find((p) => p.id === id)?.name || "สินค้า";

  return (
    <div className="stack">
      <div className="promo-create-row">
        {[
          ["discount", "ส่วนลดสินค้า"],
          ["voucher", "คูปองซื้อครบ"],
          ["code", "โค้ดส่วนลด"],
        ].map(([type, label]) => (
          <Button variant="outline small" icon="plus" onClick={() => setModal({ type: "promoForm", shopId: shop.id, promoType: type })} key={type}>
            {label}
          </Button>
        ))}
      </div>
      {promos.length === 0 && <EmptyState>ยังไม่มีโปรโมชัน</EmptyState>}
      {promos.map((p) => {
        const expired = isExpired(p);
        const full = p.type === "code" && Number(p.maxUses) > 0 && Number(p.usedCount || 0) >= Number(p.maxUses);
        const state = expired ? ["red", "หมดอายุ"] : full ? ["red", "สิทธิ์เต็ม"] : p.active === false ? ["gray", "ปิดอยู่"] : ["green", "ใช้งานอยู่"];
        return (
          <article className="promo-card" key={p.id}>
            <div className="promo-card-main">
              <span className={"promo-badge t-" + p.type}>{p.type === "code" ? <Icon name="tag" size={18} /> : p.type === "voucher" ? <Icon name="ticket" size={18} /> : "%"}</span>
              <div className="promo-card-text">
                <div className="row" style={{ flexWrap: "wrap" }}>
                  <strong>{p.title}</strong>
                  <StatusChip color={state[0]}>{state[1]}</StatusChip>
                </div>
                <small>
                  {TYPE_LABEL[p.type]} · {promoValueText(p)}
                  {p.type !== "discount" && Number(p.minSpend) > 0 ? ` · ขั้นต่ำ ฿${Nt(Number(p.minSpend))}` : ""}
                  {p.type === "code" ? ` · โค้ด ${p.code} · ใช้แล้ว ${p.usedCount || 0}${Number(p.maxUses) > 0 ? `/${p.maxUses}` : ""}` : ""}
                  {p.type === "voucher" ? ` · ใช้แล้ว ${p.usedCount || 0} ครั้ง` : ""}
                  {p.expiresAt ? ` · หมดอายุ ${Pt(p.expiresAt)}` : ""}
                </small>
                {p.type === "discount" && <small className="muted">สินค้า: {(p.productIds || []).map(productName).join(", ")}</small>}
              </div>
            </div>
            <div className="promo-card-actions">
              <label className="switch">
                <input
                  type="checkbox"
                  role="switch"
                  checked={p.active !== false}
                  onChange={() => {
                    dispatch({ type: "PROMO_TOGGLE", id: p.id });
                    toast(p.active === false ? "เปิดใช้โปรโมชันแล้ว" : "ปิดโปรโมชันแล้ว");
                  }}
                  aria-label={(p.active === false ? "เปิด " : "ปิด ") + p.title}
                />
                <span className="switch-track" aria-hidden="true" />
              </label>
              <Button
                variant="text small"
                icon="trash"
                onClick={() =>
                  setModal({
                    type: "confirm",
                    title: "ลบโปรโมชันนี้?",
                    body: p.title,
                    action: () => {
                      dispatch({ type: "PROMO_DELETE", id: p.id });
                      toast("ลบโปรโมชันแล้ว");
                    },
                  })
                }
              >
                ลบ
              </Button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
