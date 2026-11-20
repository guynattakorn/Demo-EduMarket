// modals/ProductFormModal.jsx
// แหล่งโค้ดจริงของ app.js — แก้ไขไฟล์ใน src/ แล้วรัน `npm run build`
import { useState } from "react";
import { ProductImage } from "../components/ProductImage.jsx";
import { Button, Field, Icon } from "../components/ui.jsx";
import { CATEGORIES, MAX_LEAD_DAYS, leadDaysOf } from "../config/constants.js";
import { Q } from "../state/context.js";
import { St, ct } from "../utils/format.js";
import { uploadImage } from "../utils/upload.js";

/** ฟอร์มเพิ่ม/แก้ไขสินค้า (อัปโหลดรูปผ่าน /api/upload) — เดิมชื่อ i1 */
export function ProductFormModal({ id, shopId }) {
  const { data, user, dispatch, setModal, toast } = Q();
  const existing = data.products.find((p) => p.id === id);
  const [form, setForm] = useState(
    existing
      ? { ...existing, cost: existing.cost ?? "", leadDays: leadDaysOf(existing) }
      : {
          name: "",
          price: 25,
          stock: 10,
          category: CATEGORIES[0],
          description: "",
          emoji: "",
          color: "lime",
          leadDays: 0,
          cost: "",
          image: "",
          active: true,
        },
  );
  const [reason, setReason] = useState("");
  const [uploading, setUploading] = useState(false);
  const set = (key, value) => setForm({ ...form, [key]: value });

  const onImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadImage(file, { maxSide: 1280, quality: 0.72, maxBytes: 200 * 1024 });
      set("image", url);
    } catch (err) {
      toast(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!form.name.trim()) return;
        dispatch({
          type: "PRODUCT",
          user: user.id,
          reason: reason.trim() || "แก้ไขสินค้าจากหน้าร้าน",
          item: {
            ...form,
            id: id || St("p"),
            createdAt: existing?.createdAt || ct(),
            shopId,
            name: form.name.trim(),
            price: Number(form.price),
            stock: Number(form.stock),
            leadDays: Math.min(MAX_LEAD_DAYS, Math.max(0, Math.round(Number(form.leadDays) || 0))),
            cost: form.cost === "" || form.cost === null ? null : Number(form.cost),
          },
        });
        toast(id ? "บันทึกสินค้าแล้ว" : "เพิ่มสินค้าแล้ว");
        setModal(null);
      }}
    >
      <div className="two-col">
        <div>
          <Field label="ชื่อสินค้า">
            <input required maxLength={70} value={form.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="หมวดหมู่">
            <select value={form.category} onChange={(e) => set("category", e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <div className="two-col">
            <Field label="ราคาขาย (บาท)">
              <input required type="number" min="1" max="99999" step="0.01" inputMode="decimal" value={form.price} onChange={(e) => set("price", e.target.value)} />
            </Field>
            <Field label="สต็อก (ชิ้น)">
              <input required type="number" min="0" max="99999" step="1" inputMode="numeric" value={form.stock} onChange={(e) => set("stock", e.target.value)} />
            </Field>
          </div>
          <Field label="ต้นทุนต่อชิ้น (บาท)">
            <input type="number" min="0" max="99999" step="0.01" inputMode="decimal" value={form.cost ?? ""} onChange={(e) => set("cost", e.target.value)} placeholder="เว้นว่างได้" />
          </Field>
          <Field label="พร้อมส่งมอบใน (วัน)">
            <input
              type="number"
              min="0"
              max={MAX_LEAD_DAYS}
              step="1"
              inputMode="numeric"
              value={form.leadDays ?? 0}
              onChange={(e) => set("leadDays", e.target.value)}
            />
          </Field>
          <small className="hint lead-hint">
            {Number(form.leadDays) > 0 ? `ลูกค้าจะเห็นว่า "ส่งมอบใน ${Math.round(Number(form.leadDays))} วัน"` : "0 = พร้อมส่งทันที"}
          </small>
          <label className="checkbox">
            <input type="checkbox" checked={form.active !== false} onChange={(e) => set("active", e.target.checked)} /> เปิดขาย
          </label>
        </div>
        <div>
          <div className="field">
            <span>รูปสินค้า</span>
            <div className="image-uploader">
              <span className="image-uploader-preview">
                <ProductImage p={form} />
              </span>
              <div className="image-uploader-actions">
                <label className="btn outline small">
                  <Icon name="image" size={16} /> {uploading ? "กำลังอัปโหลด…" : form.image ? "เปลี่ยนรูป" : "อัปโหลดรูป"}
                  <input type="file" accept="image/*" hidden onChange={onImage} disabled={uploading} />
                </label>
                {form.image && (
                  <Button type="button" variant="text small" onClick={() => set("image", "")}>
                    ลบรูป
                  </Button>
                )}
              </div>
            </div>
          </div>
          <Field label="รายละเอียด">
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={600} />
          </Field>
        </div>
      </div>
      {id && (
        <Field label="หมายเหตุการปรับ (ไม่บังคับ)">
          <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={120} />
        </Field>
      )}
      <Button variant="black full" disabled={uploading || !form.name.trim()}>
        {uploading ? "กำลังอัปโหลดรูป…" : "บันทึก"}
      </Button>
    </form>
  );
}
