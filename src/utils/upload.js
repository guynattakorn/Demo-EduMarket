// utils/upload.js
// ย่อรูปฝั่ง Client ด้วย <canvas> แล้วอัปโหลดผ่าน POST /api/upload
// (เก็บเฉพาะ URL ใน state — ไม่เก็บ Base64 ใน localStorage)

const readAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("อ่านไฟล์ไม่สำเร็จ"));
    reader.readAsDataURL(file);
  });

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("เปิดรูปภาพไม่สำเร็จ ลองใช้ไฟล์ JPG หรือ PNG"));
    img.src = src;
  });

const dataUrlBytes = (dataUrl) => Math.floor(((dataUrl.length - dataUrl.indexOf(",") - 1) * 3) / 4);

/**
 * ย่อรูปให้ด้านยาวสุด <= maxSide และบีบอัดเป็น WebP (หรือ JPEG ถ้าเบราว์เซอร์ไม่รองรับ WebP)
 * โดยพยายามให้ขนาดไม่เกิน maxBytes
 */
export async function compressImage(file, { maxSide = 1280, quality = 0.72, maxBytes = 200 * 1024 } = {}) {
  if (!file.type.startsWith("image/")) throw new Error("กรุณาเลือกไฟล์รูปภาพ");
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    let scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    let best = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      ctx.fillStyle = "#ffffff"; // flatten transparent PNGs for JPEG
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      for (let q = quality; q >= 0.4; q -= 0.12) {
        let dataUrl = canvas.toDataURL("image/webp", q);
        if (!dataUrl.startsWith("data:image/webp")) dataUrl = canvas.toDataURL("image/jpeg", q);
        best = dataUrl;
        if (dataUrlBytes(dataUrl) <= maxBytes) return { dataUrl, mimeType: dataUrl.slice(5, dataUrl.indexOf(";")), width: canvas.width, height: canvas.height };
      }
      scale *= 0.75;
    }
    return { dataUrl: best, mimeType: best.slice(5, best.indexOf(";")), width: canvas.width, height: canvas.height };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** ส่ง data URL ไปที่ /api/upload คืน URL เช่น "/uploads/abc.webp" */
export async function uploadDataUrl({ filename, mimeType, dataUrl }) {
  let res;
  try {
    res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename, mimeType, dataUrl }),
    });
  } catch {
    throw new Error("อัปโหลดไม่สำเร็จ ตรวจสอบการเชื่อมต่อเซิร์ฟเวอร์");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.ok) throw new Error(body.error || "อัปโหลดไม่สำเร็จ");
  return body;
}

const extFor = (mime) => ({ "image/webp": ".webp", "image/jpeg": ".jpg", "image/png": ".png", "application/pdf": ".pdf" })[mime] || "";

/** ย่อรูปแล้วอัปโหลด */
export async function uploadImage(file, options) {
  const { dataUrl, mimeType } = await compressImage(file, options);
  const base = (file.name || "image").replace(/\.[^.]+$/, "");
  return uploadDataUrl({ filename: base + extFor(mimeType), mimeType, dataUrl });
}

/** อัปโหลดไฟล์ PDF (ไม่เกิน 10 MB) */
export async function uploadPdf(file) {
  if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) throw new Error("กรุณาเลือกไฟล์ PDF");
  if (file.size > 10 * 1024 * 1024) throw new Error("ไฟล์ PDF ต้องมีขนาดไม่เกิน 10 MB");
  const dataUrl = await readAsDataUrl(file);
  return uploadDataUrl({ filename: file.name, mimeType: "application/pdf", dataUrl: dataUrl.replace(/^data:[^;]*;/, "data:application/pdf;") });
}
