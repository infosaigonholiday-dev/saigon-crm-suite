import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BookOpen, Shield, Users, Briefcase, GraduationCap,
  Route as RouteIcon, Calculator, Megaphone, Map,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];
const HR_ROLES = ["HR_MANAGER", "HCNS"];
const OPS_ROLES = ["DIEUHAN", "INTERN_DIEUHAN"];
const SALES_MGR_ROLES = ["GDKD", "MANAGER"];
const SALES_ROLES = ["SALE_DOMESTIC", "SALE_INBOUND", "SALE_OUTBOUND", "SALE_MICE"];
const INTERN_ROLES = ["INTERN_SALE_DOMESTIC", "INTERN_SALE_OUTBOUND", "INTERN_SALE_MICE", "INTERN_SALE_INBOUND"];
const KETOAN_ROLES = ["KETOAN"];
const MKT_ROLES = ["MARKETING"];
const HDV_ROLES = ["TOUR_GUIDE"];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-base text-foreground">{title}</h3>
      <div className="text-sm text-muted-foreground space-y-1.5 leading-relaxed">{children}</div>
    </div>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex gap-2 items-start">
      <Badge variant="secondary" className="shrink-0 mt-0.5">{n}</Badge>
      <span>{text}</span>
    </div>
  );
}

function Workflow({ title, icon, steps }: { title: string; icon: React.ReactNode; steps: string[] }) {
  return (
    <Section title={title}>
      {steps.map((s, i) => <Step key={i} n={i + 1} text={s} />)}
    </Section>
  );
}

function PushNotifGuide() {
  return (
    <Section title="🔔 Bật thông báo trên thiết bị (BẮT BUỘC)">
      <p className="font-medium text-foreground">Cách 1 — Nhanh nhất (khuyến nghị):</p>
      <Step n={1} text="Trên thanh đầu trang (Header), nhìn icon hình chuông gạch (🔕) cạnh chuông thông báo" />
      <Step n={2} text="Nhấn vào icon → Trình duyệt hỏi quyền → Chọn 'Cho phép' (Allow)" />
      <Step n={3} text="Khi chuyển thành chuông xanh (🔔) với chấm xanh là đã bật xong" />

      <p className="font-medium text-foreground mt-3">Cách 2 — Từ Hồ sơ cá nhân:</p>
      <Step n={1} text="Vào icon avatar góc phải → Hồ sơ cá nhân (hoặc Cài đặt)" />
      <Step n={2} text="Tìm thẻ 'Thông báo Web Push' → Gạt công tắc sang BẬT" />

      <p className="font-medium text-foreground mt-3">Lưu ý quan trọng:</p>
      <Step n={1} text="Bật RIÊNG trên MỖI thiết bị (laptop công ty, laptop cá nhân, điện thoại...) — push không đồng bộ giữa thiết bị" />
      <Step n={2} text="Trên iPhone/iPad: Mở Safari → Share → 'Thêm vào màn hình chính' → Mở app từ icon đó MỚI bật được" />
      <Step n={3} text="Nếu đang xem trong iframe (lovable.dev) → nhấn 'Mở trong tab mới' trước" />
      <Step n={4} text="Nếu trình duyệt báo 'Đã chặn' → mở 🔒 cạnh thanh địa chỉ → đổi Notifications thành 'Cho phép' → tải lại trang" />
      <Step n={5} text="MỌI vai trò (kể cả Intern, Sale, HR, Kế toán) đều có thể bật" />
    </Section>
  );
}

