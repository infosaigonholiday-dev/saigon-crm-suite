import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target } from "lucide-react";

export default function CampaignList() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Target className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Chiến dịch & Công việc</h1>
          <p className="text-sm text-muted-foreground">
            Quản lý chiến dịch, cột mốc và công việc cho mọi phòng ban
          </p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Module đang được hoàn thiện</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Database đã sẵn sàng. Giao diện danh sách, Kanban và chi tiết sẽ được
            triển khai trong Phần 2.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
