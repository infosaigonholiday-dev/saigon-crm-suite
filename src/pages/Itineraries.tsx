import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ItineraryFormDialog from "@/components/itineraries/ItineraryFormDialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, Plus, Loader2, UtensilsCrossed, Bus, Hotel } from "lucide-react";

export default function Itineraries() {
  const [selectedTour, setSelectedTour] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: tourPackages } = useQuery({
    queryKey: ["tour-packages-select"],
    queryFn: async () => {
      const { data } = await supabase.from("tour_packages" as any).select("id, name, code").order("name");
      return (data ?? []) as any[];
    },
  });

  const { data: itineraries, isLoading } = useQuery({
    queryKey: ["tour-itineraries", selectedTour],
    queryFn: async () => {
      let q = supabase.from("tour_itineraries" as any)
        .select("*, tour_packages(name, code), accommodations(name, city)")
        .order("day_number", { ascending: true });
      if (selectedTour) q = q.eq("tour_package_id", selectedTour);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Lịch trình tour</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Thêm ngày
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <Select value={selectedTour} onValueChange={setSelectedTour}>
            <SelectTrigger className="w-full sm:w-80">
              <SelectValue placeholder="Chọn gói tour để xem lịch trình" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả gói tour</SelectItem>
              {tourPackages?.map((t: any) => (
                <SelectItem key={t.id} value={t.id}>{t.code} - {t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : itineraries?.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">Chưa có lịch trình nào</p>
          ) : (
            <div className="space-y-4">
              {itineraries?.map((it: any) => (
                <div key={it.id} className="border rounded-lg p-4 relative">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                      {it.day_number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground">{it.title}</h3>
                        {!selectedTour && it.tour_packages && (
                          <Badge variant="outline" className="text-xs">{it.tour_packages.code}</Badge>
                        )}
                      </div>
                      {it.description && (
                        <p className="text-sm text-muted-foreground mt-1">{it.description}</p>
                      )}
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                        {it.meals_included?.length > 0 && (
                          <span className="flex items-center gap-1">
                            <UtensilsCrossed className="h-3 w-3" />
                            {it.meals_included.join(", ")}
                          </span>
                        )}
                        {it.transportation && (
                          <span className="flex items-center gap-1">
                            <Bus className="h-3 w-3" />
                            {it.transportation}
                          </span>
                        )}
                        {it.accommodations && (
                          <span className="flex items-center gap-1">
                            <Hotel className="h-3 w-3" />
                            {it.accommodations.name} {it.accommodations.city ? `(${it.accommodations.city})` : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ItineraryFormDialog open={dialogOpen} onOpenChange={setDialogOpen} defaultTourPackageId={selectedTour !== "all" ? selectedTour : undefined} />
    </div>
  );
}
