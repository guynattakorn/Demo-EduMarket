// components/ui.jsx
// แหล่งโค้ดจริงของ app.js — แก้ไขไฟล์ใน src/ แล้วรัน `npm run build`
import { useEffect, useRef } from "react";

/** path ของไอคอน SVG */
export const Bp = {
  market: "M3 7h18l-2 7H6L3 3H1 M7 20h.01M17 20h.01",
  learn: "M4 4h7l1 2 1-2h7v15h-7l-1 2-1-2H4z M12 6v15",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4",
  shop: "M3 10v11h18V10M2 10l2-7h16l2 7M2 10c2 3 4 3 5 0 1 3 4 3 5 0 1 3 4 3 5 0 1 3 4 3 5 0M9 21v-7h6v7",
  chart: "M4 3v18h18M8 17v-5M13 17V8M18 17V4",
  search: "m21 21-6-6M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0",
  arrow: "M5 12h14m-5-5 5 5-5 5",
  heart: "M20 4c-3-3-6-1-8 1-2-2-5-4-8-1-6 6 8 16 8 16S26 10 20 4",
  plus: "M12 5v14M5 12h14",
  logout: "M9 4H3v16h6M9 12h13m-5-5 5 5-5 5",
  close: "m6 6 12 12M6 18 18 6",
  check: "m5 12 4 4L20 5",
  users:
    "M16 21v-2c0-4-12-4-12 0v2M10 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8M17 4c5 0 5 8 0 8M19 15c4 0 4 4 4 6",
  chat: "M21 3H3v14h4v4l5-4h9z",
  back: "M19 12H5m7-7-7 7 7 7",
  star: "m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z",
  bag: "M4 7h16l1 14H3zM8 8V6a4 4 0 0 1 8 0v2",
  cart: "M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2M10 21h.01M17 21h.01",
  book: "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5M8 7h7",
  store: "M3 9l1.5-5h15L21 9M3 9v11h18V9M3 9c0 2 1.5 3 3 3s3-1 3-3c0 2 1.5 3 3 3s3-1 3-3c0 2 1.5 3 3 3s3-1 3-3M9 20v-5h6v5",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
  image: "M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M15.5 9.5h.01",
  send: "M22 2 11 13M22 2l-7 20-4-9-9-4z",
  pin: "M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12zM12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  tag: "M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8zM7.5 7.5h.01",
  ticket: "M3 9V6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v3a3 3 0 0 0 0 6v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3a3 3 0 0 0 0-6zM14 5v14",
  trash: "M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 11v6M14 11v6",
  edit: "M4 20h4L19 9l-4-4L4 16zM14 6l4 4",
  minus: "M5 12h14",
  file: "M14 3H6v18h12V7zM14 3v4h4M9 13h6M9 17h6",
  external: "M14 4h6v6M20 4l-9 9M19 14v6H4V5h6",
  megaphone: "M3 10v4h4l6 4V6L7 10zM16 9a3 3 0 0 1 0 6M19 6a7 7 0 0 1 0 12",
  copy: "M9 9h11v11H9zM5 15H4V4h11v1",
  camera: "M3 8h4l2-3h6l2 3h4v12H3zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  coin: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM15 9h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9M12 6v2M12 17v2",
  trend: "M3 17l6-6 4 4 8-8M15 7h6v6",
  alert: "M12 3 2 21h20zM12 10v5M12 18h.01",
  school: "M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5M22 9v6",
  link: "M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1",
  share: "M4 12v8h16v-8M12 3v13M7 8l5-5 5 5",
  chevronDown: "m6 9 6 6 6-6",
  chevronRight: "m9 6 6 6-6 6",
  user: "M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10",
  refresh: "M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  box: "M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8",
  sparkle: "M12 3v18M3 12h18",
};

