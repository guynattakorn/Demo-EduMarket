// App.jsx
// แหล่งโค้ดจริงของ app.js — แก้ไขไฟล์ใน src/ แล้วรัน `npm run build`
import { useCallback, useEffect, useReducer, useState } from "react";
import { Avatar } from "./components/Avatar.jsx";
import { Icon } from "./components/ui.jsx";
import { isStandalone, useBackButton, useOnline, usePullToRefresh, useServerRefresh } from "./lib/mobile.js";
import { Gu, dmThreadKey, shopThreadKey } from "./config/constants.js";
import { Mn } from "./data/seed.js";
import { CartDrawer } from "./modals/CartDrawer.jsx";
import { ModalRouter } from "./modals/ModalRouter.jsx";
import { AdminPage } from "./pages/AdminPage.jsx";
import { ClassroomPage } from "./pages/ClassroomPage.jsx";
import { LearnPage } from "./pages/LearnPage.jsx";
import { LessonViewer } from "./pages/LessonViewer.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { MarketPage } from "./pages/MarketPage.jsx";
import { MyShopPage } from "./pages/MyShopPage.jsx";
import { NotificationsPage } from "./pages/NotificationsPage.jsx";
import { TeacherShopsPage } from "./pages/TeacherShopsPage.jsx";
import { Yp } from "./state/context.js";
import { Qh, upgradeState } from "./state/migrate.js";
import { Up } from "./state/reducer.js";

const AUTH_KEY = "edumarket_auth_user";
const ACTIVE_SHOP_KEY = "edumarket_active_shop";

const NAV = {
  student: [
    ["market", "ตลาดนัด", "cart"],
    ["lessons", "บทเรียน", "book"],
    ["messages", "ข้อความ", "chat"],
    ["shop", "ร้านของฉัน", "store"],
  ],
  teacher: [
    ["market", "ตลาดนัด", "cart"],
    ["classroom", "ห้องเรียน", "book"],
    ["messages", "ข้อความ", "chat"],
    ["analytics", "ร้านนักเรียน", "store"],
  ],
};

const TAB_KEY = "edumarket_tab"; // sessionStorage: reopen the same tab after a refresh

/** Server copy -> app state (same migration as the local copy); null when unusable. */
const migrateServerState = (raw) => (raw && raw.schema === 2 ? upgradeState(Qh(raw)) : null);

const savedTabFor = (role) => {
  try {
    const t = sessionStorage.getItem(TAB_KEY);
    return (NAV[role] || []).some(([key]) => key === t) ? t : null;
  } catch {
    return null;
  }
};

/** ?product=<id> deep link (from the share button) */
const takeProductLink = () => {
  try {
    const params = new URLSearchParams(location.search);
    const id = params.get("product");
    if (!id) return null;
    params.delete("product");
    const rest = params.toString();
    history.replaceState(history.state, "", location.pathname + (rest ? "?" + rest : "") + location.hash);
    return id;
  } catch {
    return null;
  }
};

function loadInitialState() {
  try {
    const saved = JSON.parse(localStorage.getItem(Gu));
    return upgradeState(saved?.schema === 2 ? Qh(saved) : Mn());
  } catch {
    return upgradeState(Mn());
  }
}

const readJson = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
};

