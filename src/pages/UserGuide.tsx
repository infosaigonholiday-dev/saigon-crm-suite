import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Shield, Users, Briefcase, GraduationCap, Route as RouteIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];
const HR_ROLES = ["HR_MANAGER", "HCNS"];
const SALES_ROLES = ["GDKD", "MANAGER", "SALE_DOMESTIC", "SALE_INBOUND", "SALE_OUTBOUND", "SALE_MICE"];
const INTERN_ROLES = ["INTERN_SALE_DOMESTIC", "INTERN_SALE_OUTBOUND", "INTERN_SALE_MICE", "INTERN_SALE_INBOUND"];
const OPS_ROLES = ["DIEUHAN", "INTERN_DIEUHAN"];

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

function AccountCreationGuide() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-5 w-5 text-primary" />
          Quy trình tạo tài khoản & nhân sự mới
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Section title="Bước 1: Tạo hồ sơ nhân viên (Admin hoặc HCNS)">
          <Step n={1} text="Vào menu Nhân sự → Nhấn nút 'Thêm nhân viên'" />
          <Step n={2} text="Điền đầy đủ thông tin: Họ tên, Email, Phòng ban, Chức vụ, Ngày vào làm" />
          <Step n={3} text="Hệ thống sẽ tự động tạo mã nhân viên (SHT-xxx)" />
          <Step n={4} text="Nhấn Lưu để tạo hồ sơ nhân viên" />
        </Section>

        <Section title="Bước 2: Tạo tài khoản đăng nhập (Chỉ Admin)">
          <Step n={1} text="Vào Cài đặt → Tab 'Tài khoản'" />
          <Step n={2} text="Nhấn 'Tạo tài khoản' → Điền Email (cùng email với hồ sơ nhân viên)" />
          <Step n={3} text="Chọn Vai trò phù hợp (hệ thống sẽ gợi ý dựa trên chức vụ và phòng ban)" />
          <Step n={4} text="Chọn Phòng ban → Nhấn Tạo" />
          <Step n={5} text="Hệ thống tự động gửi email mời, nhân viên mới đăng nhập lần đầu sẽ được yêu cầu đổi mật khẩu" />
        </Section>

        <Section title="Bước 3: Liên kết tài khoản với hồ sơ nhân viên">
          <Step n={1} text="Vào hồ sơ nhân viên vừa tạo → Tab 'Vai trò'" />
          <Step n={2} text="Chọn Profile ID (tài khoản đăng nhập) tương ứng" />
          <Step n={3} text="Kiểm tra: Chức vụ ↔ Vai trò hệ thống có khớp không (hệ thống sẽ cảnh báo nếu sai lệch)" />
        </Section>

        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800 text-sm">
          <strong className="text-amber-700 dark:text-amber-400">⚠️ Lưu ý quan trọng:</strong>
          <ul className="list-disc pl-5 mt-1 space-y-1 text-amber-600 dark:text-amber-300">
            <li>HCNS có thể tạo hồ sơ nhân viên, nhưng <strong>chỉ Admin</strong> mới tạo được tài khoản đăng nhập</li>
            <li>Email tài khoản và email nhân viên phải trùng nhau để liên kết tự động</li>
            <li>Sau khi tạo, nhân viên mới sẽ phải đổi mật khẩu lần đầu đăng nhập</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

function AdminGuide() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-5 w-5 text-primary" />
          Hướng dẫn cho Admin
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Section title="Quản lý tài khoản">
          <p>• Tạo/sửa/vô hiệu hóa tài khoản đăng nhập cho nhân viên</p>
          <p>• Thay đổi vai trò và phòng ban của tài khoản</p>
          <p>• Reset mật khẩu cho nhân viên khi cần</p>
        </Section>
        <Section title="Quản lý phòng ban & cấp bậc">
          <p>• Tạo/sửa phòng ban, gán trưởng phòng</p>
          <p>• Thiết lập cấp bậc nhân viên</p>
        </Section>
        <Section title="Phân quyền">
          <p>• Xem và chỉnh sửa ma trận phân quyền cho từng vai trò</p>
          <p>• Bật/tắt quyền truy cập module cho từng nhóm</p>
        </Section>
        <Section title="Tài chính & Báo cáo">
          <p>• Toàn quyền xem/tạo/sửa tất cả dữ liệu tài chính</p>
          <p>• Duyệt dự toán và quyết toán</p>
          <p>• Xuất dữ liệu khách hàng (CSV)</p>
        </Section>
        <Section title="Nhật ký xóa">
          <p>• Xem lịch sử tất cả hành động xóa dữ liệu trong hệ thống</p>
          <p>• Chỉ Admin mới có quyền xóa bản ghi trên toàn bộ module</p>
        </Section>
      </CardContent>
    </Card>
  );
}

