// modals/ShopFormModal.jsx
// แหล่งโค้ดจริงของ app.js — แก้ไขไฟล์ใน src/ แล้วรัน `npm run build`
import { useState } from "react";
import { ShopLogo } from "../components/Avatar.jsx";
import { Button, Field } from "../components/ui.jsx";
import { DEFAULT_OPEN_HOURS } from "../config/constants.js";
import { Q } from "../state/context.js";
import { St } from "../utils/format.js";

// โทนสีโลโก้ร้าน (คีย์เดิมเก็บไว้เพื่อให้ข้อมูลเก่าใช้ได้ — สีจริงอยู่ที่ .shop-logo.tone-* ใน base.css)
const COLORS = [
  ["lime", "ดำ"],
  ["sky", "น้ำเงิน"],
  ["lavender", "ม่วง"],
  ["peach", "ส้มอิฐ"],
  ["yellow", "มัสตาร์ด"],
];

/** ตั้งค่าร้านค้า / เปิดร้านใหม่ — เดิมชื่อ s1 */
export function ShopFormModal({ id }) {
  const { data, user, dispatch, setModal, toast, setActiveShopId } = Q();
  const shop = data.shops.find((s) => s.id === id);
  const [form, setForm] = useState({
    name: shop?.name || "",
    tagline: shop?.tagline || "",
    emoji: shop?.emoji || "",
    color: shop?.color || "lime",
    boothLocation: shop?.boothLocation || "",
    openHours: shop?.openHours ?? DEFAULT_OPEN_HOURS,
  });
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        const newId = id || St("s");
        dispatch({
          type: "SHOP",
          user: user.id,
          item: {
            id: newId,
            name: form.name.trim(),
            tagline: form.tagline.trim(),
            emoji: form.emoji,
            color: form.color,
            boothLocation: form.boothLocation.trim(),
            openHours: form.openHours.trim(),
            ...(shop ? {} : { members: [user.id], ownerId: user.id, classId: user.classId || null }),
          },
        });
        if (!shop) setActiveShopId(newId);
        toast(shop ? "บันทึกการตั้งค่าร้านแล้ว" : "เปิดร้านใหม่แล้ว");
        setModal(null);
      }}
    >
      <Field label="ชื่อร้าน">
        <input required value={form.name} onChange={set("name")} maxLength={40} />
      </Field>
      <Field label="สโลแกน">
        <input value={form.tagline} onChange={set("tagline")} maxLength={80} placeholder="ไม่บังคับ" />
      </Field>
      <div className="field">
        <span>สีโลโก้</span>
        <div className="tone-picker" role="radiogroup" aria-label="เลือกสีโลโก้ร้าน">
          {COLORS.map(([value, label]) => (
            <button
              type="button"
              role="radio"
              aria-checked={form.color === value}
              aria-label={label}
              title={label}
              className={form.color === value ? "selected" : ""}
              onClick={() => setForm({ ...form, color: value })}
              key={value}
            >
              <ShopLogo shop={{ name: form.name || "ร้าน", color: value }} size="small" />
            </button>
          ))}
        </div>
      </div>
      <Field label="บูธ">
        <input value={form.boothLocation} onChange={set("boothLocation")} maxLength={80} placeholder="เช่น บูธ A1 ลานอเนกประสงค์" />
      </Field>
      <Field label="เวลาเปิด">
        <input value={form.openHours} onChange={set("openHours")} maxLength={60} placeholder="เช่น พักเที่ยง 12:00–13:00 น." />
      </Field>
      <Button variant="black full" disabled={!form.name.trim()}>
        {shop ? "บันทึก" : "เปิดร้าน"}
      </Button>
    </form>
  );
}
