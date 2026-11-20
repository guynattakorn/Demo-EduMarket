// modals/AssignmentFormModal.jsx
// แหล่งโค้ดจริงของ app.js — แก้ไขไฟล์ใน src/ แล้วรัน `npm run build`
import { useState } from "react";
import { AttachmentEditor } from "../components/Attachments.jsx";
import { Button, Field } from "../components/ui.jsx";
import { Q } from "../state/context.js";
import { St } from "../utils/format.js";

/** ฟอร์มสร้าง/แก้ไขภารกิจ (assignForm) + แนบ PDF/Canva — เดิมชื่อ r1 */
export function AssignmentFormModal({ classId, id }) {
  const { data, user, dispatch, setModal, toast } = Q();
  const existing = data.assignments.find((a) => a.id === id);
  const [title, setTitle] = useState(existing?.title || "");
  const [body, setBody] = useState(existing?.body || "");
  const [due, setDue] = useState(existing?.due || new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10));
  const [attachments, setAttachments] = useState(existing?.attachments || []);
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        dispatch({
          type: "ASSIGN",
          item: {
            id: existing?.id || St("a"),
            classId: existing?.classId || classId,
            teacherId: existing?.teacherId || user.id,
            title: title.trim(),
            body: body.trim(),
            due,
            attachments,
          },
        });
        toast(existing ? "บันทึกงานแล้ว" : "มอบหมายงานแล้ว");
        setModal(null);
      }}
    >
      <Field label="ชื่องาน">
        <input required value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />
      </Field>
      <Field label="รายละเอียด">
        <textarea required rows="5" value={body} onChange={(e) => setBody(e.target.value)} />
      </Field>
      <Field label="กำหนดส่ง">
        <input required type="date" value={due} onChange={(e) => setDue(e.target.value)} />
      </Field>
      <AttachmentEditor value={attachments} onChange={setAttachments} />
      <Button variant="black full" disabled={!title.trim() || !body.trim()}>
        {existing ? "บันทึก" : "มอบหมายงาน"}
      </Button>
    </form>
  );
}
