// pages/LearnPage.jsx
// แหล่งโค้ดจริงของ app.js — แก้ไขไฟล์ใน src/ แล้วรัน `npm run build`
import { useState } from "react";
import { AttachmentList } from "../components/Attachments.jsx";
import { Button, Icon, StatusChip } from "../components/ui.jsx";
import { Ea } from "../config/constants.js";
import { Q } from "../state/context.js";
import { Pt, timeAgo } from "../utils/format.js";

const endOfDay = (due) => new Date(`${due}T23:59:59`).getTime();

/** สถานะงานของนักเรียน: ส่งแล้ว / รอส่ง / เลยกำหนด */
export function assignmentStatus(assignment, submission) {
  if (submission) return submission.score !== undefined ? ["green", `ตรวจแล้ว ${submission.score}/100`] : ["green", "ส่งแล้ว"];
  if (assignment.due && endOfDay(assignment.due) < Date.now()) return ["red", "เลยกำหนด"];
  return ["yellow", "รอส่ง"];
}

/** หน้า "บทเรียน" ของนักเรียน (Learning Hub) — เดิมชื่อ Wh */
export function LearnPage() {
  const { data, user, setLesson, setModal } = Q();
  const progress = data.progress[user.id] || [];
  const cls = data.classes.find((c) => c.id === user.classId);
  const assignments = data.assignments.filter((a) => a.classId === user.classId).sort((a, b) => String(a.due).localeCompare(String(b.due)));
  const contents = data.contents.filter((c) => c.classId === user.classId);
  const announcements = (data.announcements || []).filter((a) => a.classId === user.classId).slice(0, 3);
  const submissionOf = (a) => data.submissions.find((s) => s.assignmentId === a.id && s.userId === user.id);

  return (
    <div className="learn page-enter">
      {/* Classroom header */}
      <div className="learn-head">
        <div>
          <h1>บทเรียน</h1>
          <p className="learn-class">{cls ? cls.name : "ยังไม่มีห้องเรียน"}</p>
        </div>
        {!cls && (
          <Button variant="black" icon="plus" onClick={() => setModal({ type: "join" })}>
            เข้าห้องเรียน
          </Button>
        )}
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

      {/* Horizontal schedule timeline */}
      {assignments.length > 0 && (
        <section className="timeline-section" aria-label="ตารางส่งงาน">
          <h2 className="section-h">กำหนดส่ง</h2>
          <div className="timeline">
            {assignments.map((a) => {
              const [color, label] = assignmentStatus(a, submissionOf(a));
              return (
                <button className={"timeline-card t-" + color} onClick={() => setModal({ type: "assignment", id: a.id })} key={a.id}>
                  <span className="timeline-date">{a.due ? Pt(a.due) : "ไม่กำหนด"}</span>
                  <strong className="line-clamp-2">{a.title}</strong>
                  <StatusChip color={color}>{label}</StatusChip>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Teacher missions & media (collapses to a 48px bar when empty) */}
      <MissionBlock assignments={assignments} contents={contents} submissionOf={submissionOf} />

      {/* Lesson grid */}
      <section aria-label="บทเรียน">
        <h2 className="section-h">บทเรียน</h2>
        <div className="lesson-grid">
          {Ea.map((m) => {
            const done = progress.includes(m.id);
            return (
              <article className="lesson-card" key={m.id}>
                <div className="lesson-card-top">
                  <span className="lesson-icon" aria-hidden="true">
                    <Icon name={m.icon} size={22} />
                  </span>
                  <h3 className="line-clamp-2">{m.title}</h3>
                </div>
                <div className="lesson-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={done ? 100 : 0} aria-label={`ความคืบหน้า ${m.title}`}>
                  <span style={{ width: done ? "100%" : "0%" }} />
                </div>
                <div className="lesson-card-foot">
                  <small>{done ? "เรียนจบแล้ว" : "ยังไม่เริ่ม"}</small>
                  <Button variant={done ? "outline small" : "black small"} onClick={() => setLesson(m.id)}>
                    {done ? "ทบทวน" : "เริ่มเรียน"}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function MissionBlock({ assignments, contents, submissionOf }) {
  const { setModal } = Q();
  const items = [
    ...assignments.map((a) => ({ kind: "assignment", item: a })),
    ...contents.map((c) => ({ kind: "content", item: c })),
  ];
  // Expand the first mission still waiting to be sent (fallback: the first item).
  const [open, setOpen] = useState(() => {
    const due = items.find((x) => x.kind === "assignment" && assignmentStatus(x.item, submissionOf(x.item))[0] === "yellow") || items[0];
    return due ? `${due.kind}:${due.item.id}` : null;
  });

  if (!items.length)
    return (
      <div className="mission-empty" role="status">
        <strong>งานจากครู</strong>
        <span className="status-chip gray">ยังไม่มีงาน</span>
      </div>
    );

  return (
    <section className="missions" aria-label="งานจากครู">
      <h2 className="section-h">งานจากครู</h2>
      {items.map(({ kind, item }) => {
        const key = `${kind}:${item.id}`;
        const expanded = open === key;
        const sub = kind === "assignment" ? submissionOf(item) : null;
        const status = kind === "assignment" ? assignmentStatus(item, sub) : null;
        return (
          <article className={"mission" + (expanded ? " open" : "")} key={key}>
            <button className="mission-head" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : key)}>
              <span className="mission-kind" aria-hidden="true">
                <Icon name={kind === "assignment" ? "edit" : "book"} size={18} />
              </span>
              <span className="mission-title">
                <strong className="truncate">{item.title}</strong>
                <small>{kind === "assignment" ? `ส่ง ${item.due ? Pt(item.due) : "-"}` : item.category || "สื่อการสอน"}</small>
              </span>
              {status && <StatusChip color={status[0]}>{status[1]}</StatusChip>}
              <Icon name="chevronDown" size={18} />
            </button>
            {expanded && (
              <div className="mission-body">
                {(item.body || "").trim() && <p className="pre-wrap mission-text">{item.body}</p>}
                <AttachmentList items={item.attachments} />
                {kind === "content" && item.file && (
                  <a className="attach-btn pdf" href={item.file.url || item.file.data} download={item.file.name}>
                    <span className="attach-kind">ไฟล์</span>
                    <span className="truncate">{item.file.name}</span>
                  </a>
                )}
                <div className="mission-actions">
                  {kind === "assignment" ? (
                    <Button variant="black small" onClick={() => setModal({ type: "assignment", id: item.id })}>
                      {sub ? (sub.score !== undefined ? "ดูคะแนน" : "แก้ไขงานที่ส่ง") : "ส่งงาน"}
                    </Button>
                  ) : (
                    <Button variant="outline small" onClick={() => setModal({ type: "content", id: item.id })}>
                      อ่านเต็ม
                    </Button>
                  )}
                </div>
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}
