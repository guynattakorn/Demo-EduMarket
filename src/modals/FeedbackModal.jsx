// modals/FeedbackModal.jsx
// แหล่งโค้ดจริงของ app.js — แก้ไขไฟล์ใน src/ แล้วรัน `npm run build`
import { useState } from "react";
import { Button, Field } from "../components/ui.jsx";
import { Q } from "../state/context.js";
import { St, ct } from "../utils/format.js";

/** ข้อเสนอแนะจากครูถึงร้านค้า — เดิมชื่อ f1 */
export function FeedbackModal({ shopId: t }) {
  let { user: e, dispatch: a, setModal: l, toast: n } = Q(),
    [i, c] = useState(80),
    [u, o] = useState("");
  return (
    <form
      onSubmit={(d) => {
        (d.preventDefault(),
          a({
            type: "FEEDBACK",
            item: {
              id: St("f"),
              shopId: t,
              teacherId: e.id,
              score: Number(i),
              text: u.trim(),
              date: ct(),
            },
          }),
          n("ส่งข้อเสนอแนะถึงทีมร้านค้าแล้ว"),
          l(null));
      }}
    >
      <Field label="คะแนน (เต็ม 100)">
        <input
          required={true}
          type="number"
          min="0"
          max="100"
          value={i}
          onChange={(d) => c(d.target.value)}
        />
      </Field>
      <Field label="ความเห็น">
        <textarea required={true} rows="5" value={u} onChange={(d) => o(d.target.value)} />
      </Field>
      <Button disabled={!u.trim()}>ส่งถึงนักเรียน</Button>
    </form>
  );
}
