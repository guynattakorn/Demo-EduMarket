// modals/ProductDetailModal.jsx
// แหล่งโค้ดจริงของ app.js — แก้ไขไฟล์ใน src/ แล้วรัน `npm run build`
import { useState } from "react";
import { stockLabel } from "../components/ProductCard.jsx";
import { ProductImage } from "../components/ProductImage.jsx";
import { PromoChips } from "../components/PromoChips.jsx";
import { ReviewList } from "../components/ReviewList.jsx";
import { Button, EmptyState, Field, Icon, SectionTitle } from "../components/ui.jsx";
import { deliveryLabel, leadDaysOf, readyByDate } from "../config/constants.js";
import { productPricing } from "../lib/pricing.js";
import { Q } from "../state/context.js";
import { Xu, bl } from "../state/selectors.js";
import { Nt, Pt, St, ct } from "../utils/format.js";

/** หน้าต่างรายละเอียดสินค้า — เดิมชื่อ Kh */
export function ProductDetailModal({ id }) {
  const { data, user, role, dispatch, setModal, cart, setCart, setCartOpen, toast, openChat } = Q();
  const product = data.products.find((p) => p.id === id);
  const shop = data.shops.find((s) => s.id === product?.shopId);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  if (!product || !shop) return <EmptyState>ไม่พบสินค้า</EmptyState>;

  const pricing = productPricing(data, product);
  const isMember = shop.members.includes(user.id);
  const canBuy = role === "student" && !isMember;
  const unavailable = product.active === false || product.stock < 1;
  const inCart = cart.find((c) => c.productId === id)?.qty || 0;

  const share = async () => {
    const url = `${location.origin}/?product=${encodeURIComponent(product.id)}`;
    const text = `${product.name} ฿${Nt(pricing.price)} · ${shop.name}`;
    try {
      if (navigator.share) return await navigator.share({ title: product.name, text, url });
      await navigator.clipboard.writeText(url);
      toast("คัดลอกลิงก์สินค้าแล้ว");
    } catch (err) {
      if (err?.name !== "AbortError") toast("แชร์ไม่สำเร็จ");
    }
  };

  const addToCart = () => {
    if (inCart >= product.stock) {
      toast("จำนวนในตะกร้าครบจำนวนที่ร้านรับได้แล้ว");
      return false;
    }
    setCart(inCart ? cart.map((c) => (c.productId === id ? { ...c, qty: c.qty + 1 } : c)) : [...cart, { productId: id, qty: 1 }]);
    return true;
  };

  return (
    <>
      <div className="pdetail">
        <div className="pdetail-media">
          <ProductImage p={product} large />
        </div>
        <div className="pdetail-info">
          <div className="row" style={{ flexWrap: "wrap" }}>
            <span className={"status-chip " + (product.stock <= 0 ? "red" : "green")}>{stockLabel(product)}</span>
            <span className={"status-chip " + (leadDaysOf(product) > 0 ? "lime" : "gray")}>{deliveryLabel(product)}</span>
            {pricing.discount > 0 && <span className="status-chip red">{pricing.label}</span>}
            {product.active === false && <span className="status-chip gray">ปิดการขาย</span>}
          </div>
          <div className="pdetail-title-row">
            <h2 className="pdetail-name">{product.name}</h2>
            <button className="icon-btn" onClick={share} aria-label={"แชร์ " + product.name} title="แชร์">
              <Icon name="share" />
            </button>
          </div>
          <button className="pcard-shop" onClick={() => setModal({ type: "store", id: shop.id })}>
            <Icon name="store" size={16} />
            <span className="truncate">{shop.name}</span>
          </button>
          <div className="pdetail-price">
            <strong>฿{Nt(pricing.price)}</strong>
            {pricing.discount > 0 && <s>฿{Nt(pricing.originalPrice)}</s>}
          </div>
          <p className="muted pdetail-meta">
            ★ {Xu(data, product.id).toFixed(1)} · สนใจ {bl(product)} · เข้าชม {product.views}
          </p>
          {product.description && <p className="pdetail-desc">{product.description}</p>}
          <PromoChips shopId={shop.id} />
          <div className="pdetail-pickup">
            <div>
              <Icon name="clock" size={20} />
              <div>
                <strong>{leadDaysOf(product) > 0 ? `พร้อมส่งมอบใน ${leadDaysOf(product)} วัน` : "พร้อมส่งมอบทันที"}</strong>
                <small>{leadDaysOf(product) > 0 ? `สั่งวันนี้ ได้ประมาณ ${Pt(readyByDate(leadDaysOf(product)))}` : "หลังร้านยืนยันคำสั่งซื้อ"}</small>
              </div>
            </div>
            <div>
              <Icon name="store" size={20} />
              <div>
                <strong>รับที่บูธ</strong>
                <small>
                  {shop.boothLocation || "ยังไม่ระบุบูธ"}
                  {shop.openHours ? ` · ${shop.openHours}` : ""}
                </small>
              </div>
            </div>
            <div>
              <Icon name="users" size={20} />
              <div>
                <strong>นัดเจอในโรงเรียน</strong>
                <small>เลือกจุดและเวลาในตะกร้า</small>
              </div>
            </div>
          </div>
          {canBuy && (
            <div className="pdetail-actions">
              <Button variant="outline" icon="cart" disabled={unavailable} onClick={() => addToCart() && toast("เพิ่มลงตะกร้าแล้ว")}>
                เพิ่มลงตะกร้า
              </Button>
              <Button
                variant="black"
                disabled={unavailable}
                onClick={() => {
                  if (inCart || addToCart()) {
                    setModal(null);
                    setCartOpen(true);
                  }
                }}
              >
                {unavailable ? "สินค้าหมด" : "ซื้อเลย"}
              </Button>
              <Button variant="ghost" icon="chat" onClick={() => openChat({ shopId: shop.id, contextProductId: product.id })}>
                แชท
              </Button>
              <button
                className={"icon-btn" + (product.wishedBy.includes(user.id) ? " wished" : "")}
                aria-pressed={product.wishedBy.includes(user.id)}
                aria-label="สนใจสินค้านี้"
                onClick={() => dispatch({ type: "WISH", id, user: user.id })}
              >
                <Icon name="heart" />
              </button>
            </div>
          )}
          {isMember && <p className="hint">สินค้าของร้านคุณ</p>}
        </div>
      </div>
      <SectionTitle title="รีวิว" />
      <ReviewList productId={id} />
      {canBuy && (
        <form
          className="soft-panel review-form"
          onSubmit={(ev) => {
            ev.preventDefault();
            dispatch({
              type: "REVIEW",
              item: { id: St("review"), productId: id, userId: user.id, rating, text: text.trim(), date: ct() },
            });
            setText("");
            toast("ขอบคุณสำหรับรีวิว");
          }}
        >
          <h3>เขียนรีวิว</h3>
          <div className="rating-picker" role="group" aria-label="คะแนนรีวิว">
            {[1, 2, 3, 4, 5].map((n) => (
              <button type="button" className={n <= rating ? "chosen" : ""} aria-label={n + " ดาว"} aria-pressed={rating === n} onClick={() => setRating(n)} key={n}>
                ★
              </button>
            ))}
          </div>
          <Field label="ความคิดเห็น">
            <textarea value={text} onChange={(e) => setText(e.target.value)} required maxLength={500} placeholder="สินค้าและการนัดรับเป็นอย่างไรบ้าง?" />
          </Field>
          <Button disabled={!text.trim()}>ส่งรีวิว</Button>
        </form>
      )}
    </>
  );
}