function EscalationPolicyGuide() {
  return (
    <Section title="⚠️ Chính sách cảnh báo & leo thang (Quản lý)">
      <p className="text-foreground font-medium">Cấp độ cảnh báo:</p>
      <Step n={1} text="Cấp 0 (Bình thường): Thông báo gửi đến nhân viên phụ trách" />
      <Step n={2} text="Cấp 1 (Leo thang): Sau 3 ngày nhân viên không đọc → Hệ thống TỰ ĐỘNG báo cho Trưởng phòng/GDKD cùng phòng ban" />

      <p className="text-foreground font-medium mt-3">Các loại cảnh báo tự động (chạy 07:00 mỗi ngày):</p>
      <Step n={1} text="🎂 Sinh nhật KH cá nhân / B2B / nhân viên (T-3 → hôm nay)" />
      <Step n={2} text="🏢 Kỷ niệm thành lập công ty KH (T-7 → hôm nay)" />
      <Step n={3} text="📞 Follow-up Lead hôm nay & quá hạn" />
      <Step n={4} text="⚠️ Lead bị bỏ quên >7 ngày (sau 14 ngày báo cả Manager)" />
      <Step n={5} text="✈️ Booking sắp khởi hành (T-7, T-3, T-1 = ưu tiên cao nhất)" />
      <Step n={6} text="💰 Hạn đặt cọc / thanh toán cuối (≤3 ngày)" />
      <Step n={7} text="📄 Hợp đồng DRAFT chờ duyệt >2 ngày" />
      <Step n={8} text="📋 Báo giá đã gửi >5 ngày chưa phản hồi" />
      <Step n={9} text="📑 HĐLĐ nhân viên sắp hết hạn (T-30, T-7)" />

      <p className="text-foreground font-medium mt-3">Quản lý cần làm gì:</p>
      <Step n={1} text="Khi nhận noti '⚠️ X có N cảnh báo chưa đọc' → Liên hệ trực tiếp nhân viên đó" />
      <Step n={2} text="Theo dõi tỷ lệ đọc của team định kỳ" />
    </Section>
  );
}

function LeaveNotificationGuide() {
  return (
    <Section title="📋 Thông báo Đơn xin nghỉ phép (Real-time)">
      <p className="text-foreground font-medium">Khi nhân viên gửi đơn:</p>
      <Step n={1} text="HR (HR_MANAGER, HCNS) + Admin nhận thông báo NGAY LẬP TỨC (real-time + Web Push)" />
      <Step n={2} text="Trưởng phòng/GDKD cùng phòng ban với nhân viên cũng nhận thông báo" />
      <Step n={3} text="Nhấn chuông thông báo → Click vào đơn → Tự động chuyển đến trang Quản lý nghỉ phép" />

      <p className="text-foreground font-medium mt-3">Khi quản lý duyệt/từ chối:</p>
      <Step n={1} text="Nhân viên tạo đơn TỰ ĐỘNG nhận thông báo kết quả (real-time + Web Push)" />
      <Step n={2} text="Nội dung noti hiển thị: ngày bắt đầu, ngày kết thúc, trạng thái" />
    </Section>
  );
}

/* ═══════════════ ADMIN ═══════════════ */
function AdminGuide() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-5 w-5 text-primary" />
          Quản trị hệ thống
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Workflow title="Tạo tài khoản nhân viên mới" icon={null} steps={[
          "Vào Cài đặt → Tab 'Tài khoản'",
          "Nhấn 'Tạo tài khoản' → Điền Email nhân viên",
          "Chọn Vai trò phù hợp (hệ thống gợi ý theo chức vụ)",
          "Chọn Phòng ban → Nhấn Tạo",
          "Nhân viên nhận email mời, đăng nhập lần đầu sẽ đổi mật khẩu",
        ]} />
        <Workflow title="Tạo hồ sơ nhân viên" icon={null} steps={[
          "Vào Nhân sự → Nhấn 'Thêm nhân viên'",
          "Điền: Họ tên, Email (trùng với tài khoản), Phòng ban, Chức vụ, Ngày vào làm",
          "Nhấn Lưu → Hệ thống tự tạo mã nhân viên (SHT-xxx)",
          "Vào hồ sơ nhân viên → Tab 'Vai trò' → Chọn Profile ID tương ứng để liên kết",
        ]} />
        <Workflow title="Quản lý phòng ban" icon={null} steps={[
          "Vào Cài đặt → Tab 'Phòng ban'",
          "Thêm mới hoặc sửa phòng ban",
          "Gán Trưởng phòng cho từng phòng ban",
        ]} />
        <Workflow title="Phân quyền" icon={null} steps={[
          "Vào Cài đặt → Tab 'Phân quyền'",
          "Chọn vai trò cần chỉnh sửa",
          "Bật/tắt quyền truy cập từng module",
        ]} />
        <Workflow title="Xem nhật ký xóa" icon={null} steps={[
          "Vào Cài đặt → Tab 'Nhật ký'",
          "Xem lịch sử: ai xóa gì, bảng nào, thời gian nào",
        ]} />
        <Workflow title="Xuất dữ liệu khách hàng" icon={null} steps={[
          "Vào Khách hàng → Nhấn nút 'Xuất CSV' phía trên bảng",
          "File CSV tải về máy, mở được bằng Excel / Google Sheet",
        ]} />
        <Workflow title="Xem Dashboard CEO" icon={null} steps={[
          "Vào Tổng quan (trang chủ)",
          "Xem biểu đồ doanh thu, KH mới trong tháng, tỷ lệ chuyển đổi Lead → KH",
          "Xem danh sách Top KH theo doanh thu và KH cần chăm sóc lại",
        ]} />
        <PushNotifGuide />
      </CardContent>
    </Card>
  );
}

