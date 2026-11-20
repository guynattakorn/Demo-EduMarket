// components/ShopCard.jsx
// แหล่งโค้ดจริงของ app.js — แก้ไขไฟล์ใน src/ แล้วรัน `npm run build`
import { Ea, completedLessons } from "../config/constants.js";
import { Q } from "../state/context.js";
import { Avatar, ShopLogo } from "./Avatar.jsx";
import { Button, StatusChip } from "./ui.jsx";

/** การ์ดสรุปร้านค้า (หน้าร้าน / มุมมองครู) — เดิมชื่อ Ju */
export function ShopCard({ shop, editable = false }) {
  const { data, setModal } = Q();
  const members = shop.members.map((id) => data.users.find((u) => u.id === id)).filter(Boolean);
  const allBadges = members.some((m) => completedLessons(data.progress[m.id] || []) === Ea.length);
  const earned = Ea.filter((m) => members.some((u) => (data.progress[u.id] || []).includes(m.id)));
  const xp = members.reduce((sum, m) => sum + completedLessons(data.progress[m.id] || []) * 100, 0);
  return (
    <section className="shopcard">
      <div className="shopcard-main">
        <ShopLogo shop={shop} />
        <div className="shopcard-text">
          <div className="row" style={{ flexWrap: "wrap" }}>
            <h2>{shop.name}</h2>
            <StatusChip color={members.length > 1 ? "violet" : "gray"}>{members.length > 1 ? "ร้านกลุ่ม" : "ร้านเดี่ยว"}</StatusChip>
            {allBadges && <StatusChip color="lime">เรียนครบทุกบท</StatusChip>}
          </div>
          {shop.tagline && <p className="muted">{shop.tagline}</p>}
          <div className="shopcard-members">
            {members.map((m) => (
              <span key={m.id}>
                <Avatar name={m.name} size="tiny" /> {m.name}
              </span>
            ))}
          </div>
          {(earned.length > 0 || xp > 0) && (
            <small className="shopcard-badges">
              เรียนแล้ว {earned.length}/{Ea.length} บท · {xp} XP
            </small>
          )}
        </div>
      </div>
      {editable && (
        <Button variant="link" onClick={() => setModal({ type: "shopForm", id: shop.id })}>
          จัดการร้าน
        </Button>
      )}
    </section>
  );
}
