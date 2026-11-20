// lib/chat.js
// ห้องแชทแบบ Shopee: 1 ห้อง = ร้านค้า 1 ร้าน + ลูกค้า 1 คน (threadKey = shop:<shopId>:<buyerId>)
// และแชทตรงระหว่างครูกับนักเรียน (threadKey = dm:<a>:<b>)
import { ACTIVE_ORDER_STATUSES, dmThreadKey, shopThreadKey } from "../config/constants.js";

/** ข้อมูลห้องแชทจาก key + มุมมองของผู้ใช้ */
export function describeThread(data, user, ref) {
  if (ref.shopId) {
    const shop = data.shops.find((s) => s.id === ref.shopId);
    const buyer = data.users.find((u) => u.id === ref.buyerId);
    const asShop = Boolean(shop?.members.includes(user.id)) && ref.buyerId !== user.id;
    return {
      key: ref.threadKey || shopThreadKey(ref.shopId, ref.buyerId),
      kind: "shop",
      shopId: ref.shopId,
      buyerId: ref.buyerId,
      peerId: null,
      as: asShop ? "shop" : "buyer",
      shop,
      buyer,
      title: asShop ? buyer?.name || "ลูกค้า" : shop?.name || "ร้านค้า",
      avatarName: asShop ? buyer?.name || "ลูกค้า" : null,
      avatarShop: asShop ? null : shop,
      label: asShop ? `ร้าน: ${shop?.name || ""}` : "ร้านค้า",
    };
  }
  const peer = data.users.find((u) => u.id === ref.peerId);
  return {
    key: ref.threadKey || dmThreadKey(user.id, ref.peerId),
    kind: "dm",
    shopId: null,
    buyerId: null,
    peerId: ref.peerId,
    as: "dm",
    peer,
    title: peer?.name || "ผู้ใช้",
    avatarName: peer?.name || "ผู้ใช้",
    avatarShop: null,
    label: peer?.role === "teacher" ? "คุณครู" : peer?.role === "student" ? "นักเรียน" : "",
  };
}

/** รายการห้องแชททั้งหมดของผู้ใช้ เรียงตามข้อความล่าสุด */
export function threadsForUser(data, user, role) {
  const myShopIds = data.shops.filter((s) => s.members.includes(user.id)).map((s) => s.id);
  const map = new Map();
  const touch = (ref, msg) => {
    const t = map.get(ref.key) || { ...ref, last: null };
    if (msg && (!t.last || new Date(msg.date) >= new Date(t.last.date))) t.last = msg;
    map.set(ref.key, t);
  };
  for (const m of data.messages) {
    if (m.shopId) {
      if (m.buyerId === user.id || myShopIds.includes(m.shopId)) touch({ key: m.threadKey || shopThreadKey(m.shopId, m.buyerId), shopId: m.shopId, buyerId: m.buyerId }, m);
    } else if (m.from === user.id || m.to === user.id) {
      const peerId = m.from === user.id ? m.to : m.from;
      touch({ key: m.threadKey || dmThreadKey(user.id, peerId), peerId }, m);
    }
  }
  // Teacher contacts are always reachable.
  if (role === "student") {
    const teacherId = data.classes.find((c) => c.id === user.classId)?.teacherId;
    if (teacherId) touch({ key: dmThreadKey(user.id, teacherId), peerId: teacherId });
  }
  if (role === "teacher") {
    const classIds = data.classes.filter((c) => c.teacherId === user.id).map((c) => c.id);
    data.users.filter((u) => u.role === "student" && classIds.includes(u.classId)).forEach((s) => touch({ key: dmThreadKey(user.id, s.id), peerId: s.id }));
  }
  const unreadByThread = {};
  data.notifications
    .filter((n) => n.to === user.id && !n.read && n.type === "message" && n.threadKey)
    .forEach((n) => (unreadByThread[n.threadKey] = (unreadByThread[n.threadKey] || 0) + 1));
  return [...map.values()]
    .map((t) => ({ ...describeThread(data, user, { ...t, threadKey: t.key }), last: t.last, unread: unreadByThread[t.key] || 0 }))
    .sort((a, b) => new Date(b.last?.date || 0) - new Date(a.last?.date || 0));
}

/** ข้อความในห้อง เรียงตามเวลา */
export const threadMessages = (data, key) =>
  data.messages.filter((m) => m.threadKey === key).sort((a, b) => new Date(a.date) - new Date(b.date));

/** ออเดอร์ล่าสุดที่ยังไม่เสร็จระหว่างร้านกับลูกค้า (ใช้เป็นค่าเริ่มต้นของแถบนัดรับ) */
export const activeOrderBetween = (data, shopId, buyerId) =>
  data.orders
    .filter((o) => o.shopId === shopId && o.buyer === buyerId && ACTIVE_ORDER_STATUSES.includes(o.status))
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0] || null;
