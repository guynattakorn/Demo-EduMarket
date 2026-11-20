// modals/CartDrawer.jsx
// แหล่งโค้ดจริงของ app.js — แก้ไขไฟล์ใน src/ แล้วรัน `npm run build`
import { useState } from "react";
import { ShopLogo } from "../components/Avatar.jsx";
import { ProductImage } from "../components/ProductImage.jsx";
import { PromoChips, promoValueText } from "../components/PromoChips.jsx";
import { Button, EmptyState, Icon, Sheet } from "../components/ui.jsx";
import { CUSTOM_OPTION, MEETUP_POINTS, PICKUP_TIMES, PICKUP_TYPES, leadDaysOf, readyByDate } from "../config/constants.js";
import { shopTotals } from "../lib/pricing.js";
import { Q } from "../state/context.js";
import { Nt, Pt } from "../utils/format.js";

const defaultChoice = (shop) => ({
  pickupType: shop?.boothLocation ? "booth" : "meetup",
  point: MEETUP_POINTS[0],
  customPoint: "",
  time: "12:00",
  customTime: "",
  codeInput: "",
  promoCode: "",
});

/** ค่าที่จะบันทึกในออเดอร์จากตัวเลือกของร้าน */
export function resolvePickup(shop, c) {
  const pickup = c.pickupType === "booth" ? shop?.boothLocation || "" : c.point === CUSTOM_OPTION ? c.customPoint.trim() : c.point;
  const time = c.time === CUSTOM_OPTION ? c.customTime.trim() : c.time;
  return { pickupType: c.pickupType, pickup, time };
}

