// pages/AdminPage.jsx
// แหล่งโค้ดจริงของ app.js — แก้ไขไฟล์ใน src/ แล้วรัน `npm run build`
import { useEffect, useState } from "react";
import { Avatar } from "../components/Avatar.jsx";
import { Button, EmptyState, Icon } from "../components/ui.jsx";
import { Ea, completedLessons } from "../config/constants.js";
import { Q } from "../state/context.js";
import { timeAgo } from "../utils/format.js";

const TABS = [
  ["classes", "ห้องเรียน"],
  ["teachers", "คุณครู"],
  ["students", "นักเรียน"],
  ["demo", "เครื่องมือสาธิต"],
];

/** สถานะฐานข้อมูลจาก sync-bridge.js (แทนป้ายลอยเดิม) */
function DbStatusPill() {
  const { toast } = Q();
  const [status, setStatus] = useState(() => window.__EDUMARKET_DB_STATUS__ || { status: "checking" });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const onStatus = (e) => setStatus({ ...e.detail });
    window.addEventListener("edumarket:db-status", onStatus);
    return () => window.removeEventListener("edumarket:db-status", onStatus);
  }, []);
  const cloud = status.database === "supabase_cloud";
  const offline = status.status === "offline";
  const label = status.status === "checking" ? "กำลังตรวจสอบ…" : offline ? "DB: ออฟไลน์" : cloud ? "DB: Supabase Cloud" : "DB: Local Storage";
  const sync = async () => {
    if (!window.EduMarketSync) return toast("ระบบ Sync ยังไม่พร้อม");
    setBusy(true);
    try {
      await window.EduMarketSync.pullFromServer(); // reloads the page with the server state
    } catch (err) {
      toast("Sync ล้มเหลว: " + err.message);
      setBusy(false);
    }
  };
  return (
    <div className={"db-pill" + (cloud ? " cloud" : offline ? " offline" : "")} role="status">
      <span className="db-dot" aria-hidden="true" />
      <span>{label}</span>
      {status.lastSyncAt && <small>· บันทึก {timeAgo(status.lastSyncAt)}</small>}
      <button className="db-sync" onClick={sync} disabled={busy} aria-label="ดึงข้อมูลล่าสุดจากเซิร์ฟเวอร์">
        <Icon name="refresh" size={14} /> {busy ? "กำลัง Sync…" : "Sync"}
      </button>
    </div>
  );
}