function HCNSGuide() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-primary" />
          Hướng dẫn cho HCNS
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Section title="Quản lý nhân sự">
          <p>• Tạo và chỉnh sửa hồ sơ nhân viên (thông tin cá nhân, hợp đồng, bảo hiểm)</p>
          <p>• Xem danh sách nhân viên toàn công ty</p>
          <p>• Quản lý KPI nhân viên</p>
        </Section>
        <Section title="Nghỉ phép">
          <p>• Xem và tạo đơn nghỉ phép</p>
          <p>• Duyệt đơn nghỉ phép của nhân viên</p>
          <p>• Theo dõi số ngày phép còn lại</p>
        </Section>
        <Section title="Bảng lương">
          <p>• Tạo và chỉnh sửa bảng lương hàng tháng</p>
          <p>• Tính phụ cấp, khấu trừ, tăng ca</p>
        </Section>
        <Section title="Tài chính (hạn chế)">
          <p>• Xem báo cáo tài chính</p>
          <p>• Tạo và gửi phiếu chi phí</p>
        </Section>
        <Section title="Cài đặt">
          <p>• Quản lý phòng ban và cấp bậc</p>
          <p>• Xem quyền hạn (không chỉnh sửa được phân quyền)</p>
        </Section>
      </CardContent>
    </Card>
  );
}

function OpsGuide() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <RouteIcon className="h-5 w-5 text-primary" />
          Hướng dẫn cho Điều hành
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Section title="Quản lý Booking">
          <p>• Tạo, sửa và duyệt đặt tour</p>
          <p>• Quản lý lịch trình chi tiết theo ngày</p>
          <p>• Ghi chú đặc biệt cho từng booking</p>
        </Section>
        <Section title="Dự toán & Quyết toán">
          <p>• Tạo dự toán chi phí cho tour</p>
          <p>• Gửi duyệt và theo dõi trạng thái</p>
          <p>• Tạo quyết toán sau khi tour hoàn thành</p>
        </Section>
        <Section title="Nhà cung cấp">
          <p>• Xem danh sách nhà cung cấp (khách sạn, xe, nhà hàng...)</p>
          <p>• Không có quyền tạo mới hoặc sửa nhà cung cấp</p>
        </Section>
        <Section title="Khách hàng">
          <p>• Xem, tạo và sửa thông tin khách hàng</p>
          <p>• Quản lý báo giá</p>
        </Section>
        <Section title="Thanh toán">
          <p>• Tạo và chỉnh sửa phiếu thanh toán</p>
          <p>• Theo dõi công nợ nhà cung cấp</p>
        </Section>
      </CardContent>
    </Card>
  );
}

function SalesGuide() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Briefcase className="h-5 w-5 text-primary" />
          Hướng dẫn cho GDKD & Trưởng phòng KD
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Section title="Khách hàng">
          <p>• Xem khách hàng trong phòng ban của mình</p>
          <p>• Tạo khách hàng mới</p>
          <p>• <strong>Chỉ sửa được khách hàng do mình tạo hoặc được phân công</strong> — không sửa được của người khác</p>
        </Section>
        <Section title="Tiềm năng (Leads)">
          <p>• Quản lý khách hàng tiềm năng trong phòng ban</p>
          <p>• Phân bổ leads cho nhân viên</p>
        </Section>
        <Section title="Đặt tour & Báo giá">
          <p>• Tạo và sửa booking</p>
          <p>• Tạo báo giá cho khách hàng</p>
          <p>• GDKD có quyền duyệt booking</p>
        </Section>
        <Section title="Quản lý nhân sự phòng ban">
          <p>• GDKD: Xem, tạo, sửa hồ sơ nhân viên trong phòng ban</p>
          <p>• MANAGER: Chỉ xem hồ sơ nhân viên</p>
          <p>• Duyệt nghỉ phép của nhân viên</p>
        </Section>
      </CardContent>
    </Card>
  );
}

