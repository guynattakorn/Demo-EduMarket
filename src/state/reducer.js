// state/reducer.js
// แหล่งโค้ดจริงของ app.js — แก้ไขไฟล์ใน src/ แล้วรัน `npm run build`
import { ACTIVE_ORDER_STATUSES, Ea, PICKUP_TYPES, dmThreadKey, leadDaysOf, readyByDate, shopThreadKey, timeLabel, vl } from "../config/constants.js";
import { shopTotals } from "../lib/pricing.js";
import { St, ct } from "../utils/format.js";

/** การเปลี่ยนสถานะออเดอร์ที่อนุญาต: from -> { to: ใครกดได้ } */
const TRANSITIONS = {
  awaiting: { confirmed: ["shop"], cancelled: ["shop", "buyer"] },
  confirmed: { preparing: ["shop"], delivered: ["buyer"], cancelled: ["shop"] },
  preparing: { ready: ["shop"], delivered: ["buyer"], cancelled: ["shop"] },
  ready: { delivered: ["shop", "buyer"], cancelled: ["shop"] },
};

export const canChangeOrder = (order, to, side) => Boolean(TRANSITIONS[order.status]?.[to]?.includes(side));

const pickupText = (o) =>
  `${o.pickupType === "booth" ? "รับที่บูธ " : ""}${o.pickup}${o.time ? ` (${timeLabel(o.time)} น.)` : ""}`;

