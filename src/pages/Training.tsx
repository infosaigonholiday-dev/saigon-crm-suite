import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, ExternalLink, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface Doc {
  file: string;
  title: string;
  desc: string;
}

const DOCS: Doc[] = [
  { file: "index.html", title: "📚 Mục lục", desc: "Trang chủ bộ tài liệu" },
  { file: "00_TONG_QUAN.html", title: "0. Tổng quan hệ thống", desc: "Triết lý 5 bước, kiến trúc CRM" },
  { file: "01_SALE.html", title: "1. Phòng Sale", desc: "Quy trình Lead → Booking" },
  { file: "02_DIEU_HANH.html", title: "2. Phòng Điều hành", desc: "Vận hành tour, hồ sơ đoàn" },
  { file: "03_KE_TOAN.html", title: "3. Phòng Kế toán", desc: "Tài chính, công nợ, lợi nhuận" },
  { file: "04_HCNS.html", title: "4. Phòng HCNS", desc: "Nhân sự, lương, tuyển dụng" },
  { file: "05_MARKETING.html", title: "5. Phòng Marketing", desc: "Chiến dịch, kho data" },
  { file: "06_QUAN_LY_CEO_GDKD.html", title: "6. CEO & GĐKD", desc: "Dashboard quản trị, KPI" },
  { file: "07_FLOW_LIEN_PHONG.html", title: "7. Flow liên phòng", desc: "6 luồng phối hợp chéo" },
  { file: "08_HUONG_DAN_TAI_KHOAN.html", title: "8. Tài khoản & mật khẩu", desc: "Reset password, đổi role" },
  { file: "09_CHE_TAI_KY_LUAT.html", title: "9. Chế tài kỷ luật", desc: "Khung xử lý vi phạm SOP" },
  { file: "10_FAQ_LOI_THUONG_GAP.html", title: "10. FAQ", desc: "Top 20 lỗi thường gặp" },
];

const ALLOWED_ROLES = ["ADMIN", "CEO", "GDKD", "HR_MANAGER", "KETOAN", "DIEUHAN", "MANAGER", "SALE_MANAGER", "MARKETING_MANAGER"];

export default function Training() {
  const { userRole } = useAuth();
  const [activeIdx, setActiveIdx] = useState(0);

  if (!userRole || !ALLOWED_ROLES.some((r) => userRole.toUpperCase().includes(r))) {
    return <Navigate to="/" replace />;
  }

  const active = DOCS[activeIdx];
  const url = `/training/${active.file}`;

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] gap-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Tài liệu Training — SGH CRM</h1>
          <p className="text-sm text-muted-foreground">
            Bộ 12 tài liệu hướng dẫn vận hành cho từng phòng ban. Đang ở giai đoạn rà soát nội dung.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={url} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Mở tab mới (in PDF)
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={url} download={active.file}>
              <Download className="h-4 w-4 mr-2" />
              Tải file này
            </a>
          </Button>
        </div>
      </div>

      {/* Body 2 cột */}
      <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
        {/* Sidebar trái */}
        <Card className="col-span-12 md:col-span-3 p-2 overflow-auto">
          <div className="space-y-1">
            {DOCS.map((doc, idx) => (
              <button
                key={doc.file}
                onClick={() => setActiveIdx(idx)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md transition-colors text-sm",
                  activeIdx === idx
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
              >
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{doc.title}</div>
                    <div className={cn(
                      "text-xs truncate",
                      activeIdx === idx ? "text-primary-foreground/80" : "text-muted-foreground"
                    )}>
                      {doc.desc}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Iframe phải */}
        <Card className="col-span-12 md:col-span-9 overflow-hidden">
          <iframe
            key={active.file}
            src={url}
            title={active.title}
            className="w-full h-full border-0 bg-white"
          />
        </Card>
      </div>
    </div>
  );
}