/* ═══════════════ HCNS ═══════════════ */
function HCNSGuide() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-primary" />
          Nhân sự & Hành chính
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Workflow title="Tạo hồ sơ nhân viên mới" icon={null} steps={[
          "Vào Nhân sự → Nhấn 'Thêm nhân viên'",
          "Điền: Họ tên, Email, Phòng ban, Chức vụ, Ngày vào làm",
          "Nhấn Lưu → Mã nhân viên tự động tạo",
        ]} />
        <Workflow title="Cập nhật hồ sơ nhân viên" icon={null} steps={[
          "Vào Nhân sự → Chọn nhân viên cần sửa",
          "Chỉnh sửa thông tin cá nhân, hợp đồng LĐ, bảo hiểm",
          "Nhấn Lưu để cập nhật",
        ]} />
        <Workflow title="Quản lý nghỉ phép" icon={null} steps={[
          "Vào Nghỉ phép → Xem danh sách đơn nghỉ",
          "Tạo đơn nghỉ mới hoặc duyệt đơn nghỉ của nhân viên",
          "Theo dõi số ngày phép còn lại",
        ]} />
        <Workflow title="Tạo bảng lương" icon={null} steps={[
          "Vào Bảng lương → Nhấn 'Thêm phiếu lương'",
          "Chọn nhân viên → Nhập lương cơ bản, phụ cấp, khấu trừ",
          "Kiểm tra tổng lương → Nhấn Lưu",
        ]} />
        <Workflow title="Nhập chi phí phòng ban" icon={null} steps={[
          "Vào Tài chính → Nhấn 'Tạo phiếu chi'",
          "Điền nội dung chi, số tiền, đính kèm chứng từ",
          "Gửi duyệt → HR_MANAGER duyệt lần 1 → Kế toán duyệt lần 2",
        ]} />
        <Workflow title="Xem hợp đồng" icon={null} steps={[
          "Vào Hợp đồng → Xem danh sách hợp đồng",
          "Tạo hoặc sửa hợp đồng lao động cho nhân viên",
        ]} />
        <Workflow title="Tra cứu thanh toán & nhà cung cấp" icon={null} steps={[
          "Vào Thanh toán hoặc Nhà cung cấp",
          "Tìm kiếm thông tin cần thiết",
        ]} />
        <PushNotifGuide />
      </CardContent>
    </Card>
  );
}

