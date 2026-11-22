// pages/LessonViewer.jsx
// แหล่งโค้ดจริงของ app.js — แก้ไขไฟล์ใน src/ แล้วรัน `npm run build`
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Chip, Icon } from "../components/ui.jsx";
import { Ea } from "../config/constants.js";
import { Q } from "../state/context.js";

/**
 * Styles injected into the lesson page (lesson-*.html is not edited) so it reads as part of
 * the app: no own header/logo, no outer card, transparent background, app font, frosted cards.
 */
const EMBED_CSS = `
html, body { background: transparent !important; overflow: hidden !important; margin: 0 !important; }
body { font-family: "Noto Sans Thai", system-ui, -apple-system, sans-serif !important; }
.topbar, .banner { display: none !important; }
.shell {
  margin: 0 !important; width: 100% !important; max-width: none !important; min-height: 0 !important;
  padding: 0 !important; background: transparent !important; box-shadow: none !important; border-radius: 0 !important;
}
.side { position: static !important; }
.lesson { padding: 0 !important; max-width: none !important; }
.card {
  background: rgba(255, 255, 255, 0.86) !important;
  border: 1px solid rgba(255, 255, 255, 0.9) !important;
  box-shadow: 0 4px 18px rgba(46, 70, 20, 0.07) !important;
  border-radius: 12px !important;
}
.tabs { margin-top: 0 !important; }
.tabs [role="tab"] { border-radius: 12px !important; }
.tabs [role="tab"][aria-selected="true"] { background: #c6fa31 !important; color: #09090b !important; }
.tabs [role="tab"][aria-selected="true"] b { background: #fff !important; color: #09090b !important; }
.foot { padding-bottom: 8px !important; }
`;

const SINGLE_LESSON_CSS = `
.tabs, [data-goto] { display: none !important; }
`;

/** บทเรียนหลักเป็นส่วนหนึ่งของหน้าแอป (เลื่อนหน้าเดียว ไม่มีกรอบเลื่อนซ้อน) และรับ XP — เดิมชื่อ Fh */
export function LessonViewer({ moduleId }) {
  const { data, user, dispatch, setLesson, toast } = Q();
  const lesson = Ea.find((m) => m.id === moduleId);
  const done = (data.progress[user.id] || []).includes(moduleId);
  const frameRef = useRef(null);
  const observerRef = useRef(null);
  const [height, setHeight] = useState(900);
  const [ready, setReady] = useState(false);

  const complete = () => {
    dispatch({ type: "COMPLETE", user: user.id, module: moduleId });
    toast(done ? "บันทึกการทบทวนแล้ว" : "เรียนจบแล้ว +100 XP");
    setLesson(null);
  };

  // Fit the frame to its content and keep it fitted (lesson tabs, helpers and results change height).
  const embed = useCallback(() => {
    const frame = frameRef.current;
    const doc = frame?.contentDocument;
    if (!doc?.body) return;
    if (!doc.getElementById("edumarket-embed")) {
      const style = doc.createElement("style");
      style.id = "edumarket-embed";
      // A file holding several lessons shows only the one this app lesson points to.
      style.textContent = EMBED_CSS + (lesson?.single ? SINGLE_LESSON_CSS : "");
      doc.head.appendChild(style);
    }
    // The lesson's "go to section" buttons scroll their own window — scroll the app page instead.
    const win = frame.contentWindow;
    win.scrollTo = (a, b) => {
      const top = typeof a === "object" ? a?.top || 0 : Number(b) || 0;
      const y = frame.getBoundingClientRect().top + window.scrollY + top - 72;
      window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    };
    const fit = () => setHeight(Math.ceil(doc.body.getBoundingClientRect().height) + 8);
    fit();
    observerRef.current?.disconnect();
    observerRef.current = new ResizeObserver(fit);
    observerRef.current.observe(doc.body);
    // Backup for browsers that pause ResizeObserver: re-fit after taps and edits inside the lesson.
    const refit = () => setTimeout(fit, 60);
    doc.addEventListener("click", refit);
    doc.addEventListener("input", refit);
    win.addEventListener("hashchange", refit);
    setReady(true);
  }, [lesson?.single]);

  useEffect(() => () => observerRef.current?.disconnect(), []);
  useEffect(() => {
    setReady(false);
    window.scrollTo({ top: 0 });
  }, [moduleId]);

  if (!lesson) return null;

  return (
    <div className="lesson-page page-enter">
      <header className="lesson-head">
        <button className="icon-btn" onClick={() => setLesson(null)} aria-label="กลับไปบทเรียนทั้งหมด">
          <Icon name="back" />
        </button>
        <span className="lesson-icon" aria-hidden="true">
          <Icon name={lesson.icon} size={20} />
        </span>
        <div className="lesson-head-text">
          <h1>{lesson.title}</h1>
          <small>{lesson.subtitle}</small>
        </div>
        <Chip color={done ? "lime" : "white"}>{done ? "ผ่านแล้ว" : "+100 XP"}</Chip>
      </header>

      <div className={"lesson-frame" + (ready ? " is-ready" : "")}>
        {!ready && <div className="lesson-loading">กำลังโหลดบทเรียน…</div>}
        <iframe
          ref={frameRef}
          title={lesson.title}
          src={lesson.src}
          scrolling="no"
          onLoad={embed}
          style={{ height }}
        />
      </div>

      <div className="lesson-end">
        <Button variant="black full" onClick={complete}>
          {done ? "บันทึกการทบทวน" : "เรียนจบแล้ว"} <Icon name="arrow" />
        </Button>
      </div>
    </div>
  );
}
