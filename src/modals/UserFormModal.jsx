// modals/UserFormModal.jsx
// แหล่งโค้ดจริงของ app.js — แก้ไขไฟล์ใน src/ แล้วรัน `npm run build`
import { useState } from "react";
import { Button, Field } from "../components/ui.jsx";
import { Q } from "../state/context.js";

/** ฟอร์มเพิ่ม/แก้ไขสมาชิก — เดิมชื่อ Hp */
export function UserFormModal({
  id: t,
  userRole: e = "student",
  classId: a,
  teacherMode: l = false,
}) {
  let { data: n, dispatch: i, setModal: c, toast: u } = Q(),
    o = n.users.find((f) => f.id === t),
    [d, g] = useState(o?.name || ""),
    [h, p] = useState(t || ""),
    [r, v] = useState(o?.classId || a || ""),
    [b, z] = useState(n.shops.find((f) => f.members.includes(t))?.id || "");
  return (
    <form
      onSubmit={(f) => {
        if ((f.preventDefault(), !t && n.users.some((x) => x.id === h.trim()))) {
          u("ชื่อผู้ใช้นี้มีอยู่แล้ว");
          return;
        }
        let m = t || h.trim();
        if (
          (i({
            type: "USER",
            item: {
              id: m,
              name: d.trim(),
              role: o?.role || e,
              avatar: o?.avatar || "",
              classId: r || null,
            },
          }),
          l)
        ) {
          n.shops
            .filter((y) => y.members.includes(m) && y.id !== b)
            .forEach((y) =>
              i({
                type: "SHOP",
                item: {
                  ...y,
                  members: y.members.filter((E) => E !== m),
                },
              }),
            );
          let x = n.shops.find((y) => y.id === b);
          x &&
            !x.members.includes(m) &&
            i({
              type: "SHOP",
              item: {
                ...x,
                members: [...x.members, m],
              },
            });
        }
        (u("บันทึกสมาชิกแล้ว"), c(null));
      }}
    >
      <Field label="ชื่อที่แสดง">
        <input required={true} value={d} onChange={(f) => g(f.target.value)} maxLength={50} />
      </Field>
      <Field label="ชื่อผู้ใช้">
        <input
          required={true}
          pattern="[a-zA-Z0-9_]{3,30}"
          title="ภาษาอังกฤษ ตัวเลข หรือขีดล่าง 3–30 ตัว"
          disabled={!!t}
          value={h}
          onChange={(f) => p(f.target.value)}
          placeholder="เช่น student5"
        />
      </Field>
      <p className="hint">บัญชีทดลอง ใช้รหัสผ่านใดก็ได้</p>
      {e === "student" && !l && (
        <Field label="ห้องเรียน">
          <select value={r} onChange={(f) => v(f.target.value)}>
            <option value="">ยังไม่เข้าห้องเรียน</option>
            {n.classes.map((f) => (
              <option value={f.id} key={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </Field>
      )}
      {l && (
        <Field label="ทีมร้านค้า">
          <select value={b} onChange={(f) => z(f.target.value)}>
            <option value="">ยังไม่อยู่ในทีม</option>
            {n.shops
              .filter((f) => f.classId === a)
              .map((f) => (
                <option value={f.id} key={f.id}>
                  {f.name}
                </option>
              ))}
          </select>
        </Field>
      )}
      <Button disabled={!d.trim() || !h.trim()}>บันทึกสมาชิก</Button>
    </form>
  );
}
