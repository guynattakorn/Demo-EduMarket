// components/OrderCard.jsx
// แหล่งโค้ดจริงของ app.js — แก้ไขไฟล์ใน src/ แล้วรัน `npm run build`
import { useState } from "react";
import { ACTIVE_ORDER_STATUSES, ORDER_STATUS, ORDER_STEPS, timeLabel } from "../config/constants.js";
import { orderTotal } from "../lib/pricing.js";
import { Q } from "../state/context.js";
import { canChangeOrder } from "../state/reducer.js";
import { Nt, Pt, fmtTime } from "../utils/format.js";
import { Avatar, ShopLogo } from "./Avatar.jsx";
import { Button, Icon, StatusChip } from "./ui.jsx";

/** ปุ่มเปลี่ยนสถานะขั้นถัดไปของฝั่งร้าน */
const SHOP_NEXT = {
  awaiting: ["confirmed", "รับออเดอร์"],
  confirmed: ["preparing", "เริ่มเตรียมของ"],
  preparing: ["ready", "พร้อมส่งมอบ"],
  ready: ["delivered", "ส่งมอบสำเร็จ"],
};

export const pickupLine = (o) => {
  return `${o.pickupType === "booth" ? "รับที่บูธ" : "นัดเจอที่"} ${o.pickup}${o.time ? ` · ${timeLabel(o.time)} น.` : ""}`;
};

/** ความคืบหน้า 4 ขั้น: รับออเดอร์แล้ว -> กำลังเตรียมของ -> พร้อมรับที่จุดนัด -> ส่งมอบสำเร็จ */
export function OrderProgress({ status }) {
  const reached = ORDER_STEPS.findIndex((s) => s.status === status);
  return (
    <ol className="order-steps" aria-label={`สถานะ: ${ORDER_STATUS[status]?.label || status}`}>
      {ORDER_STEPS.map((step, i) => (
        <li className={i <= reached ? "done" : i === reached + 1 ? "next" : ""} key={step.status}>
          <span className="order-step-dot">{i <= reached ? "✓" : i + 1}</span>
          <span className="order-step-label">{step.label}</span>
        </li>
      ))}
    </ol>
  );
}

/** การ์ดคำสั่งซื้อ (Timeline 4 ขั้น + ปุ่มตามบทบาท) ใช้ทั้งฝั่งผู้ซื้อและร้านค้า */
export function OrderCard({ order, compact = false }) {
  const { data, user, dispatch, setModal, openChat, toast } = Q();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const shop = data.shops.find((s) => s.id === order.shopId);
  const buyer = data.users.find((u) => u.id === order.buyer);
  const side = shop?.members.includes(user.id) ? "shop" : order.buyer === user.id ? "buyer" : "viewer";
  const status = ORDER_STATUS[order.status] || { label: order.status, color: "gray" };
  const active = ACTIVE_ORDER_STATUSES.includes(order.status);
  const total = orderTotal(order);

  const change = (to, message) => {
    dispatch({ type: "ORDER_STATUS", id: order.id, status: to, user: user.id });
    if (message) toast(message);
  };
  const next = side === "shop" ? SHOP_NEXT[order.status] : null;
  const canCancel = side !== "viewer" && canChangeOrder(order, "cancelled", side);
  const buyerCanConfirm = side === "buyer" && canChangeOrder(order, "delivered", "buyer");

  return (
    <article className={"order-card2 status-" + order.status}>
      <header className="order-card2-head">
        <button
          className="order-card2-title"
          onClick={() => (side === "shop" ? null : setModal({ type: "store", id: shop?.id }))}
          disabled={side === "shop"}
        >
          {side === "shop" ? <Avatar name={buyer?.name} size="mini" /> : <ShopLogo shop={shop} size="mini" />}
          <span className="truncate">
            <strong>{side === "shop" ? buyer?.name || "ผู้ซื้อ" : shop?.name}</strong>
            <small>
              {side === "shop" ? `ร้าน ${shop?.name}` : `#${String(order.id).slice(-5)}`} · {Pt(order.date)} {fmtTime(order.date)}
            </small>
          </span>
        </button>
        <StatusChip color={status.color}>{status.label}</StatusChip>
      </header>

      <p className="order-card2-items">{order.items.map((it) => `${it.name} × ${it.qty}`).join(", ")}</p>

      {order.status !== "cancelled" && order.status !== "awaiting" && !compact && <OrderProgress status={order.status} />}
      {order.status === "awaiting" && !compact && <p className="order-waiting">รอร้านค้ายืนยันคำสั่งซื้อ</p>}

      {order.readyBy && active && (
        <p className="order-ready">
          <Icon name="box" size={16} /> พร้อมส่งมอบ {Pt(order.readyBy)}
        </p>
      )}

      {active && order.status !== "awaiting" ? (
        <div className="pickup-alert">
          <Icon name="clock" size={16} /> {order.pickup} · {timeLabel(order.time)} น.
        </div>
      ) : (
        <p className="order-card2-pickup">{pickupLine(order)}</p>
      )}

      <div className="order-card2-total">
        {order.discountAmount > 0 && <small>ส่วนลด -฿{Nt(order.discountAmount)}{order.promoCode ? ` (${order.promoCode})` : ""}</small>}
        <strong>฿{Nt(total)}</strong>
      </div>

      {side !== "viewer" && (
        <div className="order-card2-actions">
          {confirmCancel ? (
            <>
              <span className="muted">ยกเลิกคำสั่งซื้อนี้?</span>
              <Button variant="outline small" onClick={() => setConfirmCancel(false)}>
                ไม่ยกเลิก
              </Button>
              <Button variant="danger small" onClick={() => change("cancelled", "ยกเลิกคำสั่งซื้อแล้ว คืนสต็อกให้ร้านเรียบร้อย")}>
                ยืนยันยกเลิก
              </Button>
            </>
          ) : (
            <>
              {next && (
                <Button variant="black small" onClick={() => change(next[0], `อัปเดตเป็น "${ORDER_STATUS[next[0]].label}" แล้ว`)}>
                  {next[1]}
                </Button>
              )}
              {buyerCanConfirm && (
                <Button variant="black small" onClick={() => change("delivered", "ยืนยันรับของแล้ว ขอบคุณที่อุดหนุน")}>
                  ยืนยันรับของแล้ว
                </Button>
              )}
              {side === "buyer" && order.status === "delivered" && order.items[0] && (
                <Button variant="outline small" onClick={() => setModal({ type: "product", id: order.items[0].productId })}>
                  เขียนรีวิว
                </Button>
              )}
              <Button
                variant="ghost small"
                onClick={() => openChat({ shopId: order.shopId, buyerId: order.buyer, contextOrderId: order.id })}
              >
                แชท
              </Button>
              {canCancel && (
                <Button variant="text small" onClick={() => setConfirmCancel(true)}>
                  ยกเลิก
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </article>
  );
}
