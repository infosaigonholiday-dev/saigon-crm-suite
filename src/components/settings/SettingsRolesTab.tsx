import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const rolesReference = [
  { role: "ADMIN", label: "Quản trị viên", desc: "Toàn quyền hệ thống: quản lý nhân sự, tài chính, cài đặt, tài khoản.", color: "bg-destructive/10 text-destructive border-destructive/20" },
  { role: "HCNS", label: "Nhân viên HCNS", desc: "Xem/tạo/sửa nhân viên, nghỉ phép, bảng lương. Không duyệt, không xóa.", color: "bg-accent/10 text-accent border-accent/20" },
  { role: "HR_MANAGER", label: "Leader HCNS", desc: "Toàn quyền nhân sự: thêm/sửa/xóa nhân viên, duyệt nghỉ phép, chỉnh lương.", color: "bg-accent/10 text-accent border-accent/20" },
  { role: "KETOAN", label: "Kế toán", desc: "Quản lý tài chính, thuế, công nợ, bảng lương, hóa đơn.", color: "bg-warning/10 text-warning border-warning/20" },
  { role: "MANAGER", label: "Trưởng phòng", desc: "Xem dữ liệu phòng ban, duyệt yêu cầu nhân viên trong phòng.", color: "bg-primary/10 text-primary border-primary/20" },
  { role: "GDKD", label: "GĐ Kinh doanh", desc: "Quản lý phòng kinh doanh, quyền tương đương Trưởng phòng.", color: "bg-primary/10 text-primary border-primary/20" },
  { role: "DIEUHAN", label: "Điều hành", desc: "Quản lý tour, booking, khách hàng, điều phối.", color: "bg-success/10 text-success border-success/20" },
  { role: "SALE_DOMESTIC", label: "Sale Nội địa", desc: "Quản lý khách hàng và booking nội địa được phân công.", color: "bg-muted text-muted-foreground" },
  { role: "SALE_INBOUND", label: "Sale Inbound", desc: "Quản lý khách hàng và booking inbound được phân công.", color: "bg-muted text-muted-foreground" },
  { role: "SALE_OUTBOUND", label: "Sale Outbound", desc: "Quản lý khách hàng và booking outbound được phân công.", color: "bg-muted text-muted-foreground" },
  { role: "SALE_MICE", label: "Sale MICE", desc: "Quản lý khách hàng MICE được phân công.", color: "bg-muted text-muted-foreground" },
  { role: "TOUR", label: "Hướng dẫn viên", desc: "Xem lịch tour, thông tin khách đoàn được phân công.", color: "bg-muted text-muted-foreground" },
  { role: "MKT", label: "Marketing", desc: "Quản lý nguồn lead, chiến dịch marketing.", color: "bg-muted text-muted-foreground" },
  { role: "INTERN_DIEUHAN", label: "TTS Điều hành", desc: "Xem booking. Chỉ quyền view.", color: "bg-muted/50 text-muted-foreground" },
  { role: "INTERN_SALE_DOMESTIC", label: "TTS KD Nội địa", desc: "Xem khách hàng, lead, booking. Chỉ quyền view.", color: "bg-muted/50 text-muted-foreground" },
  { role: "INTERN_SALE_OUTBOUND", label: "TTS KD Outbound", desc: "Xem khách hàng, lead, booking. Chỉ quyền view.", color: "bg-muted/50 text-muted-foreground" },
  { role: "INTERN_SALE_MICE", label: "TTS KD MICE", desc: "Xem khách hàng, lead, booking. Chỉ quyền view.", color: "bg-muted/50 text-muted-foreground" },
  { role: "INTERN_SALE_INBOUND", label: "TTS KD Inbound", desc: "Xem khách hàng, lead, booking. Chỉ quyền view.", color: "bg-muted/50 text-muted-foreground" },
  { role: "INTERN_MKT", label: "TTS Marketing", desc: "Xem khách hàng, lead. Chỉ quyền view.", color: "bg-muted/50 text-muted-foreground" },
  { role: "INTERN_HCNS", label: "TTS HCNS", desc: "Xem danh sách nhân sự. Chỉ quyền view.", color: "bg-muted/50 text-muted-foreground" },
  { role: "INTERN_KETOAN", label: "TTS Kế toán", desc: "Xem khách hàng, booking, thanh toán. Chỉ quyền view.", color: "bg-muted/50 text-muted-foreground" },
];

export function SettingsRolesTab() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Quyền hạn hệ thống</h2>
        <p className="text-sm text-muted-foreground">Danh sách các vai trò và mô tả quyền hạn trong hệ thống.</p>
      </div>

      <Alert className="border-primary/30 bg-primary/5">
        <Info className="h-4 w-4 text-primary" />
        <AlertDescription className="text-sm">
          <strong>Quyền hệ thống được xác định từ trường <code className="bg-muted px-1 rounded">profiles.role</code></strong> — cột "Quyền hệ thống" trong tab <em>Phân quyền nhân sự</em> của hồ sơ nhân viên, hoặc khi tạo tài khoản mới ở mục Cài đặt → Tài khoản.
          <br />
          <span className="text-muted-foreground">Các trường Chức vụ (position), Cấp bậc (level), Phòng ban (department_id) chỉ là thông tin tổ chức, <strong>KHÔNG ảnh hưởng phân quyền</strong>.</span>
        </AlertDescription>
      </Alert>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Mã Role</TableHead>
              <TableHead className="w-[160px]">Tên hiển thị</TableHead>
              <TableHead>Mô tả quyền hạn</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rolesReference.map((r) => (
              <TableRow key={r.role}>
                <TableCell>
                  <Badge variant="outline" className={r.color}>{r.role}</Badge>
                </TableCell>
                <TableCell className="font-medium">{r.label}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.desc}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
