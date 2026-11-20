// components/ChatPanel.jsx
// แหล่งโค้ดจริงของ app.js — แก้ไขไฟล์ใน src/ แล้วรัน `npm run build`
import { useEffect, useRef, useState } from "react";
import { CUSTOM_OPTION, MEETUP_POINTS, ORDER_STATUS, PICKUP_TIMES, timeLabel } from "../config/constants.js";
import { activeOrderBetween, describeThread, threadMessages, threadsForUser } from "../lib/chat.js";
import { orderTotal, productPricing } from "../lib/pricing.js";
import { Q } from "../state/context.js";
import { Nt, St, ct, fmtTime, timeAgo } from "../utils/format.js";
import { useVisualViewportVars } from "../lib/mobile.js";
import { uploadImage } from "../utils/upload.js";
import { Avatar, ShopLogo } from "./Avatar.jsx";
import { ProductImage } from "./ProductImage.jsx";
import { Button, EmptyState, Icon, StatusChip } from "./ui.jsx";

const ROLE_FILTERS = [
  ["all", "ทั้งหมด"],
  ["buyer", "ผู้ซื้อ"],
  ["shop", "ร้านค้า"],
];

/** รูปห้องแชท: โลโก้ร้าน หรือ ตัวอักษรย่อของผู้ใช้ */
function ThreadAvatar({ thread }) {
  return thread.avatarShop ? <ShopLogo shop={thread.avatarShop} size="small" /> : <Avatar name={thread.avatarName} />;
}

