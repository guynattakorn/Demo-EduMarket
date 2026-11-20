// components/Attachments.jsx
// สื่อการสอนของครู: PDF (อัปโหลดผ่าน /api/upload) และลิงก์ Canva
import { useState } from "react";
import { Q } from "../state/context.js";
import { St } from "../utils/format.js";
import { uploadPdf } from "../utils/upload.js";
import { Button, Icon } from "./ui.jsx";

export const isCanvaUrl = (url) => /^https:\/\/([\w-]+\.)*canva\.(com|link)\//i.test(String(url || "").trim());

/** ลิงก์ Canva แบบ embed (ใช้ได้กับลิงก์ .../view) */
export function canvaEmbedUrl(url) {
  try {
    const u = new URL(url);
    if (!/canva\.com$/i.test(u.hostname.replace(/^www\./, "")) || !/\/view/.test(u.pathname)) return null;
    u.searchParams.set("embed", "");
    return u.toString().replace("embed=", "embed");
  } catch {
    return null;
  }
}

/** ปุ่มเปิดสื่อแยกตามประเภท */
export function AttachmentList({ items }) {
  const { setModal } = Q();
  if (!items?.length) return null;
  return (
    <div className="attach-list">
      {items.map((a) =>
        a.type === "image" ? (
          <button className="attach-btn image" onClick={() => setModal({ type: "image", src: a.url, alt: a.title })} key={a.id}>
            <Icon name="image" size={16} /> <span className="truncate">{a.title || "รูปภาพ"}</span>
          </button>
        ) : (
          <button className={"attach-btn " + a.type} onClick={() => setModal({ ...a, type: "media", mediaType: a.type })} key={a.id}>
            <span className="attach-kind">{a.type === "pdf" ? "PDF" : "Canva"}</span>
            <span className="truncate">{a.title}</span>
          </button>
        ),
      )}
    </div>
  );
}

/** ตัวแก้ไขรายการสื่อแนบในฟอร์มของครู */
export function AttachmentEditor({ value, onChange }) {
  const { toast } = Q();
  const [uploading, setUploading] = useState(false);
  const [canvaOpen, setCanvaOpen] = useState(false);
  const [canvaTitle, setCanvaTitle] = useState("");
  const [canvaUrl, setCanvaUrl] = useState("");
  const items = value || [];

  const addPdf = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadPdf(file);
      onChange([...items, { id: St("att"), type: "pdf", title: file.name.replace(/\.pdf$/i, ""), url: res.url }]);
      toast("แนบไฟล์ PDF แล้ว");
    } catch (err) {
      toast(err.message);
    } finally {
      setUploading(false);
    }
  };
  const addCanva = () => {
    if (!isCanvaUrl(canvaUrl)) return toast("ใส่ลิงก์ Canva ที่ขึ้นต้นด้วย https://www.canva.com/");
    onChange([...items, { id: St("att"), type: "canva", title: canvaTitle.trim() || "สไลด์ Canva", url: canvaUrl.trim() }]);
    setCanvaTitle("");
    setCanvaUrl("");
    setCanvaOpen(false);
  };

  return (
    <div className="field attach-editor">
      <span>ไฟล์แนบ</span>
      {items.length > 0 && (
        <ul className="attach-editor-list">
          {items.map((a) => (
            <li key={a.id}>
              <span className={"attach-kind " + a.type}>{a.type === "pdf" ? "PDF" : a.type === "canva" ? "Canva" : "รูป"}</span>
              <span className="truncate">{a.title}</span>
              <button type="button" className="team-remove" aria-label={"ลบ " + a.title} onClick={() => onChange(items.filter((x) => x.id !== a.id))}>
                <Icon name="close" size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="attach-editor-actions">
        <label className={"btn outline small" + (uploading ? " is-busy" : "")}>
          {uploading ? "กำลังอัปโหลด…" : "แนบ PDF"}
          <input type="file" accept="application/pdf,.pdf" hidden onChange={addPdf} disabled={uploading} />
        </label>
        <Button type="button" variant="outline small" icon="link" onClick={() => setCanvaOpen(!canvaOpen)}>
          แนบลิงก์ Canva
        </Button>
      </div>
      {canvaOpen && (
        <div className="canva-form">
          <input value={canvaTitle} onChange={(e) => setCanvaTitle(e.target.value)} placeholder="ชื่อสื่อ เช่น สไลด์ต้นทุนคงที่" aria-label="ชื่อสื่อ Canva" maxLength={60} />
          <input value={canvaUrl} onChange={(e) => setCanvaUrl(e.target.value)} placeholder="https://www.canva.com/design/.../view" aria-label="ลิงก์ Canva" inputMode="url" />
          <Button type="button" variant="black small" onClick={addCanva} disabled={!canvaUrl.trim()}>
            เพิ่มลิงก์
          </Button>
        </div>
      )}
    </div>
  );
}
