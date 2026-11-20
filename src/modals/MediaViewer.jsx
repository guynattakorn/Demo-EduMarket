// modals/MediaViewer.jsx
// แหล่งโค้ดจริงของ app.js — แก้ไขไฟล์ใน src/ แล้วรัน `npm run build`
import { canvaEmbedUrl } from "../components/Attachments.jsx";

/** เปิดดู PDF / สไลด์ Canva ใน Modal พร้อมปุ่มดาวน์โหลด/เปิดแท็บใหม่ */
export function MediaViewer({ item }) {
  if (item.mediaType === "pdf") {
    return (
      <div className="media-viewer">
        <iframe className="media-frame" src={item.url} title={item.title} />
        <div className="media-actions">
          <a className="btn black" href={item.url} download={`${item.title || "document"}.pdf`}>
            ดาวน์โหลด PDF
          </a>
          <a className="btn outline" href={item.url} target="_blank" rel="noopener noreferrer">
            เปิดในแท็บใหม่
          </a>
        </div>
      </div>
    );
  }
  const embed = canvaEmbedUrl(item.url);
  return (
    <div className="media-viewer">
      {embed ? (
        <iframe className="media-frame canva" src={embed} title={item.title} allow="fullscreen" allowFullScreen loading="lazy" />
      ) : (
        <p className="hint">ลิงก์นี้เปิดในหน้านี้ไม่ได้</p>
      )}
      <div className="media-actions">
        <a className="btn black" href={item.url} target="_blank" rel="noopener noreferrer">
          เปิดใน Canva
        </a>
      </div>
    </div>
  );
}
