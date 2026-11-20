// modals/AssignmentModal.jsx
// แหล่งโค้ดจริงของ app.js — แก้ไขไฟล์ใน src/ แล้วรัน `npm run build`
import { useState } from "react";
import { Button, Chip, Field, Icon } from "../components/ui.jsx";
import { AttachmentList } from "../components/Attachments.jsx";
import { Q } from "../state/context.js";
import { Pt, St, ct } from "../utils/format.js";

/** ดู/ส่งภารกิจจากครู — เดิมชื่อ $h */
export function AssignmentModal({ id: t }) {
  let { data: e, user: a, dispatch: l, toast: n, setModal: i } = Q(),
    c = e.assignments.find((g) => g.id === t),
    u = e.submissions.find((g) => g.assignmentId === t && g.userId === a.id),
    [o, d] = useState(u?.text || "");
  return (
    <>
      <Chip color="peach">
        {"ส่งภายใน "}
        {Pt(c.due)}
      </Chip>
      <h2>{c.title}</h2>
      <p className="pre-wrap">{c.body}</p>
      <AttachmentList items={c.attachments} />
      {u?.score !== void 0 && (
        <div className="note">
          <strong>
            {"ครูให้ "}
            {u.score}/100 คะแนน
          </strong>
          <p>{u.feedback}</p>
        </div>
      )}
      <form
        onSubmit={(g) => {
          (g.preventDefault(),
            l({
              type: "SUBMIT",
              item: {
                id: St("sub"),
                assignmentId: t,
                userId: a.id,
                text: o.trim(),
                date: ct(),
              },
            }),
            n("ส่งงานให้ครูเรียบร้อย"),
            i(null));
        }}
      >
        <Field label="คำตอบ">
          <textarea
            rows="7"
            required={true}
            value={o}
            onChange={(g) => d(g.target.value)}
            placeholder="วิธีคิด ตัวเลข และเหตุผล"
          />
        </Field>
        <Button disabled={!o.trim()}>
          {u ? "ส่งงานฉบับแก้ไข" : "ส่งงานให้คุณครู"} <Icon name="arrow" />
        </Button>
        {u && <p className="hint">ส่งใหม่แล้วครูจะตรวจอีกครั้ง</p>}
      </form>
    </>
  );
}
