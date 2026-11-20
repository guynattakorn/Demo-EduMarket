// modals/AnnounceModal.jsx
// แหล่งโค้ดจริงของ app.js — แก้ไขไฟล์ใน src/ แล้วรัน `npm run build`
import { useState } from "react";
import { Button, Field } from "../components/ui.jsx";
import { Q } from "../state/context.js";
import { St, ct } from "../utils/format.js";

const PRESETS = ["เปิดบูธตลาดนัดในโรงเรียน", "เตรียมตัวส่งงาน", "แจ้งเปลี่ยนเวลา"];

/** ครูส่งประกาศ (เช่น รอบเปิดบูธตลาดนัด) ไปยังนักเรียนทุกคนในห้อง */
export function AnnounceModal({ classId }) {
  const { data, user, dispatch, setModal, toast } = Q();
  const cls = data.classes.find((c) => c.id === classId);
  const count = data.users.filter((u) => u.role === "student" && u.classId === classId).length;
  const [title, setTitle] = useState(PRESETS[0]);
  const [text, setText] = useState("");
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        dispatch({ type: "ANNOUNCE", item: { id: St("ann"), classId, teacherId: user.id, title: title.trim(), text: text.trim(), date: ct() } });
        toast(`ส่งประกาศถึงนักเรียน ${count} คนแล้ว`);
        setModal(null);
      }}
    >
      <p className="hint">
        {cls?.name} · {count} คน
      </p>
      <div className="pill-row">
        {PRESETS.map((p) => (
          <button type="button" className={title === p ? "selected" : ""} onClick={() => setTitle(p)} key={p}>
            {p}
          </button>
        ))}
      </div>
      <Field label="หัวข้อ">
        <input required value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
      </Field>
      <Field label="รายละเอียด">
        <textarea required rows="4" value={text} onChange={(e) => setText(e.target.value)} placeholder="เช่น วันศุกร์นี้ พักเที่ยง 12:00–13:00 ตั้งบูธที่ลานอเนกประสงค์" maxLength={500} />
      </Field>
      <Button variant="black full" disabled={!title.trim() || !text.trim() || !count}>
        ส่งประกาศ
      </Button>
    </form>
  );
}
