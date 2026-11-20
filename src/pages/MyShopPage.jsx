// pages/MyShopPage.jsx
// แหล่งโค้ดจริงของ app.js — แก้ไขไฟล์ใน src/ แล้วรัน `npm run build`
import { useEffect, useState } from "react";
import { Avatar, ShopLogo } from "../components/Avatar.jsx";
import { OrderList } from "../components/OrderList.jsx";
import { ProductImage } from "../components/ProductImage.jsx";
import { PromotionsTab } from "../components/PromotionsTab.jsx";
import { ReviewList } from "../components/ReviewList.jsx";
import { ShopInsights } from "../components/ShopInsights.jsx";
import { Button, EmptyState, Icon, StatusChip } from "../components/ui.jsx";
import { ACTIVE_ORDER_STATUSES } from "../config/constants.js";
import { Q } from "../state/context.js";
import { na } from "../state/selectors.js";
import { Nt, Pt, ct } from "../utils/format.js";

const TABS = [
  ["orders", "คำสั่งซื้อ"],
  ["inventory", "สินค้า"],
  ["promotions", "โปรโมชัน"],
  ["insights", "สรุปผล"],
];
const ORDER_FILTERS = [
  ["pending", "รอดำเนินการ"],
  ["delivered", "ส่งมอบแล้ว"],
  ["cancelled", "ยกเลิก"],
  ["reviews", "รีวิว"],
];

/** หน้า "ร้านของฉัน" (Seller Center) — เดิมชื่อ Ph */
export function MyShopPage() {
  const { data, user, setModal, activeShopId, setActiveShopId, shopTab, setShopTab } = Q();
  const myShops = data.shops.filter((s) => s.members.includes(user.id));
  const shop = myShops.find((s) => s.id === activeShopId) || myShops[0];
  const [tab, sub] = String(shopTab || "orders").split(":");
  const [orderFilter, setOrderFilter] = useState(sub || "pending");
  useEffect(() => {
    if (sub) setOrderFilter(sub);
  }, [shopTab]);

  if (!shop)
    return (
      <div className="page-enter">
        <div className="page-head">
          <h1>ร้านของฉัน</h1>
        </div>
        <div className="card center shop-empty">
          <span className="shop-empty-icon" aria-hidden="true">
            <Icon name="store" size={28} />
          </span>
          <h2>ยังไม่มีร้านค้า</h2>
          <Button icon="plus" onClick={() => setModal({ type: "shopForm" })}>
            เปิดร้านใหม่
          </Button>
        </div>
      </div>
    );

  const stats = na(data, shop.id);
  const products = data.products.filter((p) => p.shopId === shop.id);
  const pending = data.orders.filter((o) => o.shopId === shop.id && ACTIVE_ORDER_STATUSES.includes(o.status));
  const selectTab = (key) => setShopTab(key);

  return (
    <div className="myshop page-enter">
      {/* Shop switcher */}
      <div className="shop-switcher">
        <div className="pill-row" role="tablist" aria-label="เลือกร้าน">
          {myShops.map((s) => (
            <button role="tab" aria-selected={s.id === shop.id} className={s.id === shop.id ? "selected" : ""} onClick={() => setActiveShopId(s.id)} key={s.id}>
              {s.name}
            </button>
          ))}
        </div>
        <Button variant="outline small" icon="plus" onClick={() => setModal({ type: "shopForm" })}>
          เปิดร้านใหม่
        </Button>
      </div>

      {/* Block 1: shop header + team */}
      <section className="shop-head-card">
        <div className="shop-head-top">
          <div className="shop-head-id">
            <ShopLogo shop={shop} />
            <div className="shop-head-text">
              <h1 className="truncate">{shop.name}</h1>
              <div className="shop-head-meta">
                <span>
                  <Icon name="pin" size={14} /> {shop.boothLocation || "ยังไม่ระบุบูธ"}
                </span>
                <span>
                  <Icon name="clock" size={14} /> {shop.openHours || "ยังไม่ระบุเวลา"}
                </span>
              </div>
              <Button variant="link small" icon="settings" onClick={() => setModal({ type: "shopForm", id: shop.id })}>
                ตั้งค่าร้าน
              </Button>
            </div>
          </div>
          <Button variant="black" icon="plus" className="btn black shop-add-product" onClick={() => setModal({ type: "productForm", shopId: shop.id })}>
            เพิ่มสินค้า
          </Button>
        </div>
        <TeamBar shop={shop} />
      </section>

      {/* Block 2: KPI */}
      <div className="kpi-grid">
        <div className="kpi">
          <span>ยอดขาย</span>
          <strong>฿{Nt(stats.revenue)}</strong>
        </div>
        <div className="kpi">
          <span>รอส่งมอบ</span>
          <strong>{pending.length}</strong>
        </div>
        <div className="kpi">
          <span>สินค้า</span>
          <strong>{products.length}</strong>
          <small>เปิดขาย {products.filter((p) => p.active !== false).length}</small>
        </div>
      </div>

      {/* Block 3: management tabs */}
      <div className="shop-tabs" role="tablist" aria-label="จัดการร้าน">
        {TABS.map(([key, label]) => (
          <button role="tab" aria-selected={tab === key} className={tab === key ? "selected" : ""} onClick={() => selectTab(key)} key={key}>
            {label}
            {key === "orders" && pending.length > 0 && <b className="pill-count">{pending.length}</b>}
          </button>
        ))}
      </div>

      {/* Block 4: tab content */}
      {tab === "orders" && (
        <div className="stack">
          <div className="pill-row" role="tablist" aria-label="กรองคำสั่งซื้อ">
            {ORDER_FILTERS.map(([key, label]) => (
              <button role="tab" aria-selected={orderFilter === key} className={orderFilter === key ? "selected" : ""} onClick={() => setOrderFilter(key)} key={key}>
                {label}
              </button>
            ))}
          </div>
          {orderFilter === "reviews" ? (
            <section className="card">
              <div className="review-summary">
                <strong>★ {stats.rating.toFixed(1)}</strong>
                <span className="muted">จาก {stats.reviewCount} รีวิว</span>
              </div>
              <ReviewList shopId={shop.id} />
            </section>
          ) : (
            <OrderList
              sellerShop={shop.id}
              filter={(o) =>
                orderFilter === "pending" ? ACTIVE_ORDER_STATUSES.includes(o.status) : o.status === orderFilter
              }
              empty="ไม่มีคำสั่งซื้อ"
            />
          )}
        </div>
      )}
      {tab === "inventory" && (
        <div className="inventory">
          {products.length ? products.map((p) => <InventoryRow product={p} key={p.id} />) : <EmptyState>ยังไม่มีสินค้า</EmptyState>}
        </div>
      )}
      {tab === "promotions" && <PromotionsTab shop={shop} />}
      {tab === "insights" && <InsightsTab shop={shop} />}
    </div>
  );
}

