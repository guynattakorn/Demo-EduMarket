// modals/StoreModal.jsx
// แหล่งโค้ดจริงของ app.js — แก้ไขไฟล์ใน src/ แล้วรัน `npm run build`
import { ProductCard } from "../components/ProductCard.jsx";
import { PromoChips } from "../components/PromoChips.jsx";
import { ReviewList } from "../components/ReviewList.jsx";
import { ShopCard } from "../components/ShopCard.jsx";
import { Button, EmptyState, Icon, SectionTitle } from "../components/ui.jsx";
import { Q } from "../state/context.js";

/** หน้าร้านค้า (Store) — เดิมชื่อ e1 */
export function StoreModal({ id }) {
  const { data, user, role, openChat } = Q();
  const shop = data.shops.find((s) => s.id === id);
  if (!shop) return <EmptyState>ไม่พบร้านค้า</EmptyState>;
  const products = data.products.filter((p) => p.shopId === id && p.active !== false);
  return (
    <div className="stack">
      <ShopCard shop={shop} />
      <div className="store-meta">
        <span>
          <Icon name="pin" size={15} /> {shop.boothLocation || "ยังไม่ระบุบูธ"}
        </span>
        {shop.openHours && (
          <span>
            <Icon name="clock" size={15} /> {shop.openHours}
          </span>
        )}
        <span className="muted">{data.classes.find((c) => c.id === shop.classId)?.name}</span>
      </div>
      <PromoChips shopId={id} />
      {role === "student" && !shop.members.includes(user.id) && (
        <Button variant="outline" icon="chat" onClick={() => openChat({ shopId: id })}>
          แชทกับร้าน
        </Button>
      )}
      <SectionTitle title="สินค้า" />
      {products.length ? (
        <div className="pgrid">
          {products.map((p) => (
            <ProductCard p={p} observer={role === "teacher"} key={p.id} />
          ))}
        </div>
      ) : (
        <EmptyState>ยังไม่มีสินค้า</EmptyState>
      )}
      <SectionTitle title="รีวิว" />
      <ReviewList shopId={id} />
    </div>
  );
}
