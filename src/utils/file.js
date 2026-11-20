// utils/file.js
// แหล่งโค้ดจริงของ app.js — แก้ไขไฟล์ใน src/ แล้วรัน `npm run build`

/** อ่านไฟล์ที่ผู้ใช้เลือกเป็น data URL (จำกัด 2 MB) — เดิมชื่อ Qp */
export async function readUploadFile(t, e = 2 * 1024 * 1024) {
  if (t.size > e) throw new Error("กรุณาใช้ไฟล์ขนาดไม่เกิน 2 MB");
  return new Promise((a, l) => {
    let n = new FileReader();
    ((n.onload = () => a(n.result)),
      (n.onerror = () => l(new Error("อ่านไฟล์ไม่สำเร็จ"))),
      n.readAsDataURL(t));
  });
}
