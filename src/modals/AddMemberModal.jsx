// modals/AddMemberModal.jsx
// แหล่งโค้ดจริงของ app.js — แก้ไขไฟล์ใน src/ แล้วรัน `npm run build`
import { useState } from "react";
import { Avatar } from "../components/Avatar.jsx";
import { Button, EmptyState, Icon } from "../components/ui.jsx";
import { Q } from "../state/context.js";

/** เลือกเพื่อนนักเรียนในห้องเดียวกันมาช่วยขาย (Co-seller) */
export function AddMemberModal({ shopId }) {
  const { data, user, dispatch, toast } = Q();
  const [query, setQuery] = useState("");
  const shop = data.shops.find((s) => s.id === shopId);
  if (!shop) return <EmptyState>ไม่พบร้านค้า</EmptyState>;
  const classId = shop.classId || user.classId;
  const q = query.trim().toLowerCase();
  const classmates = data.users.filter(
    (u) => u.role === "student" && u.classId === classId && (!q || u.name.toLowerCase().includes(q)),
  );
  return (
    <div className="stack">
      <label className="chat-search">
        <Icon name="search" size={16} />
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ค้นหาชื่อเพื่อน" aria-label="ค้นหาชื่อเพื่อน" autoFocus />
      </label>
      <div className="member-pick-list">
        {classmates.map((u) => {
          const inTeam = shop.members.includes(u.id);
          return (
            <div className="member-pick" key={u.id}>
              <Avatar name={u.name} size="small" />
              <span className="truncate">
                <strong>{u.name}</strong>
                <small>{data.shops.filter((s) => s.members.includes(u.id)).length} ร้าน</small>
              </span>
              {inTeam ? (
                <span className="status-chip green">อยู่ในทีม</span>
              ) : (
                <Button
                  variant="black small"
                  onClick={() => {
                    dispatch({ type: "SHOP_MEMBER_ADD", shopId, userId: u.id, by: user.id });
                    toast(`เพิ่ม ${u.name} เข้าทีมแล้ว และส่งแจ้งเตือนให้เพื่อน`);
                  }}
                >
                  เพิ่ม
                </Button>
              )}
            </div>
          );
        })}
        {!classmates.length && <EmptyState>ไม่พบเพื่อนในห้องเรียนเดียวกัน</EmptyState>}
      </div>
    </div>
  );
}
