import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CalendarIcon, Plus, Trash2, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import ActivityFormDialog, { type Activity } from "./ActivityFormDialog";
import { usePermissions } from "@/hooks/usePermissions";

const typeIcons: Record<string, string> = {
  DiChuyen: "🚌",
  ThamQuan: "🏛️",
  AnUong: "🍽️",
  NhanPhong: "🏨",
  TuDo: "⏱️",
};

const statusIcons: Record<string, string> = {
  DaDat: "✅",
  ChoXacNhan: "⏳",
  CoVanDe: "⚠️",
};

interface ItineraryDay {
  id: string;
  booking_id: string;
  day_number: number;
  actual_date: string | null;
  destination: string;
  activities: Activity[];
  created_at: string;
}

interface Props {
  bookingId: string;
  readOnly?: boolean;
}

export default function BookingItineraryTab({ bookingId }: Props) {
  
  const qc = useQueryClient();
  const { hasPermission } = usePermissions();
  const canDelete = hasPermission("bookings.delete");
  const queryKey = ["booking-itineraries", bookingId];

  const [activityDialog, setActivityDialog] = useState<{ open: boolean; dayId: string | null }>({ open: false, dayId: null });
  const [addingDay, setAddingDay] = useState(false);
  const [newDay, setNewDay] = useState({ destination: "", actual_date: null as Date | null });

  const { data: days = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("booking_itineraries")
        .select("*")
        .eq("booking_id", bookingId)
        .order("day_number", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ItineraryDay[];
    },
  });

  const addDayMutation = useMutation({
    mutationFn: async () => {
      const nextDay = days.length > 0 ? Math.max(...days.map((d) => d.day_number)) + 1 : 1;
      const { error } = await (supabase as any).from("booking_itineraries").insert({
        booking_id: bookingId,
        day_number: nextDay,
        destination: newDay.destination || "Chưa xác định",
        actual_date: newDay.actual_date ? format(newDay.actual_date, "yyyy-MM-dd") : null,
        activities: [],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      setAddingDay(false);
      setNewDay({ destination: "", actual_date: null });
      toast.success("Đã thêm ngày mới");
    },
    onError: (e: any) => toast.error("Lỗi", { description: e.message }),
  });

  const deleteDayMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("booking_itineraries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success("Đã xóa ngày");
    },
    onError: (e: any) => toast.error("Lỗi", { description: e.message }),
  });

  const addActivityMutation = useMutation({
    mutationFn: async ({ dayId, activity }: { dayId: string; activity: Activity }) => {
      const day = days.find((d) => d.id === dayId);
      if (!day) throw new Error("Không tìm thấy ngày");
      const currentActivities = day.activities || [];
      const updated = [...currentActivities, activity].sort((a, b) => a.time.localeCompare(b.time));
      const { error } = await (supabase as any)
        .from("booking_itineraries")
        .update({ activities: updated })
        .eq("id", dayId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success("Đã thêm hoạt động");
    },
    onError: (e: any) => toast.error("Lỗi", { description: e.message }),
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Lịch trình tour</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => toast("Tính năng xuất PDF sẽ sớm ra mắt!")}>
            <FileText className="h-4 w-4 mr-1" /> Xuất PDF
          </Button>
          <Button size="sm" onClick={() => setAddingDay(true)}>
            <Plus className="h-4 w-4 mr-1" /> Thêm ngày
          </Button>
        </div>
      </div>

      {/* Add Day Form */}
      {addingDay && (
        <Card className="border-dashed border-primary/50">
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Điểm đến</Label>
                <Input
                  value={newDay.destination}
                  onChange={(e) => setNewDay((p) => ({ ...p, destination: e.target.value }))}
                  placeholder="VD: Hà Nội, Đà Nẵng..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Ngày thực tế</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !newDay.actual_date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newDay.actual_date ? format(newDay.actual_date, "dd/MM/yyyy") : "Chọn ngày"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={newDay.actual_date ?? undefined}
                      onSelect={(d) => setNewDay((p) => ({ ...p, actual_date: d ?? null }))}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setAddingDay(false)}>Huỷ</Button>
              <Button size="sm" onClick={() => addDayMutation.mutate()} disabled={addDayMutation.isPending}>
                {addDayMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Thêm
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Days */}
      {days.length === 0 && !addingDay && (
        <div className="text-center py-12 text-muted-foreground">
          Chưa có lịch trình. Bấm "Thêm ngày" để bắt đầu.
        </div>
      )}

      {days.map((day) => {
        const activities = day.activities || [];
        return (
          <Card key={day.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    Ngày {day.day_number} — {day.destination}
                  </CardTitle>
                  {day.actual_date && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {format(new Date(day.actual_date), "dd/MM/yyyy")}
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActivityDialog({ open: true, dayId: day.id })}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Hoạt động
                  </Button>
                  {canDelete && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Xóa Ngày {day.day_number}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tất cả hoạt động trong ngày này sẽ bị xóa. Không thể hoàn tác.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Huỷ</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteDayMutation.mutate(day.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Xóa
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Chưa có hoạt động</p>
              ) : (
                <div className="space-y-2">
                  {activities.map((act, idx) => (
                    <div key={idx} className="flex items-start gap-3 rounded-lg border p-3 bg-muted/30">
                      <span className="text-lg mt-0.5">{typeIcons[act.type] ?? "📌"}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-medium text-primary">{act.time}</span>
                          <span className="text-sm font-medium">{act.description}</span>
                          <span className="text-sm">{statusIcons[act.status] ?? ""}</span>
                        </div>
                        {act.supplier && (
                          <p className="text-xs text-muted-foreground mt-0.5">NCC: {act.supplier}</p>
                        )}
                        {act.notes && (
                          <p className="text-xs text-muted-foreground mt-0.5">{act.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Activity Dialog */}
      <ActivityFormDialog
        open={activityDialog.open}
        onOpenChange={(open) => setActivityDialog((p) => ({ ...p, open }))}
        onSave={(activity) => {
          if (activityDialog.dayId) {
            addActivityMutation.mutate({ dayId: activityDialog.dayId, activity });
          }
        }}
      />
    </div>
  );
}