/** ไอคอน SVG — เดิมชื่อ _t */
export function Icon({ name: t, size: e = 20 }) {
  return (
    <svg
      width={e}
      height={e}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={Bp[t] || Bp.star} />
    </svg>
  );
}

/** ปุ่มมาตรฐาน — เดิมชื่อ A */
export function Button({ children: t, variant: e = "", icon: a, ...l }) {
  return (
    <button className={"btn " + e} {...l}>
      {a && <Icon name={a} />} {t}
    </button>
  );
}

/** ป้ายกำกับเล็ก — เดิมชื่อ dt */
export function Chip({ children: t, color: e = "" }) {
  return <span className={"chip " + e}>{t}</span>;
}

/** กล่องแสดงสถานะว่าง — เดิมชื่อ Xt */
export function EmptyState({ children: t }) {
  return (
    <div className="empty">
      <p>{t}</p>
    </div>
  );
}

/** หัวข้อ section — เดิมชื่อ pe */
export function SectionTitle({ eyebrow: t, title: e, children: a }) {
  return (
    <div className="section-title">
      <div>
        {t && <div className="eyebrow">{t}</div>}
        <h2>{e}</h2>
      </div>
      {a}
    </div>
  );
}

/** การ์ดตัวเลขสรุป — เดิมชื่อ P */
export function Stat({ label: t, value: e, icon: a, color: l = "" }) {
  return (
    <div className={"stat " + l}>
      <span className="stat-icon">{a}</span>
      <span>{t}</span>
      <strong>{e}</strong>
    </div>
  );
}

/** label + ช่องกรอก — เดิมชื่อ U */
export function Field({ label: t, children: e }) {
  return (
    <label className="field">
      <span>{t}</span>
      {e}
    </label>
  );
}

/** หน้าต่าง <dialog> — เดิมชื่อ Xh */
export function Modal({ title: t, children: e, onClose: a, wide: l = false }) {
  let n = useRef();
  return (
    useEffect(() => {
      let i = document.activeElement,
        c = n.current;
      return (
        c?.showModal?.(),
        c?.querySelector("input,button,select,textarea")?.focus(),
        () => {
          i?.focus?.();
        }
      );
    }, []),
    (
      <dialog
        ref={n}
        open={typeof HTMLDialogElement > "u"}
        className={"modal " + (l ? "wide" : "")}
        onCancel={(i) => {
          (i.preventDefault(), a());
        }}
        onClick={(i) => {
          i.target === i.currentTarget && a();
        }}
      >
        <div className="modal-head">
          <h2>{t}</h2>
          <button className="icon-btn" aria-label="ปิดหน้าต่าง" onClick={a}>
            <Icon name="close" />
          </button>
        </div>
        <div className="modal-body">{e}</div>
      </dialog>
    )
  );
}

/**
 * Slide-over drawer (desktop/iPad) / bottom sheet (iPhone).
 * Used by the cart. Closes on overlay tap, close button and Escape.
 */
export function Sheet({ title, onClose, children, footer, className = "" }) {
  useEffect(() => {
    const onKey = (ev) => ev.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <div className="sheet-layer" role="presentation" onClick={(ev) => ev.target === ev.currentTarget && onClose()}>
      <section className={"sheet " + className} role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-grabber" aria-hidden="true" />
        <header className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn" aria-label="ปิด" onClick={onClose}>
            <Icon name="close" />
          </button>
        </header>
        <div className="sheet-body">{children}</div>
        {footer && <footer className="sheet-foot">{footer}</footer>}
      </section>
    </div>
  );
}

/** Status pill with semantic color: green / yellow / red / gray / blue / violet / lime */
export function StatusChip({ color = "gray", children }) {
  return <span className={"status-chip " + color}>{children}</span>;
}

/** Simple page header: title on the left, actions on the right (zero-fluff). */
export function PageHead({ title, children }) {
  return (
    <div className="page-head">
      <h1>{title}</h1>
      {children && <div className="actions">{children}</div>}
    </div>
  );
}