/* ═══════════════ ĐIỀU HÀNH ═══════════════ */
function OpsGuide() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <RouteIcon className="h-5 w-5 text-primary" />
          Vận hành Tour
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Workflow title="Nhận booking từ Sale" icon={null} steps={[
          "Vào Đặt tour → Xem danh sách booking",
          "Chọn booking cần xử lý → Kiểm tra thông tin KH, số khách, ngày đi",
        ]} />
        <Workflow title="Lập lịch trình tour" icon={null} steps={[
          "Vào Đặt tour → Chọn booking → Tab 'Lịch trình'",
          "Thêm hoạt động cho từng ngày: điểm đến, giờ, phương tiện",
          "Sắp xếp thứ tự các hoạt động → Nhấn Lưu",
        ]} />
        <Workflow title="Tạo dự toán chi phí" icon={null} steps={[
          "Vào Tài chính → Tab 'Dự toán' → Nhấn 'Tạo mới'",
          "Chọn booking → Liệt kê từng hạng mục chi phí dự kiến",
          "Điền nhà cung cấp, số lượng, đơn giá → Nhấn 'Gửi duyệt'",
        ]} />
        <Workflow title="Quyết toán sau tour" icon={null} steps={[
          "Vào Tài chính → Tab 'Quyết toán' → Nhấn 'Tạo mới'",
          "Chọn dự toán đã duyệt → Nhập chi phí thực tế cho từng hạng mục",
          "Hệ thống tự tính chênh lệch → Gửi duyệt",
        ]} />
        <Workflow title="Duyệt hợp đồng" icon={null} steps={[
          "Vào Hợp đồng → Chọn HĐ có trạng thái 'Chờ duyệt'",
          "Xem chi tiết → Nhấn Duyệt hoặc Từ chối",
        ]} />
        <Workflow title="Tạo khách hàng mới" icon={null} steps={[
          "Vào Khách hàng → Nhấn 'Thêm mới'",
          "Điền tên, SĐT, email → Lưu (cho KH đặt trực tiếp với Điều hành)",
        ]} />
        <Workflow title="Tra cứu nhà cung cấp" icon={null} steps={[
          "Vào Nhà cung cấp → Tìm khách sạn, xe, nhà hàng phù hợp",
          "Xem thông tin liên hệ, địa chỉ, ghi chú",
        ]} />
        <Workflow title="Xin nghỉ phép" icon={null} steps={[
          "Vào Nghỉ phép → Nhấn 'Tạo đơn nghỉ'",
          "Chọn ngày nghỉ, lý do → Gửi đơn → Chờ duyệt",
        ]} />
        <PushNotifGuide />
      </CardContent>
    </Card>
  );
}

/* ═══════════════ GDKD & MANAGER ═══════════════ */
function SalesMgrGuide() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Briefcase className="h-5 w-5 text-primary" />
          Quản lý Kinh doanh
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Workflow title="Quản lý khách hàng phòng ban" icon={null} steps={[
          "Vào Khách hàng → Xem danh sách KH trong phòng ban",
          "Tạo KH mới hoặc sửa KH do mình phụ trách",
        ]} />
        <Workflow title="Quản lý leads" icon={null} steps={[
          "Vào Tiềm năng → Tạo lead mới hoặc xem lead trong phòng",
          "Phân công lead cho nhân viên → Theo dõi tiến độ chuyển đổi",
        ]} />
        <Workflow title="Tạo & duyệt booking" icon={null} steps={[
          "Vào Đặt tour → Tạo booking mới → Chọn KH, tour, ngày đi",
          "Sửa chi tiết booking khi cần",
          "GDKD: Duyệt booking của nhân viên trong phòng",
        ]} />
        <Workflow title="Tạo báo giá" icon={null} steps={[
          "Vào Báo giá → Nhấn 'Tạo mới'",
          "Chọn tour, điền giá, điều khoản → Gửi cho khách hàng",
        ]} />
        <Workflow title="Duyệt hợp đồng" icon={null} steps={[
          "Vào Hợp đồng → Chọn HĐ trạng thái 'Chờ duyệt'",
          "Xem chi tiết → Duyệt hoặc Từ chối",
        ]} />
        <Workflow title="Duyệt nghỉ phép nhân viên" icon={null} steps={[
          "Vào Nghỉ phép → Xem danh sách đơn nghỉ của nhân viên phòng ban",
          "Chọn đơn → Duyệt hoặc Từ chối",
        ]} />
        <Workflow title="Gửi chi phí" icon={null} steps={[
          "Vào Tài chính → Tạo phiếu chi → Điền nội dung, số tiền",
          "Gửi duyệt → Chờ Kế toán duyệt",
        ]} />
        <PushNotifGuide />
      </CardContent>
    </Card>
  );
}