/** หน้า "จัดการระบบ" ของแอดมิน — เดิมชื่อ n1 */
export function AdminPage() {
  const { data, dispatch, setModal, toast } = Q();
  const [tab, setTab] = useState("classes");
  const confirmDelete = (title, body, action) => setModal({ type: "confirm", title, body, action });

  return (
    <div className="admin page-enter">
      <div className="page-head">
        <h1>จัดการระบบ</h1>
        <DbStatusPill />
      </div>

      <div className="kpi-grid four">
        <div className="kpi">
          <span>ห้องเรียน</span>
          <strong>{data.classes.length}</strong>
        </div>
        <div className="kpi">
          <span>คุณครู</span>
          <strong>{data.users.filter((u) => u.role === "teacher").length}</strong>
        </div>
        <div className="kpi">
          <span>นักเรียน</span>
          <strong>{data.users.filter((u) => u.role === "student").length}</strong>
        </div>
        <div className="kpi">
          <span>ร้านค้า</span>
          <strong>{data.shops.length}</strong>
        </div>
      </div>

      <div className="tab-bar">
        <div className="shop-tabs" role="tablist" aria-label="ส่วนจัดการ">
          {TABS.map(([key, label]) => (
            <button role="tab" aria-selected={tab === key} className={tab === key ? "selected" : ""} onClick={() => setTab(key)} key={key}>
              {label}
            </button>
          ))}
        </div>
        {tab !== "demo" && (
          <Button
            variant="black small"
            icon="plus"
            onClick={() => setModal({ type: tab === "classes" ? "classForm" : "userForm", userRole: tab === "teachers" ? "teacher" : "student" })}
          >
            เพิ่ม{tab === "classes" ? "ห้องเรียน" : tab === "teachers" ? "ครู" : "นักเรียน"}
          </Button>
        )}
      </div>

      <section className="admin-list">
        {tab === "classes" &&
          (data.classes.length ? (
            data.classes.map((c) => (
              <div className="admin-row2" key={c.id}>
                <div className="admin-row2-main">
                  <strong>{c.name}</strong>
                  <small>
                    รหัส {c.code} · {data.users.find((u) => u.id === c.teacherId)?.name || "ไม่มีครูประจำ"} · {data.users.filter((u) => u.classId === c.id).length} คน
                  </small>
                </div>
                <div className="admin-row2-actions">
                  <Button variant="outline small" icon="edit" onClick={() => setModal({ type: "classForm", id: c.id })}>
                    แก้ไข
                  </Button>
                  <Button
                    variant="danger small"
                    onClick={() =>
                      confirmDelete("ลบห้องเรียนนี้?", "นักเรียนและร้านค้าจะถูกนำออกจากห้องนี้ แต่บัญชีและประวัติการขายยังอยู่", () => {
                        dispatch({ type: "DELETE_CLASS", id: c.id });
                        toast("ลบห้องเรียนแล้ว");
                      })
                    }
                  >
                    ลบ
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <EmptyState>ยังไม่มีห้องเรียน</EmptyState>
          ))}

        {(tab === "teachers" || tab === "students") &&
          data.users
            .filter((u) => u.role === (tab === "teachers" ? "teacher" : "student"))
            .map((u) => {
              const homeroom = data.classes.some((c) => c.teacherId === u.id);
              return (
                <div className="admin-row2" key={u.id}>
                  <div className="admin-row2-main person">
                    <Avatar name={u.name} size="small" />
                    <div className="truncate">
                      <strong>{u.name}</strong>
                      <small>
                        {u.id} · {data.classes.find((c) => c.id === u.classId)?.name || "—"}
                      </small>
                    </div>
                  </div>
                  <div className="admin-row2-actions">
                    <Button variant="outline small" icon="edit" onClick={() => setModal({ type: "userForm", id: u.id, userRole: u.role })}>
                      แก้ไข
                    </Button>
                    <Button
                      variant="danger small"
                      disabled={homeroom}
                      title={homeroom ? "เปลี่ยนครูประจำห้องก่อนลบบัญชี" : ""}
                      onClick={() =>
                        confirmDelete("ลบบัญชีนี้?", `ลบบัญชี ${u.name} ออกจากรายชื่อและทีมร้านค้า`, () => {
                          dispatch({ type: "DELETE_USER", id: u.id });
                          toast("ลบบัญชีแล้ว");
                        })
                      }
                    >
                      ลบ
                    </Button>
                  </div>
                </div>
              );
            })}

        {tab === "demo" && (
          <>
            <h2 className="section-h">สร้างยอดขายทดลอง</h2>
            <p className="hint">กด 1 ครั้ง = ออเดอร์ส่งมอบแล้ว 1 รายการ + รีวิว (หักสต็อก 1)</p>
            {data.products.map((p) => (
              <div className="admin-row2" key={p.id}>
                <div className="admin-row2-main">
                  <strong>{p.name}</strong>
                  <small>
                    สต็อก {p.stock} ชิ้น · ฿{p.price}
                  </small>
                </div>
                <div className="admin-row2-actions">
                  <Button
                    variant="outline small"
                    disabled={p.stock < 1}
                    onClick={() => {
                      dispatch({ type: "MOCK", productId: p.id });
                      toast("เพิ่มคำสั่งซื้อและรีวิวทดลองแล้ว");
                    }}
                  >
                    สร้างยอดขาย + รีวิว
                  </Button>
                </div>
              </div>
            ))}
            <h2 className="section-h" style={{ marginTop: 16 }}>
              มอบเหรียญบทเรียน
            </h2>
            {data.users
              .filter((u) => u.role === "student")
              .map((u) => (
                <div className="admin-row2" key={u.id}>
                  <div className="admin-row2-main">
                    <strong>{u.name}</strong>
                    <small>
                      {completedLessons(data.progress[u.id] || [])}/{Ea.length} เหรียญ
                    </small>
                  </div>
                  <div className="admin-row2-actions">
                    <Button
                      variant="outline small"
                      onClick={() => {
                        dispatch({ type: "GRANT", user: u.id });
                        toast("มอบเหรียญครบทุกบทแล้ว");
                      }}
                    >
                      มอบครบทุกเหรียญ
                    </Button>
                  </div>
                </div>
              ))}
          </>
        )}
      </section>
    </div>
  );
}