/** แถวทีมงานร้านค้า (Co-sellers) */
function TeamBar({ shop }) {
  const { data, user, dispatch, setModal, toast, setActiveShopId } = Q();
  const ownerId = shop.ownerId || shop.members[0];
  const isOwner = ownerId === user.id;
  const members = shop.members.map((id) => data.users.find((u) => u.id === id)).filter(Boolean);
  const remove = (member) =>
    setModal({
      type: "confirm",
      title: member.id === user.id ? `ออกจากร้าน ${shop.name}?` : `นำ ${member.name} ออกจากทีม?`,
      body: member.id === user.id ? "คุณจะไม่เห็นออเดอร์และแชทของร้านนี้อีก" : "สมาชิกจะไม่สามารถจัดการร้านนี้ได้อีก",
      confirmLabel: member.id === user.id ? "ออกจากร้าน" : "นำออก",
      action: () => {
        dispatch({ type: "SHOP_MEMBER_REMOVE", shopId: shop.id, userId: member.id, by: user.id });
        if (member.id === user.id) setActiveShopId(null);
        toast(member.id === user.id ? "ออกจากร้านแล้ว" : "นำสมาชิกออกจากทีมแล้ว");
      },
    });
  return (
    <div className="team-bar">
      <div className="team-members">
        {members.map((m) => (
          <span className="team-member" key={m.id}>
            <Avatar name={m.name} size="small" />
            <span className="team-name">
              {m.name}
              {m.id === ownerId && <small>เจ้าของร้าน</small>}
            </span>
            {members.length > 1 && (isOwner ? m.id !== user.id : m.id === user.id) && (
              <button className="team-remove" onClick={() => remove(m)} aria-label={m.id === user.id ? "ออกจากร้าน" : `นำ ${m.name} ออกจากทีม`}>
                <Icon name="close" size={14} />
              </button>
            )}
          </span>
        ))}
      </div>
      <div className="team-actions">
        <Button variant="outline small" icon="plus" onClick={() => setModal({ type: "addMember", shopId: shop.id })}>
          เพิ่มสมาชิก
        </Button>
        {isOwner && members.length > 1 && (
          <Button variant="text small" onClick={() => remove(members.find((m) => m.id === user.id))}>
            ออกจากร้าน
          </Button>
        )}
      </div>
    </div>
  );
}

