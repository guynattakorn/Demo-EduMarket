// lib/notifyNav.js
// กดที่แจ้งเตือนแล้วกระโดดไปหน้า/ออเดอร์/ห้องแชทที่เกี่ยวข้อง (Phase 3 deep linking)

/** หมวดของแจ้งเตือนสำหรับ Filter Chips */
export function notificationGroup(n) {
  if (n.type === "order" || n.type === "review") return "orders";
  if (n.type === "promo") return "promo";
  return "classroom"; // teacher, lesson, system, invite, message, submission
}

export function notificationIcon(n) {
  // ชื่อไอคอนใน components/ui.jsx
  if (n.type === "message") return "chat";
  if (n.type === "order" || n.type === "review") return "box";
  if (n.type === "promo") return "tag";
  return "megaphone";
}

/** ctx = context จาก Q() */
export function openNotification(ctx, n) {
  const { data, user, role, dispatch, setModal, setTab, openChat, setActiveShopId, setShopTab, setLesson } = ctx;
  if (!n.read) dispatch({ type: "READ_ONE", id: n.id });
  const myShop = (shopId) => data.shops.find((s) => s.id === shopId && s.members.includes(user.id));

  switch (n.targetType) {
    case "order":
      return setModal({ type: "orderDetail", id: n.targetId });
    case "chat":
      if (n.shopId) return openChat({ shopId: n.shopId, buyerId: n.buyerId });
      if (n.peerId) return openChat({ peerId: n.peerId });
      break;
    case "assignment":
      if (role === "teacher") return setTab("classroom");
      setTab("lessons");
      return setModal({ type: "assignment", id: n.targetId });
    case "content":
      setTab(role === "teacher" ? "classroom" : "lessons");
      return setModal({ type: "content", id: n.targetId });
    case "announcement":
    case "lessons":
      setLesson?.(null);
      return setTab(role === "teacher" ? "classroom" : "lessons");
    case "review":
      if (myShop(n.shopId)) {
        setActiveShopId(n.shopId);
        setShopTab("orders:reviews");
        return setTab("shop");
      }
      break;
    case "shop":
      if (myShop(n.shopId)) {
        setActiveShopId(n.shopId);
        setShopTab(n.targetId === "insights" ? "insights" : "orders");
        return setTab("shop");
      }
      if (role === "teacher") return setTab("analytics");
      return setModal({ type: "store", id: n.shopId });
    default:
      break;
  }

  // Legacy notifications (before Phase 3) have no target — best effort.
  if (n.type === "message") {
    const last = [...data.messages].reverse().find((m) => m.to === user.id && (m.text === n.text || !n.text));
    if (last) return last.shopId ? openChat({ shopId: last.shopId, buyerId: last.buyerId }) : openChat({ peerId: last.from });
    return;
  }
  if (n.type === "order") return n.title.includes("คำสั่งซื้อใหม่") ? setTab("shop") : setModal({ type: "orders" });
  if (n.type === "review") return setTab("shop");
  if (n.type === "promo") return setTab("market");
  if (role === "teacher") return setTab("classroom");
  return setTab(n.title.includes("ร้าน") ? "shop" : "lessons");
}
