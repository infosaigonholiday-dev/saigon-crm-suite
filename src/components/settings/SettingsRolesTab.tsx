import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const rolesReference = [
  { role: "ADMIN", label: "Quản trị viên", desc: "Toàn quyền hệ thống: quản lý nhân sự, tài chính, cài đặt, tài khoản.", color: "bg-destructive/10 text-destructive border-destructive/20" },
  { role: "SUPER_ADMIN", label: "Super Admin", desc: "Tương đương ADMIN, quyền cao nhất.", color: "bg-destructive/10 text-destructive border-destructive/20" },
  { role: "DIRECTOR", label: "Giám đốc", desc: "Xem toàn bộ dữ liệu, duyệt chi phí, quản lý cấp cao.", color: "bg-primary/10 text-primary border-primary/20" },
  { role: "HCNS", label: "Nhân sự (HCNS)", desc: "Quản lý nhân viên, lương, bảo hiểm, nghỉ phép, phúc lợi.", color: "bg-accent/10 text-accent border-accent/20" },
  { role: "HR_MANAGER", label: "Trưởng phòng NS", desc: "Tương đương HCNS, quản lý toàn bộ nhân sự.", color: "bg-accent/10 text-accent border-accent/20" },
  { role: "KETOAN", label: "Kế toán", desc: "Quản lý tài chính, thuế, công nợ, bảng lương, hóa đơn.", color: "bg-warning/10 text-warning border-warning/20" },
  { role: "MANAGER", label: "Trưởng phòng", desc: "Xem dữ liệu phòng ban, duyệt yêu cầu nhân viên trong phòng.", color: "bg-primary/10 text-primary border-primary/20" },
  { role: "DIEUHAN", label: "Điều hành", desc: "Quản lý tour, booking, khách hàng, điều phối.", color: "bg-success/10 text-success border-success/20" },
  { role: "SALE_DOMESTIC", label: "Sale Nội địa", desc: "Quản lý khách hàng và booking nội địa được phân công.", color: "bg-muted text-muted-foreground" },
  { role: "SALE_INBOUND", label: "Sale Inbound", desc: "Quản lý khách hàng và booking inbound được phân công.", color: "bg-muted text-muted-foreground" },
  { role: "SALE_OUTBOUND", label: "Sale Outbound", desc: "Quản lý khách hàng và booking outbound được phân công.", color: "bg-muted text-muted-foreground" },
  { role: "SALE_MICE", label: "Sale MICE", desc: "Quản lý khách hàng MICE được phân công.", color: "bg-muted text-muted-foreground" },
  { role: "TOUR", label: "Hướng dẫn viên", desc: "Xem lịch tour, thông tin khách đoàn được phân công.", color: "bg-muted text-muted-foreground" },
  { role: "MKT", label: "Marketing", desc: "Quản lý nguồn lead, chiến dịch marketing.", color: "bg-muted text-muted-foreground" },
  { role: "INTERN", label: "Thực tập sinh", desc: "Quyền hạn hạn chế, chỉ xem hồ sơ cá nhân.", color: "bg-muted text-muted-foreground" },
];

export function SettingsRolesTab() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Quyền hạn hệ thống</h2>
        <p className="text-sm text-muted-foreground">Danh sách các vai trò và mô tả quyền hạn trong hệ thống.</p>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">Mã Role</TableHead>
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
