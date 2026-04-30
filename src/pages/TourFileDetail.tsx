import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Briefcase } from "lucide-react";
import { TOUR_STAGE_LABEL, BOOKING_TYPE_LABEL, type TourStage } from "@/lib/tourFileWorkflow";
import TourFileOverviewTab from "@/components/tour-files/TourFileOverviewTab";
import TourFileTasksTab from "@/components/tour-files/TourFileTasksTab";
import TourFileDocumentsTab from "@/components/tour-files/TourFileDocumentsTab";
import TourFileHistoryTab from "@/components/tour-files/TourFileHistoryTab";
import { EntityNotAccessible } from "@/components/shared/EntityNotAccessible";

export default function TourFileDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: tf, isLoading } = useQuery({
    queryKey: ["tour_file", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("tour_files")
        .select(`*,
          sale_owner:sale_owner_id ( id, full_name ),
          operation_owner:operation_owner_id ( id, full_name ),
          accountant_owner:accountant_owner_id ( id, full_name ),
          manager_owner:manager_owner_id ( id, full_name )
        `)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data; // null nếu không tìm thấy hoặc bị RLS chặn
    },
  });

  if (isLoading) return <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  // TC12: forbidden / không tồn tại
  if (!tf) return <EntityNotAccessible kind="Hồ sơ đoàn" backTo="/ho-so-doan" mode="forbidden" />;
  // TC13: hồ sơ đã huỷ
  if (tf.status === "cancelled") return <EntityNotAccessible kind="Hồ sơ đoàn" backTo="/ho-so-doan" mode="cancelled" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/ho-so-doan")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Danh sách
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Briefcase className="h-4 w-4" />
                <span className="font-mono">{tf.tour_file_code}</span>
                <span>·</span>
                <Badge variant="outline">{BOOKING_TYPE_LABEL[tf.booking_type] || tf.booking_type}</Badge>
              </div>
              <h1 className="text-2xl font-bold mt-1">{tf.tour_name || "(Chưa đặt tên)"}</h1>
              <div className="text-sm text-muted-foreground mt-1">{tf.route} {tf.destination ? `· ${tf.destination}` : ""}</div>
            </div>
            <Badge className="text-sm">{TOUR_STAGE_LABEL[tf.current_stage as TourStage] || tf.current_stage}</Badge>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="tasks">Task / Việc</TabsTrigger>
          <TabsTrigger value="documents">Tài liệu</TabsTrigger>
          <TabsTrigger value="history">Lịch sử</TabsTrigger>
        </TabsList>
        <TabsContent value="overview"><TourFileOverviewTab tf={tf} /></TabsContent>
        <TabsContent value="tasks"><TourFileTasksTab tourFileId={tf.id} tf={tf} /></TabsContent>
        <TabsContent value="documents"><TourFileDocumentsTab tourFileId={tf.id} /></TabsContent>
        <TabsContent value="history"><TourFileHistoryTab tourFileId={tf.id} /></TabsContent>
      </Tabs>
    </div>
  );
}