/* ═══════════════ SALE ═══════════════ */
function SalesGuide() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Briefcase className="h-5 w-5 text-primary" />
          Bán tour
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Workflow title="Tạo khách hàng mới" icon={null} steps={[
          "Vào Khách hàng → Nhấn 'Thêm mới'",
          "Điền tên, SĐT, email, nguồn khách → Nhấn Lưu",
        ]} />
        <Workflow title="Sửa thông tin khách hàng" icon={null} steps={[
          "Vào Khách hàng → Chọn KH cần sửa",
          "Cập nhật thông tin liên hệ, ghi chú → Nhấn Lưu",
        ]} />
        <Workflow title="Nhập lead mới" icon={null} steps={[
          "Vào Tiềm năng → Nhấn 'Thêm mới'",
          "Điền thông tin KH tiềm năng, nguồn, nhu cầu tour",
          "Cập nhật trạng thái lead khi có tiến triển",
        ]} />
        <Workflow title="Tạo booking" icon={null} steps={[
          "Vào Đặt tour → Nhấn 'Tạo mới'",
          "Chọn KH, tour, ngày đi, số khách → Nhấn Lưu",
        ]} />
        <Workflow title="Tạo báo giá" icon={null} steps={[
          "Vào Báo giá → Nhấn 'Tạo mới'",
          "Chọn tour, điền giá, điều kiện → Gửi cho KH",
        ]} />
        <Workflow title="Xem hợp đồng" icon={null} steps={[
          "Vào Hợp đồng → Xem HĐ của KH mình phụ trách",
          "Kiểm tra trạng thái HĐ, giá trị, điều khoản",
        ]} />
        <Workflow title="Xem thanh toán" icon={null} steps={[
          "Vào Thanh toán → Kiểm tra tình trạng thanh toán của KH",
        ]} />
        <Workflow title="Xin nghỉ phép" icon={null} steps={[
          "Vào Nghỉ phép → Nhấn 'Tạo đơn nghỉ'",
          "Chọn ngày, lý do → Gửi đơn → Chờ trưởng phòng duyệt",
        ]} />
        <PushNotifGuide />
      </CardContent>
    </Card>
  );
}

/* ═══════════════ THỰC TẬP SINH ═══════════════ */
function InternGuide() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <GraduationCap className="h-5 w-5 text-primary" />
          Học việc Kinh doanh
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Workflow title="Tạo khách hàng mới" icon={null} steps={[
          "Vào Khách hàng → Nhấn 'Thêm mới'",
          "Điền đầy đủ: tên, SĐT, email, nguồn → Nhấn Lưu",
        ]} />
        <Workflow title="Cập nhật KH của mình" icon={null} steps={[
          "Vào Khách hàng → Chọn KH mình đã tạo",
          "Sửa thông tin liên hệ, ghi chú → Nhấn Lưu",
        ]} />
        <Workflow title="Nhập lead mới" icon={null} steps={[
          "Vào Tiềm năng → Nhấn 'Thêm mới'",
          "Điền thông tin KH tiềm năng → Theo dõi trạng thái",
        ]} />
        <Workflow title="Tạo booking" icon={null} steps={[
          "Vào Đặt tour → Nhấn 'Tạo mới'",
          "Chọn KH của mình, tour, ngày đi → Nhấn Lưu",
        ]} />
        <Workflow title="Xin nghỉ phép" icon={null} steps={[
          "Vào Nghỉ phép → Nhấn 'Tạo đơn nghỉ'",
          "Chọn ngày, lý do → Gửi đơn",
        ]} />
        <Workflow title="Đọc quy trình (SOP)" icon={null} steps={[
          "Vào Quy trình → Xem tài liệu hướng dẫn của phòng ban",
          "Đọc kỹ quy trình trước khi thực hiện công việc",
        ]} />
        <PushNotifGuide />
      </CardContent>
    </Card>
  );
}

