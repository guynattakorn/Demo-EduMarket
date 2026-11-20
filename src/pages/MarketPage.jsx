// pages/MarketPage.jsx
// แหล่งโค้ดจริงของ app.js — แก้ไขไฟล์ใน src/ แล้วรัน `npm run build`
import { useEffect, useRef, useState } from "react";
import { ProductCard } from "../components/ProductCard.jsx";
import { EmptyState, Icon } from "../components/ui.jsx";
import { CATEGORIES } from "../config/constants.js";
import { Q } from "../state/context.js";

const ALL = "ทั้งหมด";

/** หน้า "ตลาดนัด" — Compact sticky header + category pills + product grid (เดิมชื่อ Lh) */
export function MarketPage() {
  const { data, user, role, cart, setCartOpen } = Q();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL);
  const [myClassOnly, setMyClassOnly] = useState(false);
  const isTeacher = role === "teacher";
  const myClassIds = data.classes.filter((c) => c.teacherId === user.id).map((c) => c.id);
  const q = query.trim().toLowerCase();
  const shopOf = (p) => data.shops.find((s) => s.id === p.shopId);

  const products = data.products.filter((p) => {
    if (p.active === false) return false;
    if (category !== ALL && p.category !== category) return false;
    const shop = shopOf(p);
    if (q && !`${p.name} ${shop?.name || ""}`.toLowerCase().includes(q)) return false;
    if (myClassOnly && !myClassIds.includes(shop?.classId)) return false;
    return true;
  });
  const cartCount = cart.reduce((sum, it) => sum + it.qty, 0);

  // Phone: hide the search/category bar while scrolling down, bring it back on scroll up.
  const [collapsed, setCollapsed] = useState(false);
  const headerRef = useRef(null);
  useEffect(() => {
    let lastY = window.scrollY;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        const dy = y - lastY;
        if (headerRef.current?.contains(document.activeElement)) setCollapsed(false);
        else if (y < 80) setCollapsed(false);
        else if (dy > 6) setCollapsed(true);
        else if (dy < -6) setCollapsed(false);
        if (Math.abs(dy) > 6 || y < 80) lastY = y;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="market page-enter">
      <div className={"market-header" + (collapsed ? " is-collapsed" : "")} ref={headerRef}>
        <div className="market-search-row">
          <label className="market-search">
            <Icon name="search" size={18} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหา"
              aria-label="ค้นหาสินค้าหรือร้านค้า"
              enterKeyHint="search"
            />
          </label>
          {!isTeacher && (
            <button className="market-cart-btn" onClick={() => setCartOpen(true)} aria-label={`ตะกร้าสินค้า ${cartCount} ชิ้น`}>
              <Icon name="cart" size={22} />
              {cartCount > 0 && <b className="badge-count">{cartCount}</b>}
            </button>
          )}
        </div>
        <div className="pill-row" role="tablist" aria-label="หมวดหมู่สินค้า">
          {[ALL, ...CATEGORIES].map((c) => (
            <button role="tab" aria-selected={category === c} className={category === c ? "selected" : ""} onClick={() => setCategory(c)} key={c}>
              {c}
            </button>
          ))}
          {isTeacher && (
            <button className={myClassOnly ? "selected" : ""} aria-pressed={myClassOnly} onClick={() => setMyClassOnly(!myClassOnly)}>
              ห้องเรียนของฉัน
            </button>
          )}
        </div>
      </div>

      {products.length ? (
        <div className="pgrid">
          {products.map((p) => (
            <ProductCard p={p} observer={isTeacher} key={p.id} />
          ))}
        </div>
      ) : (
        <EmptyState>ไม่พบสินค้า</EmptyState>
      )}
    </div>
  );
}