/** Reducer หลักของแอป — ทุก action ที่เปลี่ยนข้อมูลผ่านฟังก์ชันนี้ */
export function Up(state, action) {
  // Whole state pulled from the server (auto refresh / pull-to-refresh) — already migrated by the caller.
  if (action.type === "REPLACE_STATE") return action.state;
  const a = structuredClone(state);

  /** สร้างแจ้งเตือน: target = { targetType, targetId, shopId, buyerId, threadKey, peerId } */
  const notify = (to, title, text, type = "teacher", target = {}) => {
    if (!to) return;
    a.notifications.unshift({ id: St("n"), to, title, text, type, date: ct(), read: false, ...target });
  };
  const studentsOf = (classId) => a.users.filter((u) => u.role === "student" && u.classId === classId);
  const shopById = (id) => a.shops.find((s) => s.id === id);
  const userName = (id) => a.users.find((u) => u.id === id)?.name || "ผู้ใช้";
  const log = (entry) => a.logs.unshift({ id: St("log"), date: ct(), ...entry });

  switch (action.type) {
    case "WISH": {
      const p = a.products.find((x) => x.id === action.id);
      if (!p) return state;
      p.wishedBy = p.wishedBy.includes(action.user) ? p.wishedBy.filter((u) => u !== action.user) : [...p.wishedBy, action.user];
      break;
    }
    case "VIEW": {
      const p = a.products.find((x) => x.id === action.id);
      if (p) p.views++;
      break;
    }
    case "COMPLETE":
      a.progress[action.user] = [...new Set([...(a.progress[action.user] || []), action.module])];
      break;
    case "GRANT":
      a.progress[action.user] = Ea.map((m) => m.id);
      notify(action.user, "ได้รับเหรียญบทเรียนหลัก", "ผู้ดูแลมอบเหรียญสำหรับการสาธิตระบบ", "lesson", { targetType: "lessons" });
      break;

    // ---------------------------------------------------------------- classroom
    case "CONTENT":
      a.contents.unshift({ attachments: [], ...action.item });
      studentsOf(action.item.classId).forEach((s) =>
        notify(s.id, "ครูเพิ่มบทเรียนใหม่", action.item.title, "teacher", { targetType: "content", targetId: action.item.id }),
      );
      break;
    case "ASSIGN": {
      const existing = a.assignments.find((x) => x.id === action.item.id);
      if (existing) {
        Object.assign(existing, action.item);
        break;
      }
      a.assignments.unshift({ attachments: [], ...action.item });
      studentsOf(action.item.classId).forEach((s) =>
        notify(s.id, "มีภารกิจใหม่จากครู", action.item.title, "teacher", { targetType: "assignment", targetId: action.item.id }),
      );
      break;
    }
    case "ANNOUNCE": {
      a.announcements.unshift(action.item);
      studentsOf(action.item.classId).forEach((s) =>
        notify(s.id, `ประกาศ: ${action.item.title}`, action.item.text, "teacher", { targetType: "announcement", targetId: action.item.id }),
      );
      break;
    }
    case "SUBMIT": {
      const asg = a.assignments.find((x) => x.id === action.item.assignmentId);
      if (!asg) return state;
      a.submissions = a.submissions.filter((x) => !(x.assignmentId === action.item.assignmentId && x.userId === action.item.userId));
      a.submissions.push(action.item);
      notify(asg.teacherId, "นักเรียนส่งงานแล้ว", `${userName(action.item.userId)} \xB7 ${asg.title}`, "submission", {
        targetType: "assignment",
        targetId: asg.id,
      });
      break;
    }
    case "GRADE": {
      const sub = a.submissions.find((x) => x.id === action.id);
      if (!sub) return state;
      sub.score = action.score;
      sub.feedback = action.feedback;
      notify(sub.userId, "ครูตรวจงานของเราแล้ว", `${action.score}/100 คะแนน \xB7 ${action.feedback}`, "teacher", {
        targetType: "assignment",
        targetId: sub.assignmentId,
      });
      break;
    }
    case "FEEDBACK":
      a.feedback.unshift(action.item);
      shopById(action.item.shopId)?.members.forEach((m) =>
        notify(m, "ข้อเสนอแนะสำหรับร้านของเรา", `${action.item.score}/100 \xB7 ${action.item.text}`, "teacher", {
          targetType: "shop",
          shopId: action.item.shopId,
          targetId: "insights",
        }),
      );
      break;

    // ---------------------------------------------------------------- products
    case "PRODUCT": {
      const p = a.products.find((x) => x.id === action.item.id);
      if (p) {
        for (const [field, label] of [
          ["price", "ราคา"],
          ["stock", "สต็อก"],
        ])
          if (p[field] !== action.item[field])
            log({
              shopId: p.shopId,
              productId: p.id,
              type: label,
              before: p[field],
              after: action.item[field],
              reason: action.reason || "ปรับแผนการขาย",
              actor: action.user,
            });
        Object.assign(p, action.item);
      } else {
        a.products.unshift({ active: true, ...action.item, views: 0, wishBase: 0, wishedBy: [] });
        log({
          shopId: action.item.shopId,
          productId: action.item.id,
          type: "เปิดขาย",
          before: 0,
          after: action.item.stock,
          reason: "เริ่มขายสินค้าใหม่",
          actor: action.user,
        });
      }
      break;
    }
    case "PRODUCT_QUICK": {
      // Inline edit from My Shop (no reason required — logged automatically).
      const p = a.products.find((x) => x.id === action.id);
      if (!p) return state;
      const patch = action.patch || {};
      if (patch.stock !== undefined) patch.stock = Math.max(0, Math.round(Number(patch.stock) || 0));
      if (patch.price !== undefined) patch.price = Math.max(0, Number(patch.price) || 0);
      for (const [field, label] of [
        ["price", "ราคา"],
        ["stock", "สต็อก"],
      ])
        if (patch[field] !== undefined && patch[field] !== p[field])
          log({ shopId: p.shopId, productId: p.id, type: label, before: p[field], after: patch[field], reason: "ปรับสต็อก/ราคาจากหน้าร้าน", actor: action.user });
      if (patch.active !== undefined && patch.active !== (p.active !== false))
        log({
          shopId: p.shopId,
          productId: p.id,
          type: "สถานะการขาย",
          before: p.active !== false ? 1 : 0,
          after: patch.active ? 1 : 0,
          reason: patch.active ? "เปิดขายจากหน้าร้าน" : "ปิดการขายชั่วคราวจากหน้าร้าน",
          actor: action.user,
        });
      Object.assign(p, patch);
      break;
    }

    // ---------------------------------------------------------------- shops & team
    case "SHOP": {
      const shop = shopById(action.item.id);
      if (shop) Object.assign(shop, action.item);
      else {
        const members = action.item.members?.length ? action.item.members : [action.user].filter(Boolean);
        a.shops.push({ ownerId: action.user || members[0] || null, boothLocation: "", openHours: "", ...action.item, members });
      }
      break;
    }
    case "SHOP_MEMBER_ADD": {
      const shop = shopById(action.shopId);
      if (!shop || shop.members.includes(action.userId)) return state;
      if (!shop.members.includes(action.by)) return state;
      shop.members.push(action.userId);
      notify(action.userId, `คุณได้รับเชิญเข้าร่วมทีมร้าน ${shop.name}`, `${userName(action.by)} ชวนคุณมาช่วยขาย`, "invite", {
        targetType: "shop",
        shopId: shop.id,
        targetId: "team",
      });
      break;
    }
    case "SHOP_MEMBER_REMOVE": {
      const shop = shopById(action.shopId);
      if (!shop || !shop.members.includes(action.userId)) return state;
      const leaving = action.userId === action.by;
      const isOwner = (shop.ownerId || shop.members[0]) === action.by;
      if (!leaving && !isOwner) return state;
      if (shop.members.length <= 1) return state; // a shop always keeps at least one member
      shop.members = shop.members.filter((m) => m !== action.userId);
      if (shop.ownerId === action.userId) shop.ownerId = shop.members[0];
      if (leaving) notify(shop.ownerId, "สมาชิกออกจากร้าน", `${userName(action.userId)} ออกจากทีมร้าน ${shop.name}`, "system", { targetType: "shop", shopId: shop.id, targetId: "team" });
      else notify(action.userId, "คุณถูกนำออกจากทีมร้าน", shop.name, "system", { targetType: "shop", shopId: shop.id });
      break;
    }

    // ---------------------------------------------------------------- orders
    case "ORDER": {
      // New shape: { user, groups: [{ shopId, items:[{productId, qty}], pickupType, pickup, time, promoCode }] }
      // Legacy shape: { user, cart, pickup, time }
      let groups = action.groups;
      if (!groups && action.cart) {
        const byShop = {};
        for (const it of action.cart) {
          const p = a.products.find((x) => x.id === it.productId);
          if (p) (byShop[p.shopId] ??= []).push(it);
        }
        groups = Object.entries(byShop).map(([shopId, items]) => ({ shopId, items, pickupType: "meetup", pickup: action.pickup, time: action.time }));
      }
      if (!groups?.length) return state;

      // Validate everything first so a multi-shop checkout is all-or-nothing.
      const need = new Map();
      for (const g of groups) {
        const shop = shopById(g.shopId);
        if (!shop || shop.members.includes(action.user)) return state;
        if (!PICKUP_TYPES[g.pickupType] || !String(g.pickup || "").trim() || !String(g.time || "").trim()) return state;
        if (!g.items?.length) return state;
        for (const it of g.items) {
          if (!Number.isInteger(it.qty) || it.qty < 1) return state;
          const p = a.products.find((x) => x.id === it.productId);
          if (!p || p.shopId !== g.shopId || p.active === false) return state;
          need.set(p.id, (need.get(p.id) || 0) + it.qty);
        }
      }
      for (const [productId, qty] of need) if (a.products.find((x) => x.id === productId).stock < qty) return state;

      for (const g of groups) {
        const totals = shopTotals(a, g.shopId, g.items, g.promoCode);
        const order = {
          id: St("order"),
          buyer: action.user,
          shopId: g.shopId,
          items: totals.lines.map((l) => ({
            productId: l.productId,
            name: l.product.name,
            price: l.price,
            originalPrice: l.originalPrice,
            cost: l.product.cost ?? null,
            qty: l.qty,
          })),
          status: "awaiting",
          pickupType: g.pickupType,
          pickup: String(g.pickup).trim(),
          time: String(g.time).trim(),
          subtotal: totals.subtotal,
          discountAmount: totals.discountAmount,
          voucherId: totals.voucher?.id || null,
          promoCode: totals.codePromo?.code || null,
          total: totals.total,
          date: ct(),
          history: [{ status: "awaiting", by: action.user, date: ct() }],
        };
        // Longest preparation time among the items decides when the order can be handed over.
        const leadDays = Math.max(0, ...totals.lines.map((l) => leadDaysOf(l.product)));
        if (leadDays > 0) {
          order.leadDays = leadDays;
          order.readyBy = readyByDate(leadDays);
        }
        for (const l of totals.lines) l.product.stock -= l.qty;
        for (const promo of [totals.voucher, totals.codePromo].filter(Boolean)) {
          const stored = a.promotions.find((p) => p.id === promo.id);
          if (stored) stored.usedCount = (Number(stored.usedCount) || 0) + 1;
        }
        a.orders.unshift(order);
        const shop = shopById(g.shopId);
        const target = { targetType: "order", targetId: order.id, shopId: g.shopId, buyerId: action.user };
        shop.members.forEach((m) => notify(m, "มีคำสั่งซื้อใหม่", `${userName(action.user)} \xB7 ${pickupText(order)}`, "order", target));
        notify(action.user, "ส่งคำสั่งซื้อแล้ว", `${shop.name} \xB7 รอร้านค้ายืนยัน`, "order", target);
      }
      break;
    }
    case "DELIVER":
      return Up(state, { type: "ORDER_STATUS", id: action.id, status: "delivered", user: action.user, force: true });
    case "ORDER_STATUS": {
      const order = a.orders.find((o) => o.id === action.id);
      if (!order) return state;
      const shop = shopById(order.shopId);
      const side = shop?.members.includes(action.user) ? "shop" : order.buyer === action.user ? "buyer" : null;
      const allowed = action.force ? ACTIVE_ORDER_STATUSES.includes(order.status) : side && canChangeOrder(order, action.status, side);
      if (!allowed) return state;
      order.status = action.status;
      order.updatedAt = ct();
      (order.history ||= []).push({ status: action.status, by: action.user, date: ct() });
      const target = { targetType: "order", targetId: order.id, shopId: order.shopId, buyerId: order.buyer };
      const notifyShop = (title, text) => shop?.members.filter((m) => m !== action.user).forEach((m) => notify(m, title, text, "order", target));
      switch (action.status) {
        case "confirmed":
          notify(order.buyer, "ร้านรับออเดอร์แล้ว", `${shop?.name} \xB7 ${pickupText(order)}`, "order", target);
          break;
        case "preparing":
          notify(order.buyer, "ร้านกำลังเตรียมสินค้าให้คุณ", shop?.name, "order", target);
          break;
        case "ready":
          notify(order.buyer, `สินค้าพร้อมรับที่ ${order.pickup} (${timeLabel(order.time)} น.)`, shop?.name, "order", target);
          break;
        case "delivered":
          if (side === "buyer") notifyShop("ผู้ซื้อยืนยันรับของแล้ว", `${userName(order.buyer)} \xB7 ออเดอร์เสร็จสมบูรณ์`);
          else notify(order.buyer, "ส่งมอบสำเร็จ", `${shop?.name} \xB7 แวะเขียนรีวิวให้ร้านได้เลย`, "order", target);
          break;
        case "cancelled":
          // Return stock and the promo-code usage.
          for (const it of order.items) {
            const p = a.products.find((x) => x.id === it.productId);
            if (p) p.stock += it.qty;
          }
          for (const code of [order.promoCode].filter(Boolean)) {
            const promo = a.promotions.find((p) => p.shopId === order.shopId && p.type === "code" && p.code === code);
            if (promo) promo.usedCount = Math.max(0, (Number(promo.usedCount) || 0) - 1);
          }
          if (side === "buyer") notifyShop("ผู้ซื้อยกเลิกคำสั่งซื้อ", `${userName(order.buyer)} \xB7 คืนสต็อกแล้ว`);
          else notify(order.buyer, "ร้านยกเลิกคำสั่งซื้อ", shop?.name, "order", target);
          break;
      }
      break;
    }

    // ---------------------------------------------------------------- reviews & chat
    case "REVIEW": {
      const existing = a.reviews.find((r) => r.productId === action.item.productId && r.userId === action.item.userId);
      existing ? Object.assign(existing, action.item) : a.reviews.unshift(action.item);
      const product = a.products.find((p) => p.id === action.item.productId);
      shopById(product?.shopId)?.members.forEach((m) =>
        notify(m, "มีรีวิวใหม่ให้ร้านของเรา", `${action.item.rating} ดาว \xB7 ${action.item.text}`, "review", {
          targetType: "review",
          shopId: product.shopId,
        }),
      );
      break;
    }
    case "MESSAGE": {
      const m = { kind: "text", ...action.item };
      if (!m.threadKey) m.threadKey = m.shopId ? shopThreadKey(m.shopId, m.buyerId) : dmThreadKey(m.from, m.to);
      a.messages.push(m);
      const preview = m.imageUrl ? "ส่งรูปภาพ" : m.text;
      if (m.shopId) {
        const shop = shopById(m.shopId);
        const target = { targetType: "chat", shopId: m.shopId, buyerId: m.buyerId, threadKey: m.threadKey };
        if (m.from === m.buyerId) shop?.members.forEach((member) => notify(member, `ลูกค้าทักร้าน ${shop.name}`, `${userName(m.from)}: ${preview}`, "message", target));
        else notify(m.buyerId, `ข้อความจาก ${shop?.name}`, preview, "message", target);
      } else {
        notify(m.to, `ข้อความจาก ${userName(m.from)}`, preview, "message", { targetType: "chat", threadKey: m.threadKey, peerId: m.from });
      }
      break;
    }
    case "APPOINTMENT_SET": {
      const { threadKey, shopId, buyerId, location, time, user } = action;
      if (!String(location || "").trim() || !String(time || "").trim()) return state;
      const appt = a.chatAppointments.find((x) => x.threadKey === threadKey);
      const next = { threadKey, shopId, buyerId, location: location.trim(), time: time.trim(), proposedBy: user, confirmed: false, confirmedBy: null, updatedAt: ct() };
      appt ? Object.assign(appt, next) : a.chatAppointments.push({ id: St("appt"), ...next });
      a.messages.push({
        id: St("msg"),
        threadKey,
        shopId,
        buyerId,
        from: user,
        senderName: userName(user),
        kind: "system",
        text: `เสนอนัดรับ: ${location.trim()} \xB7 ${timeLabel(time.trim())} น.`,
        date: ct(),
      });
      const shop = shopById(shopId);
      const target = { targetType: "chat", shopId, buyerId, threadKey };
      if (user === buyerId) shop?.members.forEach((member) => notify(member, "ลูกค้าเสนอจุดนัดรับใหม่", `${location} \xB7 ${timeLabel(time)} น.`, "message", target));
      else notify(buyerId, `${shop?.name} เสนอจุดนัดรับใหม่`, `${location} \xB7 ${timeLabel(time)} น.`, "message", target);
      break;
    }
    case "APPOINTMENT_CONFIRM": {
      const appt = a.chatAppointments.find((x) => x.threadKey === action.threadKey);
      if (!appt || appt.confirmed) return state;
      // Only the other side may confirm (buyer <-> any shop member).
      const sideOf = (uid) => (uid === appt.buyerId ? "buyer" : shopById(appt.shopId)?.members.includes(uid) ? "shop" : null);
      const confirmer = sideOf(action.user);
      if (!confirmer || confirmer === sideOf(appt.proposedBy)) return state;
      appt.confirmed = true;
      appt.confirmedBy = action.user;
      appt.updatedAt = ct();
      const shop = shopById(appt.shopId);
      a.orders
        .filter((o) => o.shopId === appt.shopId && o.buyer === appt.buyerId && ACTIVE_ORDER_STATUSES.includes(o.status))
        .forEach((o) => {
          o.pickup = appt.location;
          o.time = appt.time;
          o.pickupType = shop && appt.location === shop.boothLocation ? "booth" : "meetup";
          o.updatedAt = ct();
        });
      a.messages.push({
        id: St("msg"),
        threadKey: appt.threadKey,
        shopId: appt.shopId,
        buyerId: appt.buyerId,
        from: action.user,
        senderName: userName(action.user),
        kind: "system",
        text: `ยืนยันนัดรับแล้ว: ${appt.location} \xB7 ${timeLabel(appt.time)} น.`,
        date: ct(),
      });
      notify(appt.proposedBy, "ยืนยันนัดรับแล้ว", `${appt.location} \xB7 ${timeLabel(appt.time)} น.`, "message", {
        targetType: "chat",
        shopId: appt.shopId,
        buyerId: appt.buyerId,
        threadKey: appt.threadKey,
      });
      break;
    }
    case "READ":
      a.notifications.filter((n) => n.to === action.user).forEach((n) => (n.read = true));
      break;
    case "READ_ONE": {
      const n = a.notifications.find((x) => x.id === action.id);
      if (!n || n.read) return state;
      n.read = true;
      break;
    }
    case "READ_THREAD":
      a.notifications
        .filter((n) => n.to === action.user && !n.read && n.type === "message" && n.threadKey === action.threadKey)
        .forEach((n) => (n.read = true));
      break;

    // ---------------------------------------------------------------- promotions
    case "PROMO_SAVE": {
      const existing = a.promotions.find((p) => p.id === action.item.id);
      const isNew = !existing;
      existing ? Object.assign(existing, action.item) : a.promotions.unshift({ usedCount: 0, active: true, createdAt: ct(), createdBy: action.user, ...action.item });
      if (isNew && action.broadcast) {
        const shop = shopById(action.item.shopId);
        a.users
          .filter((u) => u.role === "student" && !shop?.members.includes(u.id))
          .forEach((u) => notify(u.id, `${shop?.name}: ${action.item.title}`, action.summary || "มีโปรโมชันใหม่จากร้านในโรงเรียน", "promo", { targetType: "shop", shopId: action.item.shopId }));
      }
      break;
    }
    case "PROMO_TOGGLE": {
      const promo = a.promotions.find((p) => p.id === action.id);
      if (!promo) return state;
      promo.active = promo.active === false;
      break;
    }
    case "PROMO_DELETE": {
      const promo = a.promotions.find((p) => p.id === action.id);
      if (!promo) return state;
      promo.deleted = true;
      promo.active = false;
      break;
    }

    // ---------------------------------------------------------------- admin & users
    case "CLASS": {
      const c = a.classes.find((x) => x.id === action.item.id);
      c ? Object.assign(c, action.item) : a.classes.push(action.item);
      break;
    }
    case "JOIN": {
      const code = action.code.trim().split("join=").pop().split("&")[0].toUpperCase();
      const cls = a.classes.find((c) => c.code === code);
      const user = a.users.find((u) => u.id === action.user);
      if (!cls || !user) return state;
      user.classId = cls.id;
      a.shops.filter((s) => s.members.includes(user.id) && s.members.length === 1).forEach((s) => (s.classId = cls.id));
      notify(user.id, "เข้าร่วมห้องเรียนแล้ว", cls.name, "system", { targetType: "lessons" });
      break;
    }
    case "USER": {
      const u = a.users.find((x) => x.id === action.item.id);
      u ? Object.assign(u, action.item) : (a.users.push(action.item), (a.progress[action.item.id] = []));
      break;
    }
    case "DELETE_USER": {
      if (action.id === "admin1" || a.classes.some((c) => c.teacherId === action.id)) return state;
      a.users = a.users.filter((u) => u.id !== action.id);
      a.shops.forEach((s) => {
        s.members = s.members.filter((m) => m !== action.id);
        if (s.ownerId === action.id) s.ownerId = s.members[0] || null;
      });
      delete a.progress[action.id];
      break;
    }
    case "DELETE_CLASS":
      a.classes = a.classes.filter((c) => c.id !== action.id);
      a.users.forEach((u) => u.classId === action.id && (u.classId = null));
      a.shops.forEach((s) => s.classId === action.id && (s.classId = null));
      break;
    case "MOCK": {
      const p = a.products.find((x) => x.id === action.productId);
      if (!p || p.stock < 1) return state;
      p.stock--;
      a.orders.unshift({
        id: St("demo"),
        buyer: "student2",
        shopId: p.shopId,
        items: [{ productId: p.id, name: p.name, price: p.price, cost: p.cost ?? null, qty: 1 }],
        status: "delivered",
        pickupType: "meetup",
        pickup: vl[0],
        time: "12:00",
        subtotal: p.price,
        discountAmount: 0,
        total: p.price,
        date: ct(),
        demo: true,
      });
      a.reviews.unshift({ id: St("r"), productId: p.id, userId: "student2", rating: 5, text: "[ข้อมูลทดลอง] สินค้าดี นัดรับสะดวก", date: ct() });
      break;
    }
    default:
      return state;
  }
  return a;
}
