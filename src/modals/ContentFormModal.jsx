// modals/ContentFormModal.jsx
// แหล่งโค้ดจริงของ app.js — แก้ไขไฟล์ใน src/ แล้วรัน `npm run build`
import { useState } from "react";
import { AttachmentEditor } from "../components/Attachments.jsx";
import { Button, Field } from "../components/ui.jsx";
import { Q } from "../state/context.js";
import { St, ct } from "../utils/format.js";

const CATEGORIES = ["แนวคิดธุรกิจ", "การตลาด", "ภาพ & โปสเตอร์", "วิเคราะห์ & สะท้อนผล"];

/** ฟอร์มเพิ่มบทความ/สื่อการสอนจากครู (contentForm) + แนบ PDF/Canva — เดิมชื่อ o1 */
export function ContentFormModal({ classId }) {
  const { user, dispatch, setModal, toast } = Q();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [attachments, setAttachments] = useState([]);
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (!body.trim() && !attachments.length) return toast("ใส่เนื้อหาหรือแนบไฟล์ก่อน");
        dispatch({
          type: "CONTENT",
          item: { id: St("ct"), classId, teacherId: user.id, title: title.trim(), category, body, attachments, date: ct() },
        });
        toast("เผยแพร่และแจ้งนักเรียนแล้ว");
        setModal(null);
      }}
    >
      <Field label="ชื่อ">
        <input required value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />
      </Field>
      <Field label="หมวดหมู่">
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </Field>
      <Field label="เนื้อหา">
        <textarea rows="5" value={body} onChange={(e) => setBody(e.target.value)} />
      </Field>
      <AttachmentEditor value={attachments} onChange={setAttachments} />
      <Button variant="black full" disabled={!title.trim()}>
        เผยแพร่ในห้องเรียน
      </Button>
    </form>
  );
}