/** แชทซื้อขายแบบ Shopee: รายชื่อห้อง (ซ้าย) + หน้าต่างสนทนา (ขวา / เต็มจอบนมือถือ) */
export function ChatPanel() {
  const { data, user, role, chat, setChat, dispatch } = Q();
  const [roleFilter, setRoleFilter] = useState("all");
  const [query, setQuery] = useState("");

  let threads = threadsForUser(data, user, role);
  const selected = chat ? describeThread(data, user, chat) : null;
  if (selected && !threads.some((t) => t.key === selected.key)) threads = [{ ...selected, last: null, unread: 0 }, ...threads];
  const q = query.trim().toLowerCase();
  const visible = threads.filter(
    (t) => (roleFilter === "all" || t.as === roleFilter) && (!q || `${t.title} ${t.label}`.toLowerCase().includes(q)),
  );
  const selectedUnread = threads.find((t) => t.key === selected?.key)?.unread || 0;

  // Opening a room marks its chat notifications as read.
  useEffect(() => {
    if (selected && selectedUnread > 0) dispatch({ type: "READ_THREAD", user: user.id, threadKey: selected.key });
  }, [selected?.key, selectedUnread]);

  return (
    <div className={"chat-split" + (selected ? " has-thread" : "")}>
      <aside className="chat-list" aria-label="รายการห้องแชท">
        <div className="chat-list-tools">
          <label className="chat-search">
            <Icon name="search" size={16} />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ค้นหาแชท" aria-label="ค้นหาแชท" />
          </label>
          {role === "student" && (
            <div className="pill-row" role="tablist" aria-label="กรองห้องแชท">
              {ROLE_FILTERS.map(([key, label]) => (
                <button role="tab" aria-selected={roleFilter === key} className={roleFilter === key ? "selected" : ""} onClick={() => setRoleFilter(key)} key={key}>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="chat-threads">
          {visible.map((t) => (
            <button
              className={"chat-thread" + (selected?.key === t.key ? " active" : "") + (t.unread ? " unread" : "")}
              onClick={() => setChat({ threadKey: t.key, shopId: t.shopId, buyerId: t.buyerId, peerId: t.peerId })}
              key={t.key}
            >
              <ThreadAvatar thread={t} />
              <span className="chat-thread-main">
                <span className="chat-thread-title">
                  <strong className="truncate">{t.title}</strong>
                  {t.label && <span className={"thread-tag " + t.as}>{t.label}</span>}
                </span>
                <small className="truncate">
                  {t.last ? (t.last.kind === "system" ? t.last.text : t.last.imageUrl ? "รูปภาพ" : t.last.text) : "ยังไม่มีข้อความ"}
                </small>
              </span>
              <span className="chat-thread-meta">
                {t.last && <small>{timeAgo(t.last.date)}</small>}
                {t.unread > 0 && <b className="badge-count">{t.unread}</b>}
              </span>
            </button>
          ))}
          {!visible.length && <EmptyState>ยังไม่มีห้องแชท</EmptyState>}
        </div>
      </aside>
      <section className="chat-room" aria-label="หน้าต่างสนทนา">
        {selected ? (
          <ChatRoom thread={selected} onBack={() => setChat(null)} key={selected.key} />
        ) : (
          <div className="chat-placeholder">เลือกห้องแชทเพื่อเริ่มคุย</div>
        )}
      </section>
    </div>
  );
}

function ChatRoom({ thread, onBack }) {
  const { data, user, chat, dispatch, setModal, toast } = Q();
  useVisualViewportVars();
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const endRef = useRef(null);
  const messages = threadMessages(data, thread.key);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const shop = thread.shop;
  const inChatState = chat?.threadKey === thread.key;
  const lastCtx = (field) => [...messages].reverse().find((m) => m[field])?.[field];
  const ctxOrderId = (inChatState && chat.contextOrderId) || (!(inChatState && chat.contextProductId) && lastCtx("contextOrderId")) || null;
  const ctxProductId = (inChatState && chat.contextProductId) || lastCtx("contextProductId") || null;
  const activeOrder = thread.kind === "shop" ? activeOrderBetween(data, thread.shopId, thread.buyerId) : null;
  const pinnedOrder = data.orders.find((o) => o.id === ctxOrderId) || (!ctxProductId ? activeOrder : null);
  const pinnedProduct = !pinnedOrder ? data.products.find((p) => p.id === ctxProductId) : null;

  const isMine = (m) =>
    thread.kind === "shop" ? (thread.as === "shop" ? m.from !== thread.buyerId : m.from === thread.buyerId) : m.from === user.id;
  const recipient =
    thread.kind === "shop" ? (thread.as === "shop" ? thread.buyerId : shop?.ownerId || shop?.members[0] || null) : thread.peerId;

  const send = (extra) => {
    // Persist the pinned context on the message so the other side sees the same card.
    const pinCtx = {};
    if (inChatState && chat.contextProductId && lastCtx("contextProductId") !== chat.contextProductId) pinCtx.contextProductId = chat.contextProductId;
    if (inChatState && chat.contextOrderId && lastCtx("contextOrderId") !== chat.contextOrderId) pinCtx.contextOrderId = chat.contextOrderId;
    dispatch({
      type: "MESSAGE",
      item: {
        id: St("msg"),
        threadKey: thread.key,
        shopId: thread.shopId,
        buyerId: thread.buyerId,
        from: user.id,
        to: recipient,
        senderName: user.name,
        date: ct(),
        ...pinCtx,
        ...extra,
      },
    });
  };

  const onPickImage = async (ev) => {
    const file = ev.target.files?.[0];
    ev.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadImage(file, { maxSide: 1280, quality: 0.72, maxBytes: 200 * 1024 });
      send({ kind: "image", imageUrl: url, text: "" });
    } catch (err) {
      toast(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="chat-room-inner">
      <header className="chat-header">
        <button className="icon-btn chat-back" onClick={onBack} aria-label="ย้อนกลับ">
          <Icon name="back" />
        </button>
        <ThreadAvatar thread={thread} />
        <div className="chat-header-title">
          <strong className="truncate">{thread.title}</strong>
          {thread.label && <span className={"thread-tag " + thread.as}>{thread.label}</span>}
        </div>
        {thread.kind === "shop" && thread.as === "buyer" && (
          <Button variant="ghost small" onClick={() => setModal({ type: "store", id: thread.shopId })}>
            ดูร้าน
          </Button>
        )}
      </header>

      {pinnedOrder && (
        <div className="chat-context">
          <ShopLogo shop={shop} size="mini" />
          <div className="chat-context-info">
            <strong className="truncate">
              คำสั่งซื้อ #{String(pinnedOrder.id).slice(-5)} · {pinnedOrder.items.map((i) => `${i.name}×${i.qty}`).join(", ")}
            </strong>
            <small>
              <StatusChip color={ORDER_STATUS[pinnedOrder.status]?.color}>{ORDER_STATUS[pinnedOrder.status]?.label}</StatusChip> ฿{Nt(orderTotal(pinnedOrder))}
            </small>
          </div>
          <Button variant="link small" onClick={() => setModal({ type: "orderDetail", id: pinnedOrder.id })}>
            ดูออเดอร์
          </Button>
        </div>
      )}
      {pinnedProduct && (
        <div className="chat-context">
          <span className="chat-context-thumb">
            <ProductImage p={pinnedProduct} />
          </span>
          <div className="chat-context-info">
            <strong className="truncate">{pinnedProduct.name}</strong>
            <small>฿{Nt(productPricing(data, pinnedProduct).price)}</small>
          </div>
          <Button variant="link small" onClick={() => setModal({ type: "product", id: pinnedProduct.id })}>
            ดูสินค้า
          </Button>
        </div>
      )}

      {thread.kind === "shop" && <AppointmentBar thread={thread} activeOrder={activeOrder} />}

      <div className="chat-messages" role="log" aria-live="polite">
        {messages.length === 0 && <p className="chat-placeholder">เริ่มบทสนทนาได้เลย</p>}
        {messages.map((m) =>
          m.kind === "system" ? (
            <div className="chat-system" key={m.id}>
              <span>{m.text}</span>
              <small>
                {m.senderName ? `${m.senderName} · ` : ""}
                {fmtTime(m.date)}
              </small>
            </div>
          ) : (
            <div className={"bubble-row " + (isMine(m) ? "mine" : "theirs")} key={m.id}>
              <div className="bubble">
                {thread.kind === "shop" && m.from !== thread.buyerId && (
                  <small className="bubble-sender">ตอบโดย {m.senderName || data.users.find((u) => u.id === m.from)?.name || "ร้านค้า"}</small>
                )}
                {m.imageUrl && (
                  <button className="bubble-image" onClick={() => setModal({ type: "image", src: m.imageUrl })} aria-label="ดูรูปภาพขนาดเต็ม">
                    <img src={m.imageUrl} alt="รูปภาพในแชท" loading="lazy" />
                  </button>
                )}
                {m.text && <p>{m.text}</p>}
                <small className="bubble-time">{fmtTime(m.date)}</small>
              </div>
            </div>
          ),
        )}
        <div ref={endRef} />
      </div>

      <form
        className="chat-input-bar"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          send({ kind: "text", text: text.trim() });
          setText("");
        }}
      >
        <button type="button" className="chat-attach" onClick={() => fileRef.current?.click()} disabled={uploading} aria-label="ส่งรูปภาพ">
          {uploading ? <span className="spinner" aria-hidden="true" /> : <Icon name="camera" size={20} />}
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickImage} />
        <input
          className="chat-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={uploading ? "กำลังส่งรูป…" : "พิมพ์ข้อความ…"}
          aria-label="ข้อความ"
          maxLength={1000}
          enterKeyHint="send"
        />
        <button className="chat-send" disabled={!text.trim()} aria-label="ส่งข้อความ">
          <Icon name="send" size={18} />
        </button>
      </form>
    </div>
  );
}

/** แถบปักหมุดจุดนัดรับในโรงเรียน (อยู่ใต้หัวแชทเสมอ) */
function AppointmentBar({ thread, activeOrder }) {
  const { data, user, dispatch, toast } = Q();
  const appt = data.chatAppointments.find((a) => a.threadKey === thread.key);
  const shop = thread.shop;
  const shown = appt || (activeOrder ? { location: activeOrder.pickup, time: activeOrder.time, fromOrder: true } : null);
  const [editing, setEditing] = useState(false);
  const locationOptions = [...new Set([shop?.boothLocation, ...MEETUP_POINTS].filter(Boolean))];
  const [loc, setLoc] = useState(shown?.location && locationOptions.includes(shown.location) ? shown.location : shown?.location ? CUSTOM_OPTION : locationOptions[0]);
  const [customLoc, setCustomLoc] = useState(shown?.location && !locationOptions.includes(shown.location) ? shown.location : "");
  const timeValues = PICKUP_TIMES.map((t) => t.value);
  const [time, setTime] = useState(shown?.time && timeValues.includes(shown.time) ? shown.time : shown?.time ? CUSTOM_OPTION : "12:00");
  const [customTime, setCustomTime] = useState(shown?.time && !timeValues.includes(shown.time) ? shown.time : "");

  const sideOf = (uid) => (uid === thread.buyerId ? "buyer" : "shop");
  const mySide = thread.as === "shop" ? "shop" : "buyer";
  const waitingForMe = appt && !appt.confirmed && sideOf(appt.proposedBy) !== mySide;
  const waitingForOther = appt && !appt.confirmed && sideOf(appt.proposedBy) === mySide;

  const save = (e) => {
    e.preventDefault();
    const location = loc === CUSTOM_OPTION ? customLoc.trim() : loc;
    const t = time === CUSTOM_OPTION ? customTime.trim() : time;
    if (!location || !t) return toast("ระบุจุดนัดรับและเวลาให้ครบ");
    dispatch({ type: "APPOINTMENT_SET", threadKey: thread.key, shopId: thread.shopId, buyerId: thread.buyerId, location, time: t, user: user.id });
    setEditing(false);
    toast("ปักหมุดนัดรับแล้ว รออีกฝ่ายยืนยัน");
  };

  return (
    <div className={"appt-bar" + (appt?.confirmed ? " confirmed" : "")}>
      {!editing ? (
        <>
          <div className="appt-info">
            {shown ? (
              <>
                <span className="appt-chip">
                  <Icon name="pin" size={15} /> <strong>{shown.location}</strong>
                </span>
                <span className="appt-chip">
                  <Icon name="clock" size={15} /> {timeLabel(shown.time)} น.
                </span>
                {appt?.confirmed && <StatusChip color="green">ยืนยันแล้ว</StatusChip>}
                {waitingForOther && <StatusChip color="yellow">รออีกฝ่ายยืนยัน</StatusChip>}
                {shown.fromOrder && <StatusChip color="gray">จากคำสั่งซื้อ</StatusChip>}
              </>
            ) : (
              <span className="muted appt-chip">
                <Icon name="pin" size={15} /> ยังไม่ได้นัดจุดรับของ
              </span>
            )}
          </div>
          <div className="appt-actions">
            {waitingForMe && (
              <Button
                variant="black small"
                onClick={() => {
                  dispatch({ type: "APPOINTMENT_CONFIRM", threadKey: thread.key, user: user.id });
                  toast("ยืนยันนัดรับแล้ว อัปเดตจุดนัดของออเดอร์ให้ตรงกัน");
                }}
              >
                ยืนยันนัดรับ
              </Button>
            )}
            <Button variant="outline small" onClick={() => setEditing(true)}>
              {shown && !shown.fromOrder ? "แก้ไขนัดรับ" : "นัดรับของ"}
            </Button>
          </div>
        </>
      ) : (
        <form className="appt-form" onSubmit={save}>
          <label>
            <span>จุดนัดรับ</span>
            <select value={loc} onChange={(e) => setLoc(e.target.value)}>
              {locationOptions.map((o) => (
                <option key={o} value={o}>
                  {o === shop?.boothLocation ? `${o} (บูธร้าน)` : o}
                </option>
              ))}
              <option value={CUSTOM_OPTION}>อื่นๆ (ระบุเอง)</option>
            </select>
          </label>
          {loc === CUSTOM_OPTION && <input value={customLoc} onChange={(e) => setCustomLoc(e.target.value)} placeholder="เช่น ม้าหินอ่อนตึก 3" maxLength={80} aria-label="พิมพ์จุดนัดรับเอง" />}
          <label>
            <span>เวลานัดหมาย</span>
            <select value={time} onChange={(e) => setTime(e.target.value)}>
              {PICKUP_TIMES.map((t) => (
                <option value={t.value} key={t.value}>
                  {t.label}
                </option>
              ))}
              <option value={CUSTOM_OPTION}>ระบุเวลาเอง</option>
            </select>
          </label>
          {time === CUSTOM_OPTION && <input value={customTime} onChange={(e) => setCustomTime(e.target.value)} placeholder="เช่น 12:10" maxLength={40} aria-label="พิมพ์เวลานัดเอง" />}
          <div className="appt-actions">
            <Button variant="outline small" type="button" onClick={() => setEditing(false)}>
              ยกเลิก
            </Button>
            <Button variant="black small">ปักหมุดนัดรับ</Button>
          </div>
        </form>
      )}
    </div>
  );
}
