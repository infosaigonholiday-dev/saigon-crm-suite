import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const today = new Date();
    const notifications: Array<{
      user_id: string;
      type: string;
      title: string;
      message: string;
      entity_type: string;
      entity_id: string;
    }> = [];

    // Helper: get MM-DD for a date offset
    const getMMDD = (daysOffset: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() + daysOffset);
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${mm}-${dd}`;
    };

    const todayStr = today.toISOString().split("T")[0];

    // ===== 1. Customer birthdays (date_of_birth) — 3 days ahead =====
    const { data: personalCustomers } = await supabase
      .from("customers")
      .select("id, full_name, date_of_birth, assigned_sale_id")
      .not("date_of_birth", "is", null)
      .not("assigned_sale_id", "is", null);

    if (personalCustomers) {
      const targetDays = [0, 1, 2, 3];
      const targetMMDDs = targetDays.map(getMMDD);

      for (const c of personalCustomers) {
        if (!c.date_of_birth || !c.assigned_sale_id) continue;
        const dob = new Date(c.date_of_birth);
        const mmdd = `${String(dob.getMonth() + 1).padStart(2, "0")}-${String(dob.getDate()).padStart(2, "0")}`;

        const dayIdx = targetMMDDs.indexOf(mmdd);
        if (dayIdx === -1) continue;

        const daysLabel = dayIdx === 0 ? "hôm nay" : `${dayIdx} ngày nữa`;
        notifications.push({
          user_id: c.assigned_sale_id,
          type: "birthday",
          title: `🎂 Sinh nhật KH: ${c.full_name}`,
          message: `Sinh nhật ${daysLabel}. Gửi lời chúc!`,
          entity_type: "customer",
          entity_id: c.id,
        });
      }
    }

    // ===== 2. B2B contact birthdays (contact_birthday) — 3 days ahead =====
    const { data: b2bCustomers } = await supabase
      .from("customers")
      .select("id, company_name, contact_person, contact_birthday, assigned_sale_id")
      .not("contact_birthday", "is", null)
      .not("assigned_sale_id", "is", null)
      .eq("type", "BUSINESS");

    if (b2bCustomers) {
      const targetMMDDs = [0, 1, 2, 3].map(getMMDD);

      for (const c of b2bCustomers) {
        if (!c.contact_birthday || !c.assigned_sale_id) continue;
        const dob = new Date(c.contact_birthday);
        const mmdd = `${String(dob.getMonth() + 1).padStart(2, "0")}-${String(dob.getDate()).padStart(2, "0")}`;

        const dayIdx = targetMMDDs.indexOf(mmdd);
        if (dayIdx === -1) continue;

        const daysLabel = dayIdx === 0 ? "hôm nay" : `${dayIdx} ngày nữa`;
        notifications.push({
          user_id: c.assigned_sale_id,
          type: "birthday",
          title: `🎂 Sinh nhật đầu mối: ${c.contact_person || "N/A"} (${c.company_name || "N/A"})`,
          message: `Sinh nhật ${daysLabel}. Gửi lời chúc!`,
          entity_type: "customer",
          entity_id: c.id,
        });
      }
    }

    // ===== 3. Company anniversaries (founded_date) — 7 days ahead =====
    const { data: companies } = await supabase
      .from("customers")
      .select("id, company_name, founded_date, assigned_sale_id")
      .not("founded_date", "is", null)
      .not("assigned_sale_id", "is", null)
      .eq("type", "BUSINESS");

    if (companies) {
      const targetMMDDs = Array.from({ length: 8 }, (_, i) => getMMDD(i));

      for (const c of companies) {
        if (!c.founded_date || !c.assigned_sale_id) continue;
        const fd = new Date(c.founded_date);
        const mmdd = `${String(fd.getMonth() + 1).padStart(2, "0")}-${String(fd.getDate()).padStart(2, "0")}`;

        const dayIdx = targetMMDDs.indexOf(mmdd);
        if (dayIdx === -1) continue;

        const years = today.getFullYear() - fd.getFullYear();
        const daysLabel = dayIdx === 0 ? "hôm nay" : `${dayIdx} ngày nữa`;
        notifications.push({
          user_id: c.assigned_sale_id,
          type: "company_anniversary",
          title: `🏢 Kỷ niệm thành lập: ${c.company_name || "N/A"}`,
          message: `${years} năm (${daysLabel}). Gửi offer MICE?`,
          entity_type: "customer",
          entity_id: c.id,
        });
      }
    }

    // ===== 4. Lead follow-up (follow_up_date = today) =====
    const { data: leads } = await supabase
      .from("leads")
      .select("id, full_name, assigned_to, follow_up_date")
      .eq("follow_up_date", todayStr)
      .not("assigned_to", "is", null);

    if (leads) {
      for (const l of leads) {
        if (!l.assigned_to) continue;
        notifications.push({
          user_id: l.assigned_to,
          type: "follow_up",
          title: `📞 Follow-up hôm nay: ${l.full_name}`,
          message: `Theo lịch follow-up đã đặt.`,
          entity_type: "lead",
          entity_id: l.id,
        });
      }
    }

    // ===== Deduplicate & Insert =====
    let sent = 0;
    for (const n of notifications) {
      // Check if already notified today
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", n.user_id)
        .eq("entity_id", n.entity_id)
        .eq("type", n.type)
        .gte("created_at", todayStr + "T00:00:00Z")
        .lt("created_at", todayStr + "T23:59:59Z");

      if ((count || 0) > 0) continue;

      const { error } = await supabase.from("notifications").insert(n);
      if (!error) sent++;
    }

    return new Response(JSON.stringify({ sent, total_candidates: notifications.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("daily-reminders error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