/* ═══════════════ KẾ TOÁN ═══════════════ */
function KetoanGuide() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="h-5 w-5 text-primary" />
          Quản lý Tài chính
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Workflow title="Quản lý thanh toán" icon={null} steps={[
          "Vào Thanh toán → Tạo phiếu thu/chi mới hoặc sửa phiếu hiện có",
          "Điền nội dung, số tiền, phương thức thanh toán",
          "Theo dõi công nợ khách hàng và nhà cung cấp",
        ]} />
        <Workflow title="Tạo & kiểm tra bảng lương" icon={null} steps={[
          "Vào Bảng lương → Tạo hoặc sửa phiếu lương",
          "Kiểm tra lương cơ bản, phụ cấp, khấu trừ → Chốt lương",
        ]} />
        <Workflow title="Duyệt chi phí (lần 2)" icon={null} steps={[
          "Vào Tài chính → Tab chi phí → Xem phiếu chi đã được HR_MANAGER duyệt lần 1",
          "Kiểm tra chứng từ → Nhấn 'Duyệt' hoặc 'Từ chối'",
        ]} />
        <Workflow title="Xem báo cáo tài chính" icon={null} steps={[
          "Vào Tài chính → Chọn tab báo cáo cần xem",
          "Xem doanh thu, chi phí, lợi nhuận, dòng tiền theo tháng/quý",
        ]} />
        <Workflow title="Quản lý nhà cung cấp" icon={null} steps={[
          "Vào Nhà cung cấp → Tạo mới hoặc sửa thông tin NCC",
          "Cập nhật SĐT, email, ghi chú thanh toán",
        ]} />
        <Workflow title="Đối chiếu hợp đồng" icon={null} steps={[
          "Vào Hợp đồng → Xem chi tiết HĐ",
          "So sánh giá trị HĐ với thanh toán thực tế",
        ]} />
        <Workflow title="Xin nghỉ phép" icon={null} steps={[
          "Vào Nghỉ phép → Tạo đơn nghỉ → Gửi duyệt",
        ]} />
        <PushNotifGuide />
      </CardContent>
    </Card>
  );
}

/* ═══════════════ MKT & HDV ═══════════════ */
function MktHdvGuide() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Megaphone className="h-5 w-5 text-primary" />
          Marketing & Hướng dẫn viên
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Section title="Marketing">
          <Workflow title="Quản lý leads" icon={null} steps={[
            "Vào Tiềm năng → Tạo lead mới từ các nguồn (Facebook, Google, referral...)",
            "Sửa thông tin lead → Cập nhật trạng thái chuyển đổi",
            "Theo dõi nguồn khách nào hiệu quả nhất",
          ]} />
          <Workflow title="Xin nghỉ phép" icon={null} steps={[
            "Vào Nghỉ phép → Tạo đơn nghỉ → Gửi duyệt",
          ]} />
        </Section>

        <Section title="Hướng dẫn viên">
          <Workflow title="Xem booking được phân công" icon={null} steps={[
            "Vào Đặt tour → Xem booking/lịch trình tour được giao",
            "Kiểm tra chi tiết: điểm đến, giờ, hoạt động từng ngày",
          ]} />
          <Workflow title="Xem thông tin khách hàng" icon={null} steps={[
            "Vào Khách hàng → Xem SĐT, ghi chú đặc biệt của đoàn",
          ]} />
          <Workflow title="Xin nghỉ phép" icon={null} steps={[
            "Vào Nghỉ phép → Tạo đơn nghỉ → Gửi duyệt",
          ]} />
        </Section>
      </CardContent>
    </Card>
  );
}

