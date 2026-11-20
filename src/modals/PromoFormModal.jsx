// modals/PromoFormModal.jsx
// แหล่งโค้ดจริงของ app.js — แก้ไขไฟล์ใน src/ แล้วรัน `npm run build`
import { useState } from "react";
import { promoValueText } from "../components/PromoChips.jsx";
import { Button, EmptyState, Field, Icon } from "../components/ui.jsx";
import { unitDiscount } from "../lib/pricing.js";
import { Q } from "../state/context.js";
import { Nt, St } from "../utils/format.js";

const TYPES = [
  ["discount", "ส่วนลดรายสินค้า", "ลดราคาสินค้าที่เลือกเป็น % หรือ ฿"],
  ["voucher", "คูปองซื้อครบลด", "ลดอัตโนมัติในตะกร้าเมื่อซื้อครบยอด"],
  ["code", "โค้ดส่วนลด", "ผู้ซื้อกรอกโค้ดในตะกร้า"],
];

/** สร้างโปรโมชันของร้าน (3 รูปแบบ) พร้อมคำเตือนขายต่ำกว่าทุน */
export function PromoFormModal({ shopId, initialType = "discount" }) {
  const { data, user, dispatch, setModal, toast } = Q();
  const shop = data.shops.find((s) => s.id === shopId);
  const products = data.products.filter((p) => p.shopId === shopId);
  const [type, setType] = useState(initialType);
  const [form, setForm] = useState({
    title: "",
    productIds: [],
    discountType: "percent",
    value: 10,
    minSpend: 100,
    code: "",
    maxUses: 20,
    expiresAt: "",
    broadcast: true,
  });
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  if (!shop) return <EmptyState>ไม่พบร้านค้า</EmptyState>;

  const value = Number(form.value) || 0;
  const code = form.code.trim().toUpperCase();
  const codeTaken = type === "code" && data.promotions.some((p) => p.shopId === shopId && p.type === "code" && !p.deleted && String(p.code).toUpperCase() === code);

  // Business learning guardrail: discounted price below unit cost.
  const lossWarnings =
    type === "discount"
      ? products
          .filter((p) => form.productIds.includes(p.id) && p.cost !== null && p.cost !== undefined && p.cost !== "")
          .map((p) => {
            const after = Math.round((p.price - unitDiscount({ discountType: form.discountType, value }, p.price)) * 100) / 100;
            return { p, after, loss: Math.round((Number(p.cost) - after) * 100) / 100 };
          })
          .filter((w) => w.after < Number(w.p.cost))
      : [];

  const errors = [];
  if (value <= 0) errors.push("ระบุมูลค่าส่วนลดมากกว่า 0");
  if (form.discountType === "percent" && value > 100) errors.push("ส่วนลดเปอร์เซ็นต์ต้องไม่เกิน 100%");
  if (type === "discount" && !form.productIds.length) errors.push("เลือกสินค้าอย่างน้อย 1 ชิ้น");
  if ((type === "voucher" || type === "code") && Number(form.minSpend) < 0) errors.push("ยอดขั้นต่ำต้องไม่ติดลบ");
  if (type === "voucher" && !(Number(form.minSpend) > 0)) errors.push("ระบุยอดซื้อขั้นต่ำ");
  if (type === "code" && !/^[A-Z0-9]{3,20}$/.test(code)) errors.push("โค้ดใช้ A-Z และ 0-9 ยาว 3–20 ตัว");
  if (codeTaken) errors.push("โค้ดนี้มีอยู่แล้วในร้าน");

  const autoTitle =
    type === "discount"
      ? `${promoValueText({ discountType: form.discountType, value })} สินค้าที่ร่วมรายการ`
      : type === "voucher"
        ? `ซื้อครบ ฿${Nt(Number(form.minSpend) || 0)} ${promoValueText({ discountType: form.discountType, value })}`
        : `โค้ด ${code || "..."} ${promoValueText({ discountType: form.discountType, value })}`;

  const submit = (e) => {
    e.preventDefault();
    if (errors.length) return;
    const item = {
      id: St("promo"),
      shopId,
      type,
      title: form.title.trim() || autoTitle,
      productIds: type === "discount" ? form.productIds : [],
      discountType: form.discountType,
      value,
      minSpend: type === "discount" ? 0 : Number(form.minSpend) || 0,
      code: type === "code" ? code : null,
      maxUses: type === "code" ? Math.max(0, Math.round(Number(form.maxUses) || 0)) : 0,
      expiresAt: form.expiresAt || null,
    };
    dispatch({ type: "PROMO_SAVE", item, broadcast: form.broadcast, summary: autoTitle, user: user.id });
    toast(form.broadcast ? "สร้างโปรโมชันและส่งแจ้งเตือนแล้ว" : "สร้างโปรโมชันแล้ว");
    setModal(null);
  };

  return (
    <form className="stack promo-form" onSubmit={submit}>
      <div className="promo-type-grid" role="radiogroup" aria-label="รูปแบบโปรโมชัน">
        {TYPES.map(([key, label, hint]) => (
          <button type="button" role="radio" aria-checked={type === key} className={"promo-type" + (type === key ? " selected" : "")} onClick={() => setType(key)} key={key}>
            <strong>{label}</strong>
            <small>{hint}</small>
          </button>
        ))}
      </div>

      {type === "discount" && (
        <div className="field">
          <span>เลือกสินค้า</span>
          <div className="promo-products">
            {products.map((p) => (
              <label className="checkbox promo-product" key={p.id}>
                <input
                  type="checkbox"
                  checked={form.productIds.includes(p.id)}
                  onChange={(e) => set("productIds", e.target.checked ? [...form.productIds, p.id] : form.productIds.filter((x) => x !== p.id))}
                />
                <span className="truncate">{p.name}</span>
                <small>
                  ฿{Nt(p.price)}
                  {p.cost !== null && p.cost !== undefined && p.cost !== "" ? ` · ทุน ฿${Nt(Number(p.cost))}` : ""}
                </small>
              </label>
            ))}
            {!products.length && <EmptyState>ยังไม่มีสินค้าในร้าน</EmptyState>}
          </div>
        </div>
      )}

      {type === "code" && (
        <Field label="รหัสโค้ด">
          <input value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} placeholder="เช่น LUNCH10" maxLength={20} autoCapitalize="characters" />
        </Field>
      )}

      <div className="two-col">
        <Field label="ประเภทส่วนลด">
          <select value={form.discountType} onChange={(e) => set("discountType", e.target.value)}>
            <option value="percent">เปอร์เซ็นต์ (%)</option>
            <option value="amount">จำนวนเงิน (฿)</option>
          </select>
        </Field>
        <Field label={form.discountType === "percent" ? "ลดกี่ %" : "ลดกี่บาท"}>
          <input type="number" min="1" step="1" inputMode="decimal" value={form.value} onChange={(e) => set("value", e.target.value)} />
        </Field>
      </div>

      {(type === "voucher" || type === "code") && (
        <div className="two-col">
          <Field label="ยอดซื้อขั้นต่ำของร้าน (฿)">
            <input type="number" min="0" step="1" inputMode="decimal" value={form.minSpend} onChange={(e) => set("minSpend", e.target.value)} />
          </Field>
          {type === "code" && (
            <Field label="จำนวนสิทธิ์ (0 = ไม่จำกัด)">
              <input type="number" min="0" step="1" inputMode="numeric" value={form.maxUses} onChange={(e) => set("maxUses", e.target.value)} />
            </Field>
          )}
        </div>
      )}

      <div className="two-col">
        <Field label="ชื่อโปรโมชัน (ไม่บังคับ)">
          <input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder={autoTitle} maxLength={60} />
        </Field>
        <Field label="วันหมดอายุ (ไม่บังคับ)">
          <input type="date" value={form.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} />
        </Field>
      </div>

      {lossWarnings.map((w) => (
        <div className="loss-warning" role="alert" key={w.p.id}>
          <Icon name="alert" size={16} /> {w.p.name}: ราคาหลังลด (฿{Nt(w.after)}) ต่ำกว่าต้นทุนต่อชิ้น (฿{Nt(Number(w.p.cost))}) ร้านจะขาดทุนชิ้นละ ฿{Nt(w.loss)}
        </div>
      ))}

      <label className="checkbox">
        <input type="checkbox" checked={form.broadcast} onChange={(e) => set("broadcast", e.target.checked)} /> แจ้งเตือนเพื่อนในโรงเรียน
      </label>

      {errors.length > 0 && <small className="error">{errors[0]}</small>}
      <Button variant="black full" disabled={errors.length > 0}>
        สร้างโปรโมชัน
      </Button>
    </form>
  );
}