/** แถวสินค้าในคลัง: แก้สต็อก/ราคาแบบ Inline + เปิด/ปิดการขาย */
function InventoryRow({ product }) {
  const { user, dispatch, setModal, toast } = Q();
  const [price, setPrice] = useState(String(product.price));
  const [stock, setStock] = useState(String(product.stock));
  useEffect(() => setPrice(String(product.price)), [product.price]);
  useEffect(() => setStock(String(product.stock)), [product.stock]);
  const active = product.active !== false;
  const status = !active ? ["gray", "ปิดการขาย"] : product.stock <= 0 ? ["red", "สินค้าหมด"] : ["green", "กำลังขาย"];
  const save = (patch, message) => {
    dispatch({ type: "PRODUCT_QUICK", id: product.id, patch, user: user.id });
    if (message) toast(message);
  };
  const commitStock = (value) => {
    const n = Math.max(0, Math.round(Number(value)));
    if (!Number.isFinite(n)) return setStock(String(product.stock));
    if (n !== product.stock) save({ stock: n }, `บันทึกสต็อก ${product.name}: ${n} ชิ้น`);
    setStock(String(n));
  };
  const commitPrice = () => {
    const n = Math.round(Number(price) * 100) / 100;
    if (!Number.isFinite(n) || n <= 0) return setPrice(String(product.price));
    if (n !== product.price) save({ price: n }, `บันทึกราคา ${product.name}: ฿${Nt(n)}`);
  };
  return (
    <div className={"inv-row" + (active ? "" : " is-off")}>
      <div className="inv-main">
        <span className="inv-thumb">
          <ProductImage p={product} />
        </span>
        <div className="inv-name">
          <strong className="truncate">{product.name}</strong>
          <StatusChip color={status[0]}>{status[1]}</StatusChip>
        </div>
      </div>
      <div className="inv-controls">
        <label className="inv-field">
          <span>สต็อก</span>
          <span className="inv-stepper">
            <button type="button" aria-label={"ลดสต็อก " + product.name} disabled={product.stock <= 0} onClick={() => commitStock(product.stock - 1)}>
              −
            </button>
            <input
              inputMode="numeric"
              value={stock}
              onChange={(e) => setStock(e.target.value.replace(/[^\d]/g, ""))}
              onBlur={() => commitStock(stock)}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              aria-label={"สต็อก " + product.name}
            />
            <button type="button" aria-label={"เพิ่มสต็อก " + product.name} onClick={() => commitStock(product.stock + 1)}>
              +
            </button>
          </span>
        </label>
        <label className="inv-field">
          <span>ราคา (฿)</span>
          <input
            className="inv-price"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))}
            onBlur={commitPrice}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            aria-label={"ราคา " + product.name}
          />
        </label>
        <label className="switch" title={active ? "ปิดการขาย" : "เปิดขาย"}>
          <input
            type="checkbox"
            role="switch"
            checked={active}
            onChange={(e) => save({ active: e.target.checked }, e.target.checked ? `เปิดขาย ${product.name} แล้ว` : `ปิดการขาย ${product.name} ชั่วคราว`)}
            aria-label={(active ? "ปิดการขาย " : "เปิดขาย ") + product.name}
          />
          <span className="switch-track" aria-hidden="true" />
          <span className="switch-label">{active ? "เปิดขาย" : "ปิดการขาย"}</span>
        </label>
        <Button variant="outline small" icon="edit" onClick={() => setModal({ type: "productForm", id: product.id, shopId: product.shopId })}>
          แก้ไข
        </Button>
      </div>
    </div>
  );
}

/** สินค้าที่ควรดูแล (ย้ายมาจากหน้าแจ้งเตือนเดิม) */
function ShopAlerts({ shop }) {
  const { data, setTab, setLesson } = Q();
  const stale = (p) => {
    const sold = data.orders
      .filter((o) => o.status === "delivered" && o.items.some((it) => it.productId === p.id))
      .map((o) => new Date(o.date).getTime());
    const last = sold.length ? Math.max(...sold) : new Date(p.createdAt || ct()).getTime();
    return p.stock > 0 && Date.now() - last > 7 * 864e5;
  };
  const items = data.products.filter((p) => p.shopId === shop.id && p.active !== false && (p.stock < 5 || (p.cost ?? 0) > p.price || stale(p)));
  if (!items.length) return null;
  return (
    <section className="card">
      <h2 className="section-h">สินค้าที่ควรดูแล</h2>
      <div className="stack">
        {items.map((p) => {
          const lesson = (p.cost ?? 0) > p.price ? "cost" : stale(p) ? "demand" : "stock";
          return (
            <div className="alert-row" key={p.id}>
              <div>
                <strong>{p.name}</strong>
                <small>
                  {lesson === "cost"
                    ? "ราคาขายต่ำกว่าต้นทุนที่บันทึก"
                    : lesson === "demand"
                      ? "ขายไม่ออกเกิน 7 วัน"
                      : `เหลือ ${p.stock} ชิ้น`}
                </small>
              </div>
              <Button
                variant="link small"
                onClick={() => {
                  setTab("lessons");
                  setLesson(lesson);
                }}
              >
                ดูบทเรียน
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function InsightsTab({ shop }) {
  const { data, setModal } = Q();
  const feedback = data.feedback.filter((f) => f.shopId === shop.id);
  return (
    <div className="stack insights-tab">
      <div className="tools-callout">
        <strong>คำนวณต้นทุนและจุดคุ้มทุน</strong>
        <Button variant="link small" onClick={() => setModal({ type: "calculator" })}>
          เปิด
        </Button>
      </div>
      <ShopAlerts shop={shop} />
      <ShopInsights shop={shop} />
      {feedback.length > 0 && (
        <section className="card teacher-feedback">
          <h2 className="section-h">ความเห็นจากครู</h2>
          {feedback.map((f) => (
            <div className="review" key={f.id}>
              <div>
                <strong>
                  {f.score}/100 · {Pt(f.date)}
                </strong>
                <p>{f.text}</p>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