/** โครงหลักของแอป: state, auth (login/logout/auto-login), แท็บนำทาง — เดิมชื่อ Zh */
export function App() {
  const [data, dispatch] = useReducer(Up, null, loadInitialState);
  const [account, setAccount] = useState(null); // the signed-in account
  const [adminView, setAdminView] = useState("admin"); // admin: "admin" | "student" | "teacher"
  const [tab, setTab] = useState("market");
  const [modal, setModalRaw] = useState(null);
  const [toastText, toast] = useState("");
  const [cart, setCart] = useState([]);
  const [lesson, setLesson] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [inboxMode, setInboxMode] = useState("notify"); // "chat" | "notify"
  const [chat, setChat] = useState(null); // { threadKey, shopId, buyerId, peerId, contextProductId, contextOrderId }
  const [shopTab, setShopTab] = useState("orders");
  const [activeShopId, setActiveShopIdRaw] = useState(null);

  // Persist the whole state (sync-bridge.js mirrors this key to the server).
  useEffect(() => {
    try {
      localStorage.setItem(Gu, JSON.stringify(data));
    } catch {
      toast("พื้นที่จัดเก็บเต็ม ข้อมูลล่าสุดยังไม่ถูกบันทึก ลองใช้ไฟล์แนบขนาดเล็กลง");
    }
  }, [data]);

  // Auto-login from the saved session.
  useEffect(() => {
    try {
      const saved = readJson(AUTH_KEY);
      if (saved && saved.id) {
        const found = data.users.find((u) => u.id === saved.id) || saved;
        setAccount(found);
        setAdminView(found.role === "admin" ? "admin" : found.role);
        setTab(savedTabFor(found.role) || (found.role === "teacher" ? "classroom" : "market"));
        const productId = takeProductLink();
        if (productId && data.products.some((p) => p.id === productId)) setModalRaw({ type: "product", id: productId });
      }
    } catch (err) {}
  }, []);

  // Remember the open tab for this browser session.
  useEffect(() => {
    try {
      sessionStorage.setItem(TAB_KEY, tab);
    } catch {}
  }, [tab]);

  // Pull other devices' changes (orders, chats…) from the server.
  const { refresh, refreshing } = useServerRefresh(data, dispatch, migrateServerState);
  const pull = usePullToRefresh(refresh, Boolean(account) && isStandalone());
  const online = useOnline();

  useEffect(() => {
    if (!toastText) return;
    const timer = setTimeout(() => toast(""), 4200);
    return () => clearTimeout(timer);
  }, [toastText]);

  const role = account?.role === "admin" ? adminView : account?.role;
  // Admins "view as" the demo student/teacher account.
  const user =
    (account?.role === "admin" && adminView !== "admin"
      ? data.users.find((u) => u.id === (adminView === "student" ? "student1" : "teacher1")) ||
        data.users.find((u) => u.role === adminView)
      : data.users.find((u) => u.id === account?.id)) || account;

  // Remember the last shop the user managed.
  useEffect(() => {
    if (!user?.id) return;
    const saved = readJson(ACTIVE_SHOP_KEY) || {};
    setActiveShopIdRaw(saved[user.id] || null);
  }, [user?.id]);
  const setActiveShopId = useCallback(
    (shopId) => {
      setActiveShopIdRaw(shopId);
      try {
        const saved = readJson(ACTIVE_SHOP_KEY) || {};
        saved[user?.id] = shopId;
        localStorage.setItem(ACTIVE_SHOP_KEY, JSON.stringify(saved));
      } catch {}
    },
    [user?.id],
  );

  const navigate = useCallback((nextTab) => {
    setTab(nextTab);
    setLesson(null);
    setCartOpen(false);
    window.scrollTo?.({ top: 0 });
  }, []);

  /** Open a chat room: shop thread (shopId + buyerId) or a direct chat (peerId). */
  const openChat = useCallback(
    ({ shopId = null, buyerId = null, peerId = null, contextProductId = null, contextOrderId = null }) => {
      let next;
      if (shopId) {
        const buyer = buyerId || user.id;
        next = { threadKey: shopThreadKey(shopId, buyer), shopId, buyerId: buyer, peerId: null };
      } else if (peerId) {
        // A legacy "chat with person" request: use the shop thread when one side owns a shop.
        const peerShop = data.shops.find((s) => s.members.includes(peerId) && !s.members.includes(user.id));
        const myShop = data.shops.find((s) => s.members.includes(user.id) && !s.members.includes(peerId));
        const peerRole = data.users.find((u) => u.id === peerId)?.role;
        if (peerRole !== "teacher" && role !== "teacher" && peerShop)
          next = { threadKey: shopThreadKey(peerShop.id, user.id), shopId: peerShop.id, buyerId: user.id };
        else if (peerRole !== "teacher" && role !== "teacher" && myShop)
          next = { threadKey: shopThreadKey(myShop.id, peerId), shopId: myShop.id, buyerId: peerId };
        else next = { threadKey: dmThreadKey(user.id, peerId), shopId: null, buyerId: null, peerId };
      } else return;
      setChat({ ...next, contextProductId, contextOrderId });
      setModalRaw(null);
      setCartOpen(false);
      setLesson(null);
      setInboxMode("chat");
      setTab("messages");
    },
    [data.shops, data.users, user?.id, role],
  );

  // Backward compatible modal opener: {type:"chat", to} now opens the chat page.
  const setModal = useCallback(
    (next) => {
      if (next?.type === "chat") return openChat({ peerId: next.to, contextOrderId: next.orderId, contextProductId: next.productId });
      if (next?.type === "cart") {
        setModalRaw(null);
        return setCartOpen(true);
      }
      setModalRaw(next);
    },
    [openChat],
  );

  const login = (requestedRole, accountObj) => {
    const next =
      accountObj ||
      (requestedRole === "teacher"
        ? data.users.find((u) => u.id === "teacher1")
        : requestedRole === "admin"
          ? data.users.find((u) => u.id === "admin1")
          : data.users.find((u) => u.id === "student1")) ||
      data.users.find((u) => u.role === requestedRole) ||
      Mn().users[0];
    if (!data.users.some((u) => u.id === next.id)) dispatch({ type: "USER", item: next });
    setAccount(next);
    setAdminView(next.role === "admin" ? "admin" : next.role);
    setTab(next.role === "teacher" ? "classroom" : "market");
    setCart([]);
    const productId = takeProductLink();
    if (productId && data.products.some((p) => p.id === productId)) setModalRaw({ type: "product", id: productId });
    try {
      localStorage.setItem(AUTH_KEY, JSON.stringify(next));
    } catch (err) {}
    if (requestedRole === "student" && new URLSearchParams(location.search).has("join")) setModal({ type: "join" });
  };

  const logout = () => {
    try {
      localStorage.removeItem(AUTH_KEY);
    } catch (err) {}
    setAccount(null);
    setModalRaw(null);
    setLesson(null);
    setCart([]);
    setCartOpen(false);
    setChat(null);
    setTab("market");
  };

  // Phone back button / swipe-back closes the top layer first, then returns to the home tab.
  const homeTab = role === "teacher" ? "classroom" : "market";
  const chatRoomOpen = tab === "messages" && inboxMode === "chat" && Boolean(chat);
  const hasLayer = Boolean(account) && (Boolean(modal) || cartOpen || Boolean(lesson) || chatRoomOpen || (role !== "admin" && tab !== homeTab));
  useBackButton(hasLayer, () => {
    if (modal) setModalRaw(null);
    else if (cartOpen) setCartOpen(false);
    else if (lesson) setLesson(null);
    else if (chatRoomOpen) setChat(null);
    else if (role !== "admin" && tab !== homeTab) navigate(homeTab);
  });

  const unread = data.notifications.filter((n) => n.to === user?.id && !n.read).length;
  const navItems = role === "admin" ? [] : NAV[role] || NAV.student;

  const ctx = {
    data,
    dispatch,
    user,
    role,
    account,
    tab,
    setTab: navigate,
    modal,
    setModal,
    toast,
    cart,
    setCart,
    lesson,
    setLesson,
    cartOpen,
    setCartOpen,
    inboxMode,
    setInboxMode,
    chat,
    setChat,
    openChat,
    shopTab,
    setShopTab,
    activeShopId,
    setActiveShopId,
  };

  const page =
    role === "admin" ? (
      <AdminPage />
    ) : tab === "market" ? (
      <MarketPage />
    ) : tab === "lessons" ? (
      lesson ? <LessonViewer moduleId={lesson} /> : <LearnPage />
    ) : tab === "classroom" ? (
      <ClassroomPage />
    ) : tab === "shop" ? (
      <MyShopPage />
    ) : tab === "analytics" ? (
      <TeacherShopsPage />
    ) : (
      <NotificationsPage />
    );

  const brand = (
    <a
      href="#"
      className="brand"
      onClick={(ev) => {
        ev.preventDefault();
        if (role !== "admin") navigate(role === "teacher" ? "classroom" : "market");
      }}
    >
      <span className="brand-mark">
        e<span>m</span>
      </span>
      <span className="brand-name">
        edu<span className="brand-thin">market</span>
      </span>
    </a>
  );

  return (
    <Yp.Provider value={ctx}>
      {account ? (
        <div className={"shell" + (navItems.length ? " has-nav" : " no-nav")}>
          <aside className="side-nav" aria-label="เมนูหลัก">
            {brand}
            <nav className="side-nav-items">
              {navItems.map(([key, label, icon]) => (
                <button
                  className={"nav-item" + (tab === key ? " active" : "")}
                  aria-current={tab === key ? "page" : undefined}
                  onClick={() => navigate(key)}
                  key={key}
                >
                  <span className="nav-icon">
                    <Icon name={icon} />
                    {key === "messages" && unread > 0 && <b className="badge-count">{unread}</b>}
                  </span>
                  <span className="nav-label">{label}</span>
                </button>
              ))}
            </nav>
            <div className="side-nav-user">
              <Avatar name={user?.name} />
              <div className="side-nav-user-name">
                <strong className="truncate">{user?.name}</strong>
                <small>{role === "teacher" ? "ครู" : role === "admin" ? "แอดมิน" : "นักเรียน"}</small>
              </div>
              <button className="icon-btn" onClick={logout} aria-label="ออกจากระบบ" title="ออกจากระบบ">
                <Icon name="logout" />
              </button>
            </div>
          </aside>

          <div className="shell-main">
            <header className="mobile-topbar">
              {brand}
              <div className="mobile-topbar-user">
                <Avatar name={user?.name} size="small" />
                <button className="icon-btn" onClick={logout} aria-label="ออกจากระบบ" title="ออกจากระบบ">
                  <Icon name="logout" />
                </button>
              </div>
            </header>

            {account.role === "admin" && (
              <div className="admin-viewbar">
                <div className="segmented-control" role="tablist" aria-label="สลับมุมมอง">
                  {[
                    ["admin", "จัดการระบบ"],
                    ["student", "มุมมองนักเรียน"],
                    ["teacher", "มุมมองครู"],
                  ].map(([key, label]) => (
                    <button
                      role="tab"
                      aria-selected={adminView === key}
                      className={adminView === key ? "selected" : ""}
                      onClick={() => {
                        setAdminView(key);
                        navigate(key === "teacher" ? "classroom" : "market");
                        setModalRaw(null);
                        setCart([]);
                        setChat(null);
                      }}
                      key={key}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {adminView !== "admin" && <small className="muted">บัญชีทดสอบ: {user?.name}</small>}
              </div>
            )}

            {!online && (
              <div className="offline-banner" role="status">
                ออฟไลน์ · จะบันทึกขึ้นเซิร์ฟเวอร์เมื่อกลับมาออนไลน์
              </div>
            )}
            {(pull > 0 || refreshing) && (
              <div className="ptr" style={{ height: refreshing ? 48 : pull }} aria-hidden="true">
                <span className={"ptr-spinner" + (refreshing ? " spinning" : pull >= 60 ? " ready" : "")} />
              </div>
            )}
            <main className="content">{page}</main>
          </div>

          {navItems.length > 0 && (
            <nav className="bottom-nav" aria-label="เมนูหลัก">
              {navItems.map(([key, label, icon]) => (
                <button
                  className={"bottom-nav-item" + (tab === key ? " active" : "")}
                  aria-current={tab === key ? "page" : undefined}
                  onClick={() => navigate(key)}
                  key={key}
                >
                  <span className="nav-icon">
                    <Icon name={icon} size={22} />
                    {key === "messages" && unread > 0 && <b className="badge-count">{unread}</b>}
                  </span>
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          )}
        </div>
      ) : (
        <LoginPage onLogin={login} />
      )}
      {toastText && (
        <div className="toast" role="status">
          <Icon name="check" />
          {toastText}
        </div>
      )}
      {modal && account && <ModalRouter modal={modal} />}
      {cartOpen && account && <CartDrawer />}
    </Yp.Provider>
  );
}
