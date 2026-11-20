// modals/JoinClassModal.jsx
// แหล่งโค้ดจริงของ app.js — แก้ไขไฟล์ใน src/ แล้วรัน `npm run build`
import { useState } from "react";
import { Button, Field } from "../components/ui.jsx";
import { Q } from "../state/context.js";

/** เข้าร่วมห้องเรียนด้วยรหัส — เดิมชื่อ p1 */
export function JoinClassModal() {
  let { data: t, user: e, dispatch: a, setModal: l, toast: n } = Q(),
    [i, c] = useState(new URLSearchParams(location.search).get("join") || "");
  return (
    <form
      onSubmit={(u) => {
        u.preventDefault();
        let o = i.trim().split("join=").pop().split("&")[0].toUpperCase();
        if (!t.classes.some((d) => d.code === o)) {
          n("ไม่พบรหัสห้องเรียนนี้");
          return;
        }
        (a({
          type: "JOIN",
          user: e.id,
          code: i,
        }),
          n("เข้าร่วมห้องเรียนเรียบร้อย"),
          l(null));
      }}
    >
      <Field label="รหัสห้อง / ลิงก์เชิญ">
        <input
          required={true}
          value={i}
          onChange={(u) => c(u.target.value)}
          placeholder="เช่น BIZ401"
        />
      </Field>
      <p className="hint">ห้องเดิมจะถูกแทนที่</p>
      <Button>เข้าร่วมห้องเรียน</Button>
    </form>
  );
}
