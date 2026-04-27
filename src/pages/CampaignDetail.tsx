import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CampaignDetail() {
  const { id } = useParams();
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Chi tiết chiến dịch</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            ID: <code className="font-mono">{id}</code>
          </p>
          <p className="mt-2 text-muted-foreground">
            Trang chi tiết (cột mốc, công việc, log) sẽ được build trong Phần 2.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
