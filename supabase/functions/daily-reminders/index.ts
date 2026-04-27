
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

    // Web Push được gửi tự động qua DB trigger notify_push_on_insert → OneSignal
    // (function này chỉ cần insert notifications, không cần gọi push thủ công nữa)

    const today = new Date();
    type Notif = {
      user_id: string;
      type: string;
      title: string;
      message: string;
      entity_type: string;
      entity_id: string;
      priority?: string;
    };
    const notifications: Notif[] = [];

    const getMMDD = (daysOffset: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() + daysOffset);
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${mm}-${dd}`;
    };
    const offsetDateStr = (daysOffset: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() + daysOffset);
      return d.toISOString().split("T")[0];
    };

    const todayStr = today.toISOString().split("T")[0];

    // ===== 1. Customer birthdays =====
    const { data: personalCustomers } = await supabase
      .from("customers")
      .select("id, full_name, date_of_birth, assigned_sale_id")
      .not("date_of_birth", "is", null)
      .not("assigned_sale_id", "is", null);

    if (personalCustomers) {
      const targetMMDDs = [0, 1, 2, 3].map(getMMDD);
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
          priority: "normal",
        });
      }
    }

    // ===== 2. B2B contact birthdays =====
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
          priority: "normal",
        });
      }
    }

    // ===== 3. Company anniversaries =====
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
          priority: "normal",
        });
      }
    }

    // ===== 4. Lead follow-up today =====
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
          priority: "high",
        });
      }
    }

    // ===== 5. Lead bị bỏ quên =====
    const { data: forgottenLeads } = await supabase
      .from("leads")
      .select("id, full_name, assigned_to, last_contact_at, department_id")
      .not("assigned_to", "is", null)
      .not("status", "in", "(WON,LOST,DORMANT)")
      .not("last_contact_at", "is", null);
    if (forgottenLeads) {
      for (const l of forgottenLeads) {
        if (!l.assigned_to || !l.last_contact_at) continue;
        const daysSilent = Math.floor((today.getTime() - new Date(l.last_contact_at).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSilent < 7) continue;
        notifications.push({
          user_id: l.assigned_to,
          type: "LEAD_FORGOTTEN",
          title: `⚠️ Lead bị bỏ quên`,
          message: `Lead "${l.full_name}" đã ${daysSilent} ngày chưa được liên hệ. Hãy chăm sóc ngay!`,
          entity_type: "lead",
          entity_id: l.id,
          priority: "high",
        });
        if (daysSilent > 14 && l.department_id) {
          const { data: leaders } = await supabase
            .from("profiles").select("id")
            .eq("department_id", l.department_id)
            .in("role", ["GDKD", "MANAGER"])
            .eq("is_active", true);
          if (leaders) {
            for (const leader of leaders) {
              notifications.push({
                user_id: leader.id,
                type: "LEAD_FORGOTTEN",
                title: `⚠️ Lead bỏ quên ${daysSilent} ngày`,
                message: `Lead "${l.full_name}" đã ${daysSilent} ngày không liên hệ.`,
                entity_type: "lead",
                entity_id: l.id,
                priority: "critical",
              });
            }
          }
        }
      }
    }

    // ===== 6. Follow-up quá hạn =====
    const { data: overdueLeads } = await supabase
      .from("leads")
      .select("id, full_name, assigned_to, follow_up_date")
      .not("assigned_to", "is", null)
      .not("status", "in", "(WON,LOST,DORMANT)")
      .lt("follow_up_date", todayStr)
      .not("follow_up_date", "is", null);
    if (overdueLeads) {
      for (const l of overdueLeads) {
        if (!l.assigned_to || !l.follow_up_date) continue;
        const daysOverdue = Math.floor((today.getTime() - new Date(l.follow_up_date).getTime()) / (1000 * 60 * 60 * 24));
        notifications.push({
          user_id: l.assigned_to,
          type: "FOLLOW_UP_OVERDUE",
          title: `🔴 Quá hạn follow-up!`,
          message: `Lead "${l.full_name}" đã quá hạn follow-up ${daysOverdue} ngày!`,
          entity_type: "lead",
          entity_id: l.id,
          priority: "high",
        });
      }
    }

    // ===== 6b. Lead không có lịch hẹn (>2 ngày từ khi tạo) =====
    const twoDaysAgo = new Date(today); twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const threeDaysAgoIso = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const { data: noScheduleLeads } = await supabase
      .from("leads")
      .select("id, full_name, assigned_to, department_id, created_at")
      .is("follow_up_date", null)
      .not("status", "in", "(WON,LOST,DORMANT,NURTURE,NEW)")
      .not("assigned_to", "is", null)
      .lt("created_at", twoDaysAgo.toISOString());
    if (noScheduleLeads && noScheduleLeads.length > 0) {
      // Dedupe: skip leads with notification of same type within last 3 days
      const leadIds = noScheduleLeads.map((l: any) => l.id);
      const { data: recentNotifs } = await supabase
        .from("notifications")
        .select("entity_id")
        .eq("type", "lead_no_schedule")
        .gte("created_at", threeDaysAgoIso)
        .in("entity_id", leadIds);
      const dedupeSet = new Set((recentNotifs || []).map((n: any) => n.entity_id));

      for (const l of noScheduleLeads) {
        if (!l.assigned_to || dedupeSet.has(l.id)) continue;
        const daysSince = Math.floor((today.getTime() - new Date(l.created_at).getTime()) / (1000 * 60 * 60 * 24));
        notifications.push({
          user_id: l.assigned_to,
          type: "lead_no_schedule",
          title: `📅 Lead chưa có lịch hẹn: ${l.full_name}`,
          message: `Đã ${daysSince} ngày chưa lên lịch follow-up. Hãy đặt lịch ngay!`,
          entity_type: "lead",
          entity_id: l.id,
          priority: "high",
        });
        // Notify GDKD cùng phòng
        if (l.department_id) {
          const { data: gdkds } = await supabase
            .from("profiles").select("id")
            .eq("department_id", l.department_id)
            .in("role", ["GDKD"])
            .eq("is_active", true);
          for (const g of gdkds || []) {
            notifications.push({
              user_id: g.id,
              type: "lead_no_schedule",
              title: `📅 Lead chưa có lịch hẹn`,
              message: `"${l.full_name}" đã ${daysSince} ngày chưa lên lịch follow-up.`,
              entity_type: "lead",
              entity_id: l.id,
              priority: "normal",
            });
          }
        }
      }
    }
    const futureDateStr = offsetDateStr(60);
    const { data: travelLeads } = await supabase
      .from("leads")
      .select("id, full_name, assigned_to, planned_travel_date")
      .not("assigned_to", "is", null)
      .not("status", "in", "(WON,LOST)")
      .gte("planned_travel_date", todayStr)
      .lte("planned_travel_date", futureDateStr);
    if (travelLeads) {
      for (const l of travelLeads) {
        if (!l.assigned_to || !l.planned_travel_date) continue;
        const daysLeft = Math.floor((new Date(l.planned_travel_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        notifications.push({
          user_id: l.assigned_to,
          type: "TRAVEL_DATE_NEAR",
          title: `✈️ KH sắp đi tour`,
          message: `Lead "${l.full_name}" dự kiến đi tour ngày ${l.planned_travel_date} (còn ${daysLeft} ngày).`,
          entity_type: "lead",
          entity_id: l.id,
          priority: "normal",
        });
      }
    }

    // ===== LỚP 3.1: Booking sắp khởi hành (T-7, T-3, T-1) =====
    // dùng deposit_due_at làm placeholder cho departure? Không có cột departure_date.
    // → Dùng booking_itineraries.actual_date min làm ngày khởi hành.
    const departureTargets: Record<string, number> = {
      [offsetDateStr(7)]: 7,
      [offsetDateStr(3)]: 3,
      [offsetDateStr(1)]: 1,
    };
    const { data: itineraries } = await supabase
      .from("booking_itineraries")
      .select("booking_id, actual_date, day_number")
      .in("actual_date", Object.keys(departureTargets))
      .eq("day_number", 1);
    if (itineraries && itineraries.length) {
      const bookingIds = [...new Set(itineraries.map((i: any) => i.booking_id))];
      const { data: bks } = await supabase
        .from("bookings")
        .select("id, code, sale_id, department_id, status")
        .in("id", bookingIds)
        .not("status", "in", "(CANCELLED,COMPLETED)");
      const itinMap = new Map(itineraries.map((i: any) => [i.booking_id, i.actual_date]));
      if (bks) {
        for (const b of bks) {
          const depDate = itinMap.get(b.id);
          if (!depDate) continue;
          const daysLeft = departureTargets[depDate];
          const priority = daysLeft === 1 ? "critical" : "high";
          // Sale
          if (b.sale_id) {
            notifications.push({
              user_id: b.sale_id,
              type: "BOOKING_DEPARTURE_NEAR",
              title: `✈️ Tour khởi hành ${daysLeft === 1 ? "ngày mai" : `còn ${daysLeft} ngày`}`,
              message: `Booking ${b.code} khởi hành ${depDate}. Kiểm tra lại dịch vụ!`,
              entity_type: "booking",
              entity_id: b.id,
              priority,
            });
          }
          // DIEUHAN + dept Manager
          const { data: opsAndMgrs } = await supabase
            .from("profiles").select("id, role, department_id")
            .eq("is_active", true)
            .or(`role.eq.DIEUHAN,and(role.in.(MANAGER,GDKD),department_id.eq.${b.department_id})`);
          if (opsAndMgrs) {
            for (const p of opsAndMgrs) {
              if (p.id === b.sale_id) continue;
              notifications.push({
                user_id: p.id,
                type: "BOOKING_DEPARTURE_NEAR",
                title: `✈️ Tour ${b.code} khởi hành ${daysLeft === 1 ? "ngày mai" : `còn ${daysLeft} ngày`}`,
                message: `Booking ${b.code} khởi hành ${depDate}.`,
                entity_type: "booking",
                entity_id: b.id,
                priority,
              });
            }
          }
        }
      }
    }

    // ===== LỚP 3.2: Hạn thanh toán (deposit/remaining) ≤ today+3 =====
    const dueLimit = offsetDateStr(3);
    const { data: payDueBookings } = await supabase
      .from("bookings")
      .select("id, code, sale_id, deposit_due_at, remaining_due_at, deposit_amount, remaining_amount, status")
      .not("status", "in", "(CANCELLED,COMPLETED)")
      .or(`and(deposit_due_at.gte.${todayStr},deposit_due_at.lte.${dueLimit}),and(remaining_due_at.gte.${todayStr},remaining_due_at.lte.${dueLimit})`);
    if (payDueBookings) {
      const { data: ketoanUsers } = await supabase
        .from("profiles").select("id").eq("role", "KETOAN").eq("is_active", true);
      for (const b of payDueBookings) {
        const checks = [
          { date: b.deposit_due_at, label: "đặt cọc", amount: b.deposit_amount },
          { date: b.remaining_due_at, label: "thanh toán cuối", amount: b.remaining_amount },
        ];
        for (const c of checks) {
          if (!c.date) continue;
          const d = c.date;
          if (d < todayStr || d > dueLimit) continue;
          const daysLeft = Math.floor((new Date(d).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          const dayLabel = daysLeft <= 0 ? "hôm nay" : `còn ${daysLeft} ngày`;
          const recipients = new Set<string>();
          if (b.sale_id) recipients.add(b.sale_id);
          if (ketoanUsers) ketoanUsers.forEach((k: any) => recipients.add(k.id));
          for (const uid of recipients) {
            notifications.push({
              user_id: uid,
              type: "PAYMENT_DUE",
              title: `💰 Hạn ${c.label}: ${b.code}`,
              message: `Booking ${b.code} đến hạn ${c.label} ${dayLabel} (${d}).`,
              entity_type: "booking",
              entity_id: b.id,
              priority: "high",
            });
          }
        }
      }
    }

    // ===== LỚP 3.3: Contract DRAFT >2 ngày =====
    const contractCutoff = offsetDateStr(-2);
    const { data: pendingContracts } = await supabase
      .from("contracts")
      .select("id, code, created_by, created_at")
      .eq("status", "DRAFT")
      .lte("created_at", contractCutoff + "T23:59:59Z");
    if (pendingContracts && pendingContracts.length) {
      const { data: approvers } = await supabase
        .from("profiles").select("id, role")
        .in("role", ["GDKD", "MANAGER", "DIEUHAN"])
        .eq("is_active", true);
      if (approvers) {
        for (const c of pendingContracts) {
          const days = Math.floor((today.getTime() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24));
          for (const a of approvers) {
            notifications.push({
              user_id: a.id,
              type: "CONTRACT_APPROVAL_OVERDUE",
              title: `📄 Hợp đồng chờ duyệt: ${c.code}`,
              message: `HĐ ${c.code} ở trạng thái DRAFT đã ${days} ngày. Cần xử lý!`,
              entity_type: "contract",
              entity_id: c.id,
              priority: "normal",
            });
          }
        }
      }
    }

    // ===== LỚP 3.4: Quotation SENT >5 ngày không phản hồi =====
    const quoteCutoff = offsetDateStr(-5);
    const { data: staleQuotes } = await supabase
      .from("quotations")
      .select("id, code, created_by, created_at, status")
      .eq("status", "SENT")
      .lte("created_at", quoteCutoff + "T23:59:59Z");
    if (staleQuotes) {
      for (const q of staleQuotes) {
        if (!q.created_by) continue;
        const days = Math.floor((today.getTime() - new Date(q.created_at).getTime()) / (1000 * 60 * 60 * 24));
        notifications.push({
          user_id: q.created_by,
          type: "QUOTATION_NO_RESPONSE",
          title: `📋 Báo giá ${q.code} chưa phản hồi`,
          message: `Báo giá ${q.code} đã gửi ${days} ngày. Hãy follow-up!`,
          entity_type: "quotation",
          entity_id: q.id,
          priority: "normal",
        });
      }
    }

    // ===== LỚP 3.5: Sinh nhật nhân viên (today) =====
    const todayMMDD = getMMDD(0);
    const { data: allEmployees } = await supabase
      .from("employees")
      .select("id, full_name, date_of_birth, department_id")
      .not("date_of_birth", "is", null)
      .eq("status", "ACTIVE");
    if (allEmployees) {
      const birthdayEmps = allEmployees.filter((e: any) => {
        if (!e.date_of_birth) return false;
        const d = new Date(e.date_of_birth);
        return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` === todayMMDD;
      });
      if (birthdayEmps.length) {
        for (const emp of birthdayEmps) {
          const { data: recipients } = await supabase
            .from("profiles").select("id, role, department_id")
            .eq("is_active", true)
            .or(`role.in.(HR_MANAGER,HCNS,ADMIN),and(role.in.(MANAGER,GDKD),department_id.eq.${emp.department_id})`);
          if (recipients) {
            for (const r of recipients) {
              notifications.push({
                user_id: r.id,
                type: "EMPLOYEE_BIRTHDAY",
                title: `🎂 Sinh nhật nhân viên hôm nay`,
                message: `${emp.full_name} sinh nhật hôm nay. Gửi lời chúc!`,
                entity_type: "employee",
                entity_id: emp.id,
                priority: "normal",
              });
            }
          }
        }
      }
    }

    // ===== LỚP 3.6: HĐLĐ sắp hết hạn (T-30, T-7) =====
    const contractExpiryTargets: Record<string, number> = {
      [offsetDateStr(30)]: 30,
      [offsetDateStr(7)]: 7,
    };
    const { data: expiringEmps } = await supabase
      .from("employees")
      .select("id, full_name, contract_expiry")
      .in("contract_expiry", Object.keys(contractExpiryTargets))
      .eq("status", "ACTIVE");
    if (expiringEmps && expiringEmps.length) {
      const { data: hrUsers } = await supabase
        .from("profiles").select("id")
        .in("role", ["HR_MANAGER", "HCNS", "ADMIN"])
        .eq("is_active", true);
      if (hrUsers) {
        for (const emp of expiringEmps) {
          const days = contractExpiryTargets[emp.contract_expiry];
          for (const u of hrUsers) {
            notifications.push({
              user_id: u.id,
              type: "EMPLOYEE_CONTRACT_EXPIRING",
              title: `📑 HĐLĐ sắp hết hạn (${days} ngày)`,
              message: `HĐLĐ của ${emp.full_name} hết hạn ${emp.contract_expiry}. Chuẩn bị gia hạn!`,
              entity_type: "employee",
              entity_id: emp.id,
              priority: "high",
            });
          }
        }
      }
    }

    // ===== FINANCE ESCALATION 48h/72h: Dự toán & Quyết toán chưa duyệt =====
    const now = new Date();
    const h48 = new Date(now.getTime() - 48 * 3600 * 1000).toISOString();
    const h72 = new Date(now.getTime() - 72 * 3600 * 1000).toISOString();

    const { data: ketoanUsers } = await supabase
      .from("profiles").select("id")
      .in("role", ["KETOAN", "ADMIN", "SUPER_ADMIN"])
      .eq("is_active", true);
    const { data: adminUsers } = await supabase
      .from("profiles").select("id")
      .in("role", ["ADMIN", "SUPER_ADMIN"])
      .eq("is_active", true);

    // Estimates pending_review > 48h
    const { data: staleEstimates } = await supabase
      .from("budget_estimates")
      .select("id, code, created_at, last_reminder_at")
      .eq("status", "pending_review")
      .lt("created_at", h48);

    for (const est of staleEstimates || []) {
      const ageHours = (now.getTime() - new Date(est.created_at).getTime()) / 3600000;
      const recipients = ageHours >= 72 ? adminUsers : ketoanUsers;
      if (!recipients?.length) continue;
      // Skip nếu đã nhắc trong 24h qua
      if (est.last_reminder_at && new Date(est.last_reminder_at) > new Date(now.getTime() - 24 * 3600 * 1000)) continue;

      const title = ageHours >= 72
        ? `🚨 Dự toán ${est.code} quá hạn duyệt 3 ngày`
        : `⏰ Nhắc duyệt dự toán ${est.code}`;
      const message = ageHours >= 72
        ? `Dự toán ${est.code} chờ duyệt đã quá ${Math.floor(ageHours)}h. Cần xử lý gấp.`
        : `Dự toán ${est.code} đã chờ duyệt ${Math.floor(ageHours)}h. Vui lòng duyệt.`;

      for (const u of recipients) {
        notifications.push({
          user_id: u.id,
          type: ageHours >= 72 ? "BUDGET_ESTIMATE_OVERDUE" : "BUDGET_ESTIMATE_REMIND",
          title, message,
          entity_type: "finance",
          entity_id: est.id,
          priority: "high",
        });
      }
      await supabase.from("budget_estimates").update({ last_reminder_at: now.toISOString() }).eq("id", est.id);
    }

    // Settlements pending_accountant or pending_ceo > 48h
    const { data: staleSettlements } = await supabase
      .from("budget_settlements")
      .select("id, code, status, created_at, last_reminder_at")
      .in("status", ["pending_accountant", "pending_ceo"])
      .lt("created_at", h48);

    for (const st of staleSettlements || []) {
      const ageHours = (now.getTime() - new Date(st.created_at).getTime()) / 3600000;
      // Pending CEO → escalate cho ADMIN. Pending KT → KT (≥72h thì admin)
      const recipients = st.status === "pending_ceo" || ageHours >= 72 ? adminUsers : ketoanUsers;
      if (!recipients?.length) continue;
      if (st.last_reminder_at && new Date(st.last_reminder_at) > new Date(now.getTime() - 24 * 3600 * 1000)) continue;

      const title = ageHours >= 72
        ? `🚨 Quyết toán ${st.code} quá hạn duyệt 3 ngày`
        : `⏰ Nhắc duyệt quyết toán ${st.code}`;
      const message = `Quyết toán ${st.code} (${st.status}) đã chờ ${Math.floor(ageHours)}h.`;

      for (const u of recipients) {
        notifications.push({
          user_id: u.id,
          type: ageHours >= 72 ? "BUDGET_SETTLEMENT_OVERDUE" : "BUDGET_SETTLEMENT_REMIND",
          title, message,
          entity_type: "finance",
          entity_id: st.id,
          priority: "high",
        });
      }
      await supabase.from("budget_settlements").update({ last_reminder_at: now.toISOString() }).eq("id", st.id);
    }

    // Công nợ KH quá hạn > 30 ngày → ADMIN
    const d30 = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const { data: overdueAR } = await supabase
      .from("accounts_receivable")
      .select("id, customer_id, amount_remaining, due_date, customers(full_name)")
      .lt("due_date", d30)
      .gt("amount_remaining", 0);
    if (overdueAR?.length && adminUsers?.length) {
      for (const ar of overdueAR) {
        for (const u of adminUsers) {
          notifications.push({
            user_id: u.id,
            type: "AR_OVERDUE_30D",
            title: `💰 Công nợ quá hạn > 30 ngày`,
            message: `KH ${(ar as any).customers?.full_name || "?"} còn nợ ${Number(ar.amount_remaining).toLocaleString("vi-VN")}đ — hạn ${ar.due_date}`,
            entity_type: "finance",
            entity_id: ar.id,
            priority: "high",
          });
        }
      }
    }

    // Dòng tiền âm tháng hiện tại → ADMIN
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    const { data: cf } = await supabase
      .from("cashflow_monthly")
      .select("id, net_cashflow")
      .eq("year", curYear).eq("month", curMonth).maybeSingle();
    if (cf && Number(cf.net_cashflow ?? 0) < 0 && adminUsers?.length) {
      for (const u of adminUsers) {
        notifications.push({
          user_id: u.id,
          type: "CASHFLOW_NEGATIVE",
          title: `⚠️ Dòng tiền tháng ${curMonth} âm`,
          message: `Net cashflow tháng ${curMonth}/${curYear}: ${Number(cf.net_cashflow).toLocaleString("vi-VN")}đ`,
          entity_type: "finance",
          entity_id: cf.id,
          priority: "high",
        });
      }
    }

    // ===== A3. Payment Overdue: bookings còn nợ + remaining_due_at < today =====
    const { data: ketoanUsersA3 } = await supabase
      .from("profiles").select("id")
      .eq("role", "KETOAN").eq("is_active", true);
    const ketoanIds = (ketoanUsersA3 ?? []).map((u: any) => u.id);

    const { data: overdueBookings } = await supabase
      .from("bookings")
      .select("id, code, remaining_amount, remaining_due_at, sale_id, customers(full_name)")
      .gt("remaining_amount", 0)
      .not("remaining_due_at", "is", null)
      .lt("remaining_due_at", todayStr);

    if (overdueBookings) {
      for (const b of overdueBookings as any[]) {
        const customerName = b.customers?.full_name ?? "(không rõ KH)";
        const amountStr = Number(b.remaining_amount ?? 0).toLocaleString("vi-VN");
        const title = `⏰ Thanh toán quá hạn: ${b.code ?? b.id}`;
        const message = `Còn nợ ${amountStr} VNĐ — KH: ${customerName}`;
        const recipients = new Set<string>();
        if (b.sale_id) recipients.add(b.sale_id);
        for (const ktId of ketoanIds) recipients.add(ktId);
        for (const uid of recipients) {
          notifications.push({
            user_id: uid,
            type: "payment_overdue",
            title,
            message,
            entity_type: "booking",
            entity_id: b.id,
            priority: "high",
          });
        }
      }
    }

    // ===== B1. Contract Expiry: full_payment_due_at trong 7 ngày tới =====
    const { data: dieuhanUsers } = await supabase
      .from("profiles").select("id")
      .eq("role", "DIEUHAN").eq("is_active", true);
    const dieuhanIds = (dieuhanUsers ?? []).map((u: any) => u.id);

    const sevenDaysAhead = offsetDateStr(7);
    const { data: expiringContracts } = await supabase
      .from("contracts")
      .select("id, code, full_payment_due_at, status, booking_id, bookings(sale_id, customers(full_name))")
      .not("full_payment_due_at", "is", null)
      .gte("full_payment_due_at", todayStr)
      .lte("full_payment_due_at", sevenDaysAhead);

    if (expiringContracts) {
      for (const c of expiringContracts as any[]) {
        if (c.status && !["active", "signed", "approved"].includes(String(c.status).toLowerCase())) {
          // skip non-active contracts
        }
        const dueDate = new Date(c.full_payment_due_at);
        const daysLeft = Math.max(0, Math.ceil((dueDate.getTime() - today.getTime()) / 86400000));
        const customerName = c.bookings?.customers?.full_name ?? "(không rõ KH)";
        const saleId = c.bookings?.sale_id;
        const title = `📄 HĐ sắp đến hạn: ${c.code ?? c.id}`;
        const message = `Còn ${daysLeft} ngày — KH: ${customerName}`;
        const recipients = new Set<string>();
        if (saleId) recipients.add(saleId);
        for (const dhId of dieuhanIds) recipients.add(dhId);
        for (const uid of recipients) {
          notifications.push({
            user_id: uid,
            type: "contract_expiry",
            title,
            message,
            entity_type: "contract",
            entity_id: c.id,
            priority: "high",
          });
        }
      }
    }

    // ===== B2. Tour Departure: remaining_due_at trong 3 ngày tới =====
    const { data: tourUsers } = await supabase
      .from("profiles").select("id")
      .eq("role", "TOUR").eq("is_active", true);
    const tourIds = (tourUsers ?? []).map((u: any) => u.id);

    const threeDaysAhead = offsetDateStr(3);
    const { data: upcomingBookings } = await supabase
      .from("bookings")
      .select("id, code, remaining_due_at, pax_total, sale_id, status, customers(full_name)")
      .not("remaining_due_at", "is", null)
      .gte("remaining_due_at", todayStr)
      .lte("remaining_due_at", threeDaysAhead);

    if (upcomingBookings) {
      for (const b of upcomingBookings as any[]) {
        const st = String(b.status ?? "").toUpperCase();
        if (st === "CANCELLED" || st === "CLOSED") continue;
        const customerName = b.customers?.full_name ?? "(không rõ KH)";
        const title = `✈️ Tour sắp khởi hành: ${b.code ?? b.id}`;
        const message = `${customerName} — ${b.pax_total ?? "?"} khách — Hạn TT: ${b.remaining_due_at}`;
        const recipients = new Set<string>();
        if (b.sale_id) recipients.add(b.sale_id);
        for (const dhId of dieuhanIds) recipients.add(dhId);
        for (const tId of tourIds) recipients.add(tId);
        for (const uid of recipients) {
          notifications.push({
            user_id: uid,
            type: "tour_departure",
            title,
            message,
            entity_type: "booking",
            entity_id: b.id,
            priority: "high",
          });
        }
      }
    }

    // ===== Deduplicate & Insert =====
    let sent = 0;
    for (const n of notifications) {
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
      if (!error) { sent++; }
    }

    // ===== LỚP 2: Escalation Lv1 — noti chưa đọc >3 ngày =====
    const escalationCutoff = new Date(today);
    escalationCutoff.setDate(escalationCutoff.getDate() - 3);
    const { data: staleNotifs } = await supabase
      .from("notifications")
      .select("id, user_id, type, entity_id")
      .eq("is_read", false)
      .eq("escalation_level", 0)
      .lt("created_at", escalationCutoff.toISOString());

    let escalated = 0;
    if (staleNotifs && staleNotifs.length) {
      // Group by user_id
      const byUser = new Map<string, { ids: string[]; count: number }>();
      for (const n of staleNotifs) {
        const grp = byUser.get(n.user_id) || { ids: [], count: 0 };
        grp.ids.push(n.id);
        grp.count++;
        byUser.set(n.user_id, grp);
      }

      for (const [userId, grp] of byUser) {
        // Lookup staff info + dept managers
        const { data: staff } = await supabase
          .from("profiles").select("id, full_name, department_id, role")
          .eq("id", userId).maybeSingle();
        if (!staff || !staff.department_id) continue;

        const { data: managers } = await supabase
          .from("profiles").select("id")
          .eq("department_id", staff.department_id)
          .in("role", ["MANAGER", "GDKD"])
          .eq("is_active", true)
          .neq("id", userId);

        if (managers && managers.length) {
          for (const mgr of managers) {
            // Dedup: 1 noti gộp / mgr / staff / hôm nay
            const { count: existing } = await supabase
              .from("notifications")
              .select("id", { count: "exact", head: true })
              .eq("user_id", mgr.id)
              .eq("type", "ESCALATION_LV1")
              .eq("entity_id", userId)
              .gte("created_at", todayStr + "T00:00:00Z");
            if ((existing || 0) > 0) continue;

            const escNotif = {
              user_id: mgr.id,
              type: "ESCALATION_LV1",
              title: `⚠️ ${staff.full_name} có ${grp.count} cảnh báo chưa đọc`,
              message: `${staff.full_name} đang có ${grp.count} cảnh báo quá 3 ngày chưa đọc. Cần nhắc nhở!`,
              entity_type: "employee",
              entity_id: userId,
              priority: "high",
              is_read: false,
            };
            const { error } = await supabase.from("notifications").insert(escNotif);
            if (!error) {
              escalated++;
            }
          }
        }

        // Mark all stale notifs as escalated
        await supabase
          .from("notifications")
          .update({ escalation_level: 1, escalated_at: new Date().toISOString() })
          .in("id", grp.ids);
      }
    }

    // Web Push được trigger DB tự gửi qua OneSignal — không cần fire thủ công

    return new Response(JSON.stringify({ sent, escalated, total_candidates: notifications.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("daily-reminders error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
