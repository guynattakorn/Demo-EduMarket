// pages/ClassroomPage.jsx
// แหล่งโค้ดจริงของ app.js — แก้ไขไฟล์ใน src/ แล้วรัน `npm run build`
import { useState } from "react";
import { AttachmentList } from "../components/Attachments.jsx";
import { Avatar } from "../components/Avatar.jsx";
import { Button, EmptyState, Icon, StatusChip } from "../components/ui.jsx";
import { Ea, completedLessons } from "../config/constants.js";
import { Q } from "../state/context.js";
import { Pt, timeAgo } from "../utils/format.js";

const TABS = [
  ["students", "นักเรียน"],
  ["assignments", "งาน"],
  ["content", "สื่อการสอน"],
];
const LESSON_SHORT = { cost: "ต้นทุน", demand: "ตลาด", stock: "สต็อก" };

/** หน้า "ห้องเรียน" ของครู — เดิมชื่อ Ih */
export function ClassroomPage() {
  const { data, user, setModal, toast } = Q();
  const classes = data.classes.filter((c) => c.teacherId === user.id);
  const [classId, setClassId] = useState(classes[0]?.id || "");
  const [tab, setTab] = useState("students");
  const cls = classes.find((c) => c.id === classId) || classes[0];
  const students = data.users.filter((u) => u.role === "student" && u.classId === cls?.id);
  const shops = data.shops.filter((s) => s.classId === cls?.id);
  const assignments = data.assignments.filter((a) => a.classId === cls?.id);
  const pendingReview = data.submissions.filter((s) => s.score === undefined && assignments.some((a) => a.id === s.assignmentId)).length;
  const announcements = (data.announcements || []).filter((a) => a.classId === cls?.id).slice(0, 3);

  const copyInvite = async () => {
    const link = `${location.origin}/?join=${cls.code}`;
    try {
      await navigator.clipboard.writeText(link);
      toast("คัดลอกลิงก์เชิญแล้ว");
    } catch {
      setModal({ type: "invite", link });
    }
  };

  return (
    <div className="classroom page-enter">
      <div className="page-head">
        <h1>ห้องเรียน</h1>
        <div className="actions">
          {cls && (
            <Button variant="black" icon="megaphone" onClick={() => setModal({ type: "announce", classId: cls.id })}>
              ส่งประกาศ
            </Button>
          )}
          <Button variant="outline" icon="plus" onClick={() => setModal({ type: "classForm" })}>
            สร้างห้องเรียน
          </Button>
        </div>
      </div>

      {!cls ? (
        <EmptyState>ยังไม่มีห้องเรียน</EmptyState>
      ) : (
        <>
          <section className="class-bar">
            <select aria-label="เลือกห้องเรียน" className="class-picker" value={cls.id} onChange={(e) => setClassId(e.target.value)}>
              {classes.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <div className="class-bar-actions">
              <span className="invite-code">
                รหัสห้อง <b>{cls.code}</b>
              </span>
              <Button variant="link small" icon="copy" onClick={copyInvite}>
                คัดลอกลิงก์
              </Button>
            </div>
          </section>

          <div className="kpi-grid four">
            <div className="kpi">
              <span>นักเรียน</span>
              <strong>{students.length} คน</strong>
            </div>
            <div className="kpi">
              <span>ร้านค้า</span>
              <strong>{shops.length} ร้าน</strong>
            </div>
            <div className="kpi">
              <span>เรียนครบทุกบท</span>
              <strong>{students.filter((s) => completedLessons(data.progress[s.id] || []) === Ea.length).length} คน</strong>
            </div>
            <div className="kpi">
              <span>งานรอตรวจ</span>
              <strong>{pendingReview} งาน</strong>
            </div>
          </div>

          {announcements.length > 0 && (
            <div className="announce-list">
              {announcements.map((a) => (
                <div className="announce" key={a.id}>
                  <span className="announce-icon" aria-hidden="true">
                    <Icon name="megaphone" size={18} />
                  </span>
                  <div>
                    <strong>{a.title}</strong>
                    <p>{a.text}</p>
                    <small>{timeAgo(a.date)}</small>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="tab-bar">
            <div className="shop-tabs" role="tablist" aria-label="ส่วนของห้องเรียน">
              {TABS.map(([key, label]) => (
                <button role="tab" aria-selected={tab === key} className={tab === key ? "selected" : ""} onClick={() => setTab(key)} key={key}>
                  {label}
                </button>
              ))}
            </div>
            <Button
              variant="outline small"
              icon="plus"
              onClick={() => setModal({ type: tab === "content" ? "contentForm" : tab === "assignments" ? "assignForm" : "studentForm", classId: cls.id })}
            >
              {tab === "content" ? "เพิ่มสื่อ" : tab === "assignments" ? "มอบหมายงาน" : "เพิ่มนักเรียน"}
            </Button>
          </div>

          {tab === "students" && (
            <section className="card">
              {students.length ? (
                <div className="table-scroll">
                  <table className="rtable">
                    <thead>
                      <tr>
                        <th>นักเรียน / ร้านค้า</th>
                        {Ea.map((m) => (
                          <th key={m.id}>
                            {LESSON_SHORT[m.id] || m.title}
                          </th>
                        ))}
                        <th>ส่งงาน</th>
                        <th aria-label="จัดการ" />
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s) => {
                        const shop = shops.find((x) => x.members.includes(s.id));
                        const prog = data.progress[s.id] || [];
                        const sent = data.submissions.filter((x) => x.userId === s.id && assignments.some((a) => a.id === x.assignmentId)).length;
                        return (
                          <tr key={s.id}>
                            <td data-label="นักเรียน">
                              <div className="person">
                                <Avatar name={s.name} size="small" />
                                <div>
                                  <strong>{s.name}</strong>
                                  <small>{shop?.name || "ยังไม่มีร้านค้า"}</small>
                                </div>
                              </div>
                            </td>
                            {Ea.map((m) => (
                              <td data-label={LESSON_SHORT[m.id] || m.title} key={m.id}>
                                <span className={"completion " + (prog.includes(m.id) ? "yes" : "")}>{prog.includes(m.id) ? "✓" : "—"}</span>
                              </td>
                            ))}
                            <td data-label="ส่งงาน">{sent} งาน</td>
                            <td data-label="">
                              <Button variant="link small" onClick={() => setModal({ type: "studentForm", id: s.id, classId: cls.id })}>
                                จัดการ
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState>ยังไม่มีนักเรียน</EmptyState>
              )}
            </section>
          )}

          {tab === "assignments" && (
            <div className="stack">
              {assignments.length === 0 && <EmptyState>ยังไม่มีงาน</EmptyState>}
              {assignments.map((a) => {
                const subs = data.submissions.filter((x) => x.assignmentId === a.id);
                return (
                  <article className="card assignment-card" key={a.id}>
                    <div className="row-between">
                      <h3>{a.title}</h3>
                      <StatusChip color="yellow">ส่ง {a.due ? Pt(a.due) : "-"}</StatusChip>
                    </div>
                    <p className="pre-wrap">{a.body}</p>
                    <AttachmentList items={a.attachments} />
                    <div className="row" style={{ justifyContent: "flex-end" }}>
                      <Button variant="outline small" icon="edit" onClick={() => setModal({ type: "assignForm", id: a.id, classId: cls.id })}>
                        แก้ไข / แนบสื่อ
                      </Button>
                    </div>
                    <div className="submission-list">
                      {subs.map((x) => (
                        <div className="submission-row" key={x.id}>
                          <span>
                            {data.users.find((u) => u.id === x.userId)?.name} <small>· ส่ง {Pt(x.date)}</small>
                          </span>
                          <Button variant={x.score === undefined ? "black small" : "outline small"} onClick={() => setModal({ type: "grade", id: x.id })}>
                            {x.score === undefined ? "ตรวจงาน" : `${x.score}/100 · ดูผล`}
                          </Button>
                        </div>
                      ))}
                      {!subs.length && <p className="hint">ยังไม่มีงานส่งเข้ามา</p>}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {tab === "content" && (
            <div className="content-list">
              {data.contents
                .filter((c) => c.classId === cls.id)
                .map((c) => (
                  <article className="card content-item" key={c.id}>
                    <div className="row-between">
                      <h3>{c.title}</h3>
                      <StatusChip color="violet">{c.category}</StatusChip>
                    </div>
                    {c.body && <p className="line-clamp-2">{c.body}</p>}
                    <AttachmentList items={c.attachments} />
                    <Button variant="link small" onClick={() => setModal({ type: "content", id: c.id })}>
                      อ่านเต็ม
                    </Button>
                  </article>
                ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