function InternGuide() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <GraduationCap className="h-5 w-5 text-primary" />
          Hướng dẫn cho Thực tập sinh Kinh doanh
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Section title="Khách hàng">
          <p>• Xem danh sách khách hàng (chỉ khách hàng của mình)</p>
          <p>• Tạo khách hàng mới</p>
          <p>• <strong>Chỉ sửa được khách hàng do mình tạo</strong> — cố sửa khách hàng của người khác sẽ bị hệ thống chặn</p>
        </Section>
        <Section title="Tiềm năng (Leads)">
          <p>• Xem và tạo leads mới</p>
          <p>• Chỉ thấy leads do mình tạo hoặc được phân công</p>
        </Section>
        <Section title="Đặt tour">
          <p>• Xem danh sách booking</p>
          <p>• Tạo booking mới (không có quyền sửa)</p>
        </Section>
        <Section title="Nghỉ phép">
          <p>• Tạo đơn xin nghỉ phép</p>
          <p>• Xem trạng thái đơn nghỉ</p>
        </Section>
        <Section title="Quy trình (SOP)">
          <p>• Đọc tài liệu quy trình làm việc của phòng ban</p>
        </Section>

        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800 text-sm">
          <strong className="text-blue-700 dark:text-blue-400">💡 Lưu ý:</strong>
          <ul className="list-disc pl-5 mt-1 space-y-1 text-blue-600 dark:text-blue-300">
            <li>Bạn chỉ thấy dữ liệu do mình tạo ra, không xem được dữ liệu của người khác</li>
            <li>Không có quyền xóa bất kỳ dữ liệu nào</li>
            <li>Không có quyền xuất dữ liệu (Export CSV)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

export default function UserGuide() {
  const { userRole } = useAuth();

  const isAdmin = ADMIN_ROLES.includes(userRole || "");
  const isHR = HR_ROLES.includes(userRole || "");
  const isOps = OPS_ROLES.includes(userRole || "");
  const isSales = SALES_ROLES.includes(userRole || "");
  const isIntern = INTERN_ROLES.includes(userRole || "");

  // Build visible tabs
  const tabs: { value: string; label: string; icon: React.ReactNode }[] = [];

  if (isAdmin || isHR) {
    tabs.push({ value: "account", label: "Tạo tài khoản", icon: <Shield className="h-4 w-4" /> });
  }
  if (isAdmin) {
    tabs.push({ value: "admin", label: "Admin", icon: <Shield className="h-4 w-4" /> });
  }
  if (isHR) {
    tabs.push({ value: "hcns", label: "HCNS", icon: <Users className="h-4 w-4" /> });
  }
  if (isOps) {
    tabs.push({ value: "ops", label: "Điều hành", icon: <RouteIcon className="h-4 w-4" /> });
  }
  if (isSales) {
    tabs.push({ value: "sales", label: "Kinh doanh", icon: <Briefcase className="h-4 w-4" /> });
  }
  if (isIntern) {
    tabs.push({ value: "intern", label: "Thực tập sinh", icon: <GraduationCap className="h-4 w-4" /> });
  }

  // Fallback: show all guides if no specific role matched
  if (tabs.length === 0) {
    tabs.push(
      { value: "account", label: "Tạo tài khoản", icon: <Shield className="h-4 w-4" /> },
      { value: "intern", label: "Thực tập sinh", icon: <GraduationCap className="h-4 w-4" /> },
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BookOpen className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Hướng dẫn sử dụng</h1>
      </div>

      <Tabs defaultValue={tabs[0]?.value} className="w-full">
        <TabsList className="w-full grid" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="flex items-center gap-1.5">
              {t.icon}
              <span>{t.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="account" className="mt-4"><AccountCreationGuide /></TabsContent>
        <TabsContent value="admin" className="mt-4"><AdminGuide /></TabsContent>
        <TabsContent value="hcns" className="mt-4"><HCNSGuide /></TabsContent>
        <TabsContent value="ops" className="mt-4"><OpsGuide /></TabsContent>
        <TabsContent value="sales" className="mt-4"><SalesGuide /></TabsContent>
        <TabsContent value="intern" className="mt-4"><InternGuide /></TabsContent>
      </Tabs>
    </div>
  );
}