/* ═══════════════ MAIN PAGE ═══════════════ */
export default function UserGuide() {
  const { userRole } = useAuth();

  const isAdmin = ADMIN_ROLES.includes(userRole || "");
  const isHR = HR_ROLES.includes(userRole || "");
  const isOps = OPS_ROLES.includes(userRole || "");
  const isSalesMgr = SALES_MGR_ROLES.includes(userRole || "");
  const isSales = SALES_ROLES.includes(userRole || "");
  const isIntern = INTERN_ROLES.includes(userRole || "");
  const isKetoan = KETOAN_ROLES.includes(userRole || "");
  const isMkt = MKT_ROLES.includes(userRole || "");
  const isHdv = HDV_ROLES.includes(userRole || "");

  const tabs: { value: string; label: string; icon: React.ReactNode }[] = [];

  if (isAdmin) tabs.push({ value: "admin", label: "Admin", icon: <Shield className="h-4 w-4" /> });
  if (isHR) tabs.push({ value: "hcns", label: "HCNS", icon: <Users className="h-4 w-4" /> });
  if (isOps) tabs.push({ value: "ops", label: "Điều hành", icon: <RouteIcon className="h-4 w-4" /> });
  if (isSalesMgr) tabs.push({ value: "salesmgr", label: "GDKD/Manager", icon: <Briefcase className="h-4 w-4" /> });
  if (isSales) tabs.push({ value: "sales", label: "Sale", icon: <Briefcase className="h-4 w-4" /> });
  if (isIntern) tabs.push({ value: "intern", label: "Thực tập sinh", icon: <GraduationCap className="h-4 w-4" /> });
  if (isKetoan) tabs.push({ value: "ketoan", label: "Kế toán", icon: <Calculator className="h-4 w-4" /> });
  if (isMkt || isHdv) tabs.push({ value: "mkthdv", label: "MKT & HDV", icon: <Megaphone className="h-4 w-4" /> });

  // Fallback: show all tabs if no specific role matched
  if (tabs.length === 0) {
    tabs.push(
      { value: "admin", label: "Admin", icon: <Shield className="h-4 w-4" /> },
      { value: "hcns", label: "HCNS", icon: <Users className="h-4 w-4" /> },
      { value: "ops", label: "Điều hành", icon: <RouteIcon className="h-4 w-4" /> },
      { value: "salesmgr", label: "GDKD/Manager", icon: <Briefcase className="h-4 w-4" /> },
      { value: "sales", label: "Sale", icon: <Briefcase className="h-4 w-4" /> },
      { value: "intern", label: "Thực tập sinh", icon: <GraduationCap className="h-4 w-4" /> },
      { value: "ketoan", label: "Kế toán", icon: <Calculator className="h-4 w-4" /> },
      { value: "mkthdv", label: "MKT & HDV", icon: <Megaphone className="h-4 w-4" /> },
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BookOpen className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Hướng dẫn sử dụng</h1>
      </div>

      <Tabs defaultValue={tabs[0]?.value} className="w-full">
        <ScrollArea className="w-full">
          <TabsList className="inline-flex w-max">
            {tabs.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="flex items-center gap-1.5">
                {t.icon}
                <span>{t.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <TabsContent value="admin" className="mt-4"><AdminGuide /></TabsContent>
        <TabsContent value="hcns" className="mt-4"><HCNSGuide /></TabsContent>
        <TabsContent value="ops" className="mt-4"><OpsGuide /></TabsContent>
        <TabsContent value="salesmgr" className="mt-4"><SalesMgrGuide /></TabsContent>
        <TabsContent value="sales" className="mt-4"><SalesGuide /></TabsContent>
        <TabsContent value="intern" className="mt-4"><InternGuide /></TabsContent>
        <TabsContent value="ketoan" className="mt-4"><KetoanGuide /></TabsContent>
        <TabsContent value="mkthdv" className="mt-4"><MktHdvGuide /></TabsContent>
      </Tabs>
    </div>
  );
}