/** ตะกร้าสินค้าแบบ Bottom Sheet (iPhone) / Slide-over Drawer (iPad, Desktop) — แยกตามร้าน */
export function CartDrawer() {
  const { data, user, cart, setCart, dispatch, setCartOpen, setModal, toast } = Q();
  const [choices, setChoices] = useState({});
  const close = () => setCartOpen(false);

  // Group cart lines by shop.
  const byShop = new Map();
  for (const line of cart) {
    const p = data.products.find((x) => x.id === line.productId);
    if (!p) continue;
    if (!byShop.has(p.shopId)) byShop.set(p.shopId, []);
    byShop.get(p.shopId).push(line);
  }
  const groups = [...byShop.entries()].map(([shopId, items]) => {
    const shop = data.shops.find((s) => s.id === shopId);
    const choice = choices[shopId] || defaultChoice(shop);
    const totals = shopTotals(data, shopId, items, choice.promoCode);
    const pickup = resolvePickup(shop, choice);
    const problems = [];
    for (const l of totals.lines) {
      if (l.product.active === false) problems.push(`${l.product.name} ปิดการขายชั่วคราว`);
      else if (l.qty > l.product.stock) problems.push(`${l.product.name} เหลือ ${l.product.stock} ชิ้น`);
    }
    if (shop?.members.includes(user.id)) problems.push("สินค้าของร้านที่คุณเป็นสมาชิก");
    if (!pickup.pickup) problems.push(choice.pickupType === "booth" ? "ร้านยังไม่ระบุบูธ" : "ระบุจุดนัดพบ");
    if (!pickup.time) problems.push("ระบุเวลานัดรับ");
    return { shopId, shop, items, choice, totals, pickup, problems };
  });

  const setChoice = (shopId, patch) =>
    setChoices((prev) => ({ ...prev, [shopId]: { ...(prev[shopId] || defaultChoice(data.shops.find((s) => s.id === shopId))), ...patch } }));
  const setQty = (productId, qty) =>
    setCart(qty <= 0 ? cart.filter((c) => c.productId !== productId) : cart.map((c) => (c.productId === productId ? { ...c, qty } : c)));

  const originalSum = groups.reduce((s, g) => s + g.totals.originalSubtotal, 0);
  const discountSum = groups.reduce((s, g) => s + g.totals.productDiscount + g.totals.discountAmount, 0);
  const grandTotal = groups.reduce((s, g) => s + g.totals.total, 0);
  const blocked = !groups.length || groups.some((g) => g.problems.length);

  const checkout = () => {
    if (blocked) return;
    dispatch({
      type: "ORDER",
      user: user.id,
      groups: groups.map((g) => ({
        shopId: g.shopId,
        items: g.items.map((it) => ({ productId: it.productId, qty: it.qty })),
        ...g.pickup,
        promoCode: g.totals.codePromo?.code || "",
      })),
    });
    setCart([]);
    close();
    setModal({ type: "orders" });
    toast(groups.length > 1 ? `ส่งคำสั่งซื้อ ${groups.length} ร้านแล้ว` : "ส่งคำสั่งซื้อแล้ว รอร้านค้ายืนยัน");
  };

  return (
    <Sheet
      title={`ตะกร้า${cart.length ? ` (${cart.reduce((s, c) => s + c.qty, 0)})` : ""}`}
      onClose={close}
      className="cart-sheet"
      footer={
        groups.length > 0 && (
          <div className="cart-summary">
            <div className="row-between">
              <span>ยอดสินค้า</span>
              <span>฿{Nt(originalSum)}</span>
            </div>
            {discountSum > 0 && (
              <div className="row-between discount">
                <span>ส่วนลด</span>
                <span>-฿{Nt(discountSum)}</span>
              </div>
            )}
            <div className="row-between grand">
              <strong>ยอดชำระ</strong>
              <strong>฿{Nt(grandTotal)}</strong>
            </div>
            <Button variant="black full" disabled={blocked} onClick={checkout}>
              ยืนยันสั่งซื้อ{groups.length > 1 ? ` (${groups.length} ร้าน)` : ""}
            </Button>
            <small className="hint">ชำระเงินตอนรับของ</small>
          </div>
        )
      }
    >
      {!groups.length ? (
        <EmptyState>ตะกร้ายังว่าง</EmptyState>
      ) : (
        <div className="cart-groups">
          {groups.map((g) => (
            <section className="cart-shop" key={g.shopId}>
              <header className="cart-shop-head">
                <ShopLogo shop={g.shop} size="mini" />
                <strong className="truncate">{g.shop?.name}</strong>
              </header>

              <div className="cart-lines">
                {g.totals.lines.map((l) => (
                  <div className="cart-line" key={l.productId}>
                    <div className="cart-thumb">
                      <ProductImage p={l.product} />
                    </div>
                    <div className="cart-line-info">
                      <strong className="line-clamp-2">{l.product.name}</strong>
                      <span className="cart-line-price">
                        ฿{Nt(l.price)}
                        {l.discount > 0 && <s>฿{Nt(l.originalPrice)}</s>}
                      </span>
                      {l.qty > l.product.stock && <small className="error">เหลือ {l.product.stock} ชิ้น กรุณาลดจำนวน</small>}
                    </div>
                    <div className="qty-stepper">
                      <button aria-label={"ลดจำนวน " + l.product.name} onClick={() => setQty(l.productId, l.qty - 1)}>
                        {l.qty === 1 ? <Icon name="trash" size={16} /> : "−"}
                      </button>
                      <b aria-live="polite">{l.qty}</b>
                      <button aria-label={"เพิ่มจำนวน " + l.product.name} disabled={l.qty >= l.product.stock} onClick={() => setQty(l.productId, l.qty + 1)}>
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {(() => {
                const lead = Math.max(0, ...g.totals.lines.map((l) => leadDaysOf(l.product)));
                return lead > 0 ? (
                  <p className="cart-lead">
                    <Icon name="clock" size={16} /> พร้อมส่งมอบใน {lead} วัน · ประมาณ {Pt(readyByDate(lead))}
                  </p>
                ) : null;
              })()}

              {/* In-school pickup method */}
              <fieldset className="pickup-picker">
                <legend>วิธีรับสินค้า</legend>
                <div className="pickup-options">
                  {Object.entries(PICKUP_TYPES).map(([key, t]) => (
                    <label className={"pickup-option" + (g.choice.pickupType === key ? " selected" : "")} key={key}>
                      <input
                        type="radio"
                        name={"pickup-" + g.shopId}
                        value={key}
                        checked={g.choice.pickupType === key}
                        disabled={key === "booth" && !g.shop?.boothLocation}
                        onChange={() => setChoice(g.shopId, { pickupType: key })}
                      />
                      <span className="pickup-icon" aria-hidden="true">
                        <Icon name={t.icon} size={20} />
                      </span>
                      <span>
                        <strong>{t.label}</strong>
                        <small>{key === "booth" ? g.shop?.boothLocation || "ร้านยังไม่ระบุบูธ" : "เลือกจุดและเวลา"}</small>
                      </span>
                    </label>
                  ))}
                </div>
                {g.choice.pickupType === "booth" && g.shop?.openHours && <small className="hint">เวลาเปิดร้าน: {g.shop.openHours}</small>}
                {g.choice.pickupType === "meetup" && (
                  <div className="pickup-field">
                    <label htmlFor={"point-" + g.shopId}>จุดนัดพบ</label>
                    <select id={"point-" + g.shopId} value={g.choice.point} onChange={(e) => setChoice(g.shopId, { point: e.target.value })}>
                      {MEETUP_POINTS.map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                      <option value={CUSTOM_OPTION}>อื่น ๆ</option>
                    </select>
                    {g.choice.point === CUSTOM_OPTION && (
                      <input
                        value={g.choice.customPoint}
                        onChange={(e) => setChoice(g.shopId, { customPoint: e.target.value })}
                        placeholder="เช่น ม้าหินอ่อนหน้าตึก 2"
                        maxLength={80}
                        aria-label="พิมพ์จุดนัดพบเอง"
                      />
                    )}
                  </div>
                )}
                <div className="pickup-field">
                  <label htmlFor={"time-" + g.shopId}>{g.choice.pickupType === "booth" ? "เวลารับ" : "เวลานัดรับ"}</label>
                  <select id={"time-" + g.shopId} value={g.choice.time} onChange={(e) => setChoice(g.shopId, { time: e.target.value })}>
                    {PICKUP_TIMES.map((t) => (
                      <option value={t.value} key={t.value}>
                        {t.label}
                      </option>
                    ))}
                    <option value={CUSTOM_OPTION}>ระบุเวลาเอง</option>
                  </select>
                  {g.choice.time === CUSTOM_OPTION && (
                    <input
                      value={g.choice.customTime}
                      onChange={(e) => setChoice(g.shopId, { customTime: e.target.value })}
                      placeholder="เช่น 12:30 หรือ คาบว่างบ่าย"
                      maxLength={40}
                      aria-label="พิมพ์เวลานัดรับเอง"
                    />
                  )}
                </div>
              </fieldset>

              {/* Promotions & promo code (Phase 6) */}
              <div className="cart-promo">
                <PromoChips shopId={g.shopId} onApply={(code) => setChoice(g.shopId, { codeInput: code, promoCode: code })} />
                <form
                  className="promo-code-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setChoice(g.shopId, { promoCode: g.choice.codeInput.trim().toUpperCase() });
                  }}
                >
                  <input
                    value={g.choice.codeInput}
                    onChange={(e) => setChoice(g.shopId, { codeInput: e.target.value.toUpperCase() })}
                    placeholder="โค้ดส่วนลด"
                    aria-label={"โค้ดส่วนลดของร้าน " + g.shop?.name}
                    autoCapitalize="characters"
                    maxLength={20}
                  />
                  <Button variant="outline small" disabled={!g.choice.codeInput.trim()}>
                    ใช้โค้ด
                  </Button>
                </form>
                {g.choice.promoCode && g.totals.codeError && <small className="error">{g.totals.codeError}</small>}
                {g.totals.codePromo && (
                  <small className="promo-ok">
                    ใช้โค้ด {g.totals.codePromo.code} แล้ว{" "}
                    <button type="button" className="btn text small" onClick={() => setChoice(g.shopId, { promoCode: "", codeInput: "" })}>
                      ยกเลิกโค้ด
                    </button>
                  </small>
                )}
                {!g.totals.voucher && g.totals.nextVoucher && (
                  <small className="hint">
                    ซื้อเพิ่มอีก ฿{Nt(Number(g.totals.nextVoucher.minSpend) - g.totals.subtotal)} รับคูปอง {promoValueText(g.totals.nextVoucher)}
                  </small>
                )}
              </div>

              <div className="cart-shop-totals">
                <div className="row-between">
                  <span>ยอดสินค้า</span>
                  <span>฿{Nt(g.totals.originalSubtotal)}</span>
                </div>
                {g.totals.productDiscount > 0 && (
                  <div className="row-between discount">
                    <span>ส่วนลดสินค้า</span>
                    <span>-฿{Nt(g.totals.productDiscount)}</span>
                  </div>
                )}
                {g.totals.voucher && (
                  <div className="row-between discount">
                    <span>คูปองร้าน ({g.totals.voucher.title || "ซื้อครบลด"})</span>
                    <span>-฿{Nt(g.totals.voucherDiscount)}</span>
                  </div>
                )}
                {g.totals.codePromo && (
                  <div className="row-between discount">
                    <span>โค้ด {g.totals.codePromo.code}</span>
                    <span>-฿{Nt(g.totals.codeDiscount)}</span>
                  </div>
                )}
                <div className="row-between net">
                  <strong>รวม</strong>
                  <strong>฿{Nt(g.totals.total)}</strong>
                </div>
                {g.problems.map((p) => (
                  <small className="error" key={p}>
                    {p}
                  </small>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </Sheet>
  );
}
