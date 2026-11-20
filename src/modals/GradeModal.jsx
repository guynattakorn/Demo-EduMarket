// modals/GradeModal.jsx
// แหล่งโค้ดจริงของ app.js — แก้ไขไฟล์ใน src/ แล้วรัน `npm run build`
import { useState } from "react";
import { Button, Chip, Field } from "../components/ui.jsx";
import { Q } from "../state/context.js";
import { Pt } from "../utils/format.js";

/** ตรวจงานและให้คะแนน — เดิมชื่อ d1 */
export function GradeModal({ id: t }) {
  let { data: e, dispatch: a, setModal: l, toast: n } = Q(),
    i = e.submissions.find((g) => g.id === t),
    [c, u] = useState(i?.score ?? 80),
    [o, d] = useState(i?.feedback || "");
  return (
    <>
      <Chip color="lime">
        {e.users.find((g) => g.id === i.userId)?.name}
        {" \xB7 ส่ง "}
        {Pt(i.date)}
      </Chip>
      <h3>{e.assignments.find((g) => g.id === i.assignmentId)?.title}</h3>
      <div className="submitted-work pre-wrap">{i.text}</div>
      <form
        onSubmit={(g) => {
          (g.preventDefault(),
            a({
              type: "GRADE",
              id: t,
              score: Number(c),
              feedback: o.trim(),
            }),
            n("ส่งคะแนนและข้อเสนอแนะแล้ว"),
            l(null));
        }}
      >
        <Field label="คะแนน (เต็ม 100)">
          <input
            type="number"
            required={true}
            min="0"
            max="100"
            value={c}
            onChange={(g) => u(g.target.value)}
          />
        </Field>
        <Field label="ความเห็น">
          <textarea required={true} value={o} onChange={(g) => d(g.target.value)} />
        </Field>
        <Button disabled={!o.trim()}>บันทึกผลประเมิน</Button>
      </form>
    </>
  );
}
