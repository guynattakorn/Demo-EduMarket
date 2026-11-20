// modals/ModalRouter.jsx
// แหล่งโค้ดจริงของ app.js — แก้ไขไฟล์ใน src/ แล้วรัน `npm run build`
import { AttachmentList } from "../components/Attachments.jsx";
import { OrderList } from "../components/OrderList.jsx";
import { Button, Chip, Modal } from "../components/ui.jsx";
import { Q } from "../state/context.js";
import { AddMemberModal } from "./AddMemberModal.jsx";
import { AnnounceModal } from "./AnnounceModal.jsx";
import { AssignmentFormModal } from "./AssignmentFormModal.jsx";
import { AssignmentModal } from "./AssignmentModal.jsx";
import { CalculatorModal } from "./CalculatorModal.jsx";
import { ClassFormModal } from "./ClassFormModal.jsx";
import { ContentFormModal } from "./ContentFormModal.jsx";
import { FeedbackModal } from "./FeedbackModal.jsx";
import { GradeModal } from "./GradeModal.jsx";
import { JoinClassModal } from "./JoinClassModal.jsx";
import { MediaViewer } from "./MediaViewer.jsx";
import { OrderDetailModal } from "./OrderDetailModal.jsx";
import { ProductDetailModal } from "./ProductDetailModal.jsx";
import { ProductFormModal } from "./ProductFormModal.jsx";
import { PromoFormModal } from "./PromoFormModal.jsx";
import { ShopFormModal } from "./ShopFormModal.jsx";
import { StoreModal } from "./StoreModal.jsx";
import { UserFormModal } from "./UserFormModal.jsx";

/** เลือก Modal ตาม modal.type — เดิมชื่อ m1 */
export function ModalRouter({ modal }) {
  const { data, setModal } = Q();
  const close = () => setModal(null);
  let title = "";
  let body = null;
  let wide = false;

  switch (modal.type) {
    case "product":
      title = "สินค้า";
      body = <ProductDetailModal id={modal.id} />;
      wide = true;
      break;
    case "store":
      title = "หน้าร้าน";
      body = <StoreModal id={modal.id} />;
      wide = true;
      break;
    case "orders":
      title = "คำสั่งซื้อ";
      body = <OrderList />;
      break;
    case "sellerOrders":
      title = "คำสั่งซื้อของร้าน";
      body = <OrderList sellerShop={modal.shopId} />;
      break;
    case "orderDetail":
      title = "คำสั่งซื้อ";
      body = <OrderDetailModal id={modal.id} />;
      break;
    case "assignment":
      title = "งาน";
      body = <AssignmentModal id={modal.id} />;
      break;
    case "content": {
      const content = data.contents.find((c) => c.id === modal.id);
      title = content?.title || "บทเรียนจากครู";
      body = (
        <>
          {content?.category && <Chip color="lime">{content.category}</Chip>}
          {content?.body && <p className="content-body pre-wrap">{content.body}</p>}
          <AttachmentList items={content?.attachments} />
          {content?.file && (
            <>
              <a className="btn link" href={content.file.data || content.file.url} download={content.file.name}>
                ดาวน์โหลด {content.file.name}
              </a>
              {content.file.type?.startsWith("image/") && <img className="lesson-attachment" src={content.file.data || content.file.url} alt={content.file.name} />}
            </>
          )}
        </>
      );
      break;
    }
    case "media":
      title = modal.title || "สื่อการสอน";
      body = <MediaViewer item={modal} />;
      wide = true;
      break;
    case "announce":
      title = "ส่งประกาศ";
      body = <AnnounceModal classId={modal.classId} />;
      break;
    case "image":
      title = "รูปภาพ";
      body = <img className="lightbox-img" src={modal.src} alt={modal.alt || "รูปภาพในแชท"} />;
      wide = true;
      break;
    case "productForm":
      title = modal.id ? "แก้ไขสินค้า" : "เพิ่มสินค้า";
      body = <ProductFormModal {...modal} />;
      wide = true;
      break;
    case "shopForm":
      title = modal.id ? "ตั้งค่าร้าน" : "เปิดร้านใหม่";
      body = <ShopFormModal {...modal} />;
      break;
    case "addMember":
      title = "เพิ่มสมาชิก";
      body = <AddMemberModal {...modal} />;
      break;
    case "promoForm":
      title = "สร้างโปรโมชัน";
      body = <PromoFormModal shopId={modal.shopId} initialType={modal.promoType} />;
      break;
    case "calculator":
      title = "คำนวณจุดคุ้มทุน";
      body = <CalculatorModal />;
      break;
    case "classForm":
      title = modal.id ? "แก้ไขห้องเรียน" : "สร้างห้องเรียน";
      body = <ClassFormModal {...modal} />;
      break;
    case "studentForm":
      title = modal.id ? "จัดการนักเรียน" : "เพิ่มนักเรียน";
      body = <UserFormModal {...modal} teacherMode={true} />;
      break;
    case "userForm":
      title = modal.id ? "แก้ไขสมาชิก" : "เพิ่มสมาชิก";
      body = <UserFormModal {...modal} />;
      break;
    case "contentForm":
      title = "เพิ่มสื่อการสอน";
      body = <ContentFormModal {...modal} />;
      break;
    case "assignForm":
      title = modal.id ? "แก้ไขงาน" : "มอบหมายงาน";
      body = <AssignmentFormModal {...modal} />;
      break;
    case "grade":
      title = "ตรวจงาน";
      body = <GradeModal {...modal} />;
      break;
    case "feedback":
      title = "ให้คะแนนร้าน";
      body = <FeedbackModal {...modal} />;
      break;
    case "join":
      title = "เข้าร่วมห้องเรียน";
      body = <JoinClassModal />;
      break;
    case "invite":
      title = "ลิงก์เชิญ";
      body = <input aria-label="ลิงก์เชิญ" readOnly value={modal.link} onFocus={(e) => e.target.select()} />;
      break;
    case "confirm":
      title = modal.title;
      body = (
        <>
          <p>{modal.body}</p>
          <div className="actions">
            <Button variant="outline" onClick={close}>
              ยกเลิก
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                modal.action();
                close();
              }}
            >
              {modal.confirmLabel || "ยืนยันลบ"}
            </Button>
          </div>
        </>
      );
      break;
    default:
      return null;
  }
  return (
    <Modal title={title} onClose={close} wide={wide} key={modal.type + (modal.id || modal.to || "")}>
      {body}
    </Modal>
  );
}
