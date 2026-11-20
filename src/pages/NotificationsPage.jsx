// pages/NotificationsPage.jsx
// แหล่งโค้ดจริงของ app.js — แก้ไขไฟล์ใน src/ แล้วรัน `npm run build`
import { useState } from "react";
import { ChatPanel } from "../components/ChatPanel.jsx";
import { OrderCard } from "../components/OrderCard.jsx";
import { EmptyState, Icon } from "../components/ui.jsx";
import { ACTIVE_ORDER_STATUSES } from "../config/constants.js";
import { notificationGroup, notificationIcon, openNotification } from "../lib/notifyNav.js";
import { Q } from "../state/context.js";
import { timeAgo } from "../utils/format.js";

const FILTERS = [
  ["all", "ทั้งหมด"],
  ["orders", "คำสั่งซื้อ"],
  ["promo", "โปรโมชัน"],
  ["classroom", "ห้องเรียน"],
];

/** หน้า "แจ้งเตือน & แชท" — เดิมชื่อ a1 */
export function NotificationsPage() {
  const { data, user, inboxMode, setInboxMode } = Q();
  const mine = data.notifications.filter((n) => n.to === user.id).sort((a, b) => new Date(b.date) - new Date(a.date));
  const unreadChat = mine.filter((n) => !n.read && n.type === "message").length;
  const unreadNotify = mine.filter((n) => !n.read && n.type !== "message").length;
  return (
    <div className={"inbox page-enter mode-" + inboxMode}>
      <div className="inbox-head">
        <h1>ข้อความ</h1>
        <div className="segmented-control inbox-toggle" role="tablist" aria-label="สลับแชทและแจ้งเตือน">
          <button role="tab" aria-selected={inboxMode === "chat"} className={inboxMode === "chat" ? "selected" : ""} onClick={() => setInboxMode("chat")}>
            แชท {unreadChat > 0 && <b className="badge-count">{unreadChat}</b>}
          </button>
          <button role="tab" aria-selected={inboxMode === "notify"} className={inboxMode === "notify" ? "selected" : ""} onClick={() => setInboxMode("notify")}>
            แจ้งเตือน {unreadNotify > 0 && <b className="badge-count">{unreadNotify}</b>}
          </button>
        </div>
      </div>
      {inboxMode === "chat" ? <ChatPanel /> : <NotifyPanel notifications={mine} />}
    </div>
  );
}

function NotifyPanel({ notifications }) {
  const ctx = Q();
  const { data, user, dispatch } = ctx;
  const [filter, setFilter] = useState("all");
  const list = filter === "all" ? notifications : notifications.filter((n) => notificationGroup(n) === filter);
  const myShopIds = data.shops.filter((s) => s.members.includes(user.id)).map((s) => s.id);
  const activeOrders =
    filter === "orders"
      ? data.orders
          .filter((o) => ACTIVE_ORDER_STATUSES.includes(o.status) && (o.buyer === user.id || myShopIds.includes(o.shopId)))
          .sort((a, b) => new Date(b.date) - new Date(a.date))
      : [];
  const unread = notifications.some((n) => !n.read);

  return (
    <div className="notify-panel">
      <div className="notify-toolbar">
        <div className="pill-row" role="tablist" aria-label="หมวดแจ้งเตือน">
          {FILTERS.map(([key, label]) => {
            const count = notifications.filter((n) => !n.read && (key === "all" || notificationGroup(n) === key)).length;
            return (
              <button role="tab" aria-selected={filter === key} className={filter === key ? "selected" : ""} onClick={() => setFilter(key)} key={key}>
                {label}
                {count > 0 && <b className="pill-count">{count}</b>}
              </button>
            );
          })}
        </div>
        <button className="btn text small notify-readall" disabled={!unread} onClick={() => dispatch({ type: "READ", user: user.id })}>
          อ่านทั้งหมด
        </button>
      </div>

      {activeOrders.length > 0 && (
        <section className="active-orders">
          <h2>กำลังดำเนินการ</h2>
          <div className="active-orders-list">
            {activeOrders.map((o) => (
              <OrderCard order={o} key={o.id} />
            ))}
          </div>
        </section>
      )}

      <div className="notify-list">
        {list.map((n) => (
          <button className={"notify-item" + (n.read ? "" : " unread")} onClick={() => openNotification(ctx, n)} key={n.id}>
            <span className={"notify-icon g-" + notificationGroup(n) + (n.type === "message" ? " g-chat" : "")} aria-hidden="true">
              <Icon name={notificationIcon(n)} size={18} />
            </span>
            <span className="notify-text">
              <strong className="truncate">{n.title}</strong>
              <span className="truncate">{n.text}</span>
            </span>
            <span className="notify-meta">
              <small>{timeAgo(n.date)}</small>
              {!n.read && <i className="unread-dot" aria-label="ยังไม่ได้อ่าน" />}
            </span>
          </button>
        ))}
        {!list.length && <EmptyState>ไม่มีแจ้งเตือน</EmptyState>}
      </div>
    </div>
  );
}
