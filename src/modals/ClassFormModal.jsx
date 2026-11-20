// modals/ClassFormModal.jsx
// แหล่งโค้ดจริงของ app.js — แก้ไขไฟล์ใน src/ แล้วรัน `npm run build`
import { useState } from "react";
import { Button, Field } from "../components/ui.jsx";
import { Q } from "../state/context.js";
import { St } from "../utils/format.js";

/** ฟอร์มสร้าง/แก้ไขห้องเรียน — เดิมชื่อ u1 */
export function ClassFormModal({ id: t }) {
  let { data: e, user: a, role: l, dispatch: n, setModal: i, toast: c } = Q(),
    u = e.classes.find((v) => v.id === t),
    [o, d] = useState(u?.name || ""),
    [g, h] = useState(u?.code || "BIZ" + Math.floor(1e3 + Math.random() * 9e3)),
    [p, r] = useState(
      u?.teacherId ||
        (l === "teacher" ? a.id : e.users.find((v) => v.role === "teacher")?.id || ""),
    );
  return (
    <form
      onSubmit={(v) => {
        if (
          (v.preventDefault(),
          e.classes.some((b) => b.id !== t && b.code === g.toUpperCase().trim()))
        ) {
          c("รหัสห้องนี้ถูกใช้แล้ว");
          return;
        }
        (n({
          type: "CLASS",
          item: {
            id: t || St("c"),
            name: o.trim(),
            code: g.toUpperCase().trim(),
            teacherId: p,
          },
        }),
          c("บันทึกห้องเรียนแล้ว"),
          i(null));
      }}
    >
      <Field label="ชื่อห้องเรียน">
        <input required={true} maxLength={80} value={o} onChange={(v) => d(v.target.value)} />
      </Field>
      <Field label="รหัสเข้าร่วม">
        <input
          required={true}
          pattern="[A-Za-z0-9]{4,12}"
          title="ตัวอักษรภาษาอังกฤษและตัวเลข 4–12 ตัว"
          value={g}
          onChange={(v) => h(v.target.value)}
        />
      </Field>
      {l === "admin" && (
        <Field label="ครูประจำห้อง">
          <select value={p} onChange={(v) => r(v.target.value)}>
            {e.users
              .filter((v) => v.role === "teacher")
              .map((v) => (
                <option value={v.id} key={v.id}>
                  {v.name}
                </option>
              ))}
          </select>
        </Field>
      )}
      <Button disabled={!o.trim() || !g.trim() || !p}>บันทึกห้องเรียน</Button>
    </form>
  );
}
