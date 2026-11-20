// pages/TeacherShopsPage.jsx
// แหล่งโค้ดจริงของ app.js — แก้ไขไฟล์ใน src/ แล้วรัน `npm run build`
import { useState } from "react";
import { ShopLogo } from "../components/Avatar.jsx";
import { ShopCard } from "../components/ShopCard.jsx";
import { ShopInsights } from "../components/ShopInsights.jsx";
import { Button, EmptyState, Icon, StatusChip } from "../components/ui.jsx";
import { ACTIVE_ORDER_STATUSES } from "../config/constants.js";
import { Q } from "../state/context.js";
import { na } from "../state/selectors.js";
import { Nt } from "../utils/format.js";

/** หน้า "ร้านนักเรียน" ของครู — เดิมชื่อ t1 */
export function TeacherShopsPage() {
  const { data, user, setModal } = Q();
  const [selectedId, setSelectedId] = useState(null);
  const classIds = data.classes.filter((c) => c.teacherId === user.id).map((c) => c.id);
  const shops = data.shops.filter((s) => classIds.includes(s.classId));
  const selected = shops.find((s) => s.id === selectedId);

  if (selected)
    return (
      <div className="teacher-shops page-enter">
        <div className="page-head">
          <Button variant="text" icon="back" onClick={() => setSelectedId(null)}>
            ทั้งหมด
          </Button>
          <div className="actions">
            <Button variant="black" icon="chat" onClick={() => setModal({ type: "feedback", shopId: selected.id })}>
              ให้คะแนน
            </Button>
          </div>
        </div>
        <ShopCard shop={selected} />
        <ShopInsights shop={selected} />
      </div>
    );

  return (
    <div className="teacher-shops page-enter">
      <div className="page-head">
        <h1>ร้านนักเรียน</h1>
      </div>
      {shops.length ? (
        <div className="tshop-grid">
          {shops.map((s) => {
            const stats = na(data, s.id);
            const pending = data.orders.filter((o) => o.shopId === s.id && ACTIVE_ORDER_STATUSES.includes(o.status)).length;
            return (
              <article className="tshop-card" key={s.id}>
                <header className="tshop-head">
                  <ShopLogo shop={s} size="small" />
                  <div className="truncate">
                    <h2 className="truncate">{s.name}</h2>
                    <small className="truncate">
                      {s.members
                        .map((id) => data.users.find((u) => u.id === id)?.name)
                        .filter(Boolean)
                        .join(" · ")}
                    </small>
                  </div>
                  <StatusChip color={s.members.length > 1 ? "violet" : "gray"}>{s.members.length > 1 ? "ร้านกลุ่ม" : "ร้านเดี่ยว"}</StatusChip>
                </header>
                <div className="tshop-stats">
                  <div>
                    <small>ยอดขาย</small>
                    <strong>฿{Nt(stats.revenue)}</strong>
                  </div>
                  <div>
                    <small>กำไร</small>
                    <strong className={stats.profit < 0 ? "error" : ""}>฿{Nt(stats.profit)}</strong>
                  </div>
                  <div>
                    <small>รีวิว</small>
                    <strong>★ {stats.rating.toFixed(1)}</strong>
                  </div>
                </div>
                <small className="muted tshop-meta">
                  <Icon name="pin" size={14} /> {s.boothLocation || "ยังไม่ระบุบูธ"} · รอส่งมอบ {pending}
                </small>
                <div className="tshop-actions">
                  <Button variant="black small" onClick={() => setSelectedId(s.id)}>
                    ดูข้อมูล
                  </Button>
                  <Button variant="outline small" onClick={() => setModal({ type: "feedback", shopId: s.id })}>
                    ให้คะแนน
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState>ยังไม่มีร้านค้า</EmptyState>
      )}
    </div>
  );
}
