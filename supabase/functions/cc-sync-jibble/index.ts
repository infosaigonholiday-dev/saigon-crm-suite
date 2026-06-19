// Edge Function: cc-sync-jibble v4
// -----------------------------------------------------------------------------
// Sync chấm công từ Jibble về DB nội bộ.
// Dùng time-tracking.prod.jibble.io (microservice) thay vì workspace.prod.jibble.io.
//
// Auth (sửa ở v4):
//   - Cron jobs gửi header `X-Cron-Secret: <CRON_SECRET>` → bypass user auth.
//   - UI users gửi Bearer JWT user session → verify qua auth.getClaims + role check.
//   - Các request khác → 401.
//
// Lịch chạy (thay vì 30 phút/lần):
//   - 08:30 sáng T2-T7: sync data hôm qua + sáng nay (L1 48h)
//   - 17:45 chiều T2-T7: sync data buổi chiều (L1 48h)
//
// Luồng:
//   1. Verify auth (cron secret HOẶC user JWT)
//   2. OAuth2 token từ identity.prod.jibble.io
//   3. GET time-tracking/v1/People?$top=1000
//   4. Map qua email với cc_nhan_vien_map
//   5. GET time-tracking/v1/TimeEntries?$top=5000
//   6. Upsert từng entry vào cc_su_kien
//   7. Gọi SQL function rebuild_cc_ngay_for_range() để tổng hợp cc_ngay
//   8. Ghi cc_vi_pham_tu_dong + cc_sync_log
//
// Endpoint: https://time-tracking.prod.jibble.io/v1
// -----------------------------------------------------------------------------

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const JIBBLE_TOKEN_URL = "https://identity.prod.jibble.io/connect/token";
const JIBBLE_TT_BASE = "https://time-tracking.prod.jibble.io/v1";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getJibbleToken(): Promise<string> {
  const a = Deno.env.get("JIBBLE_API_KEY")?.trim();
  const b = Deno.env.get("JIBBLE_API_SECRET")?.trim();
  if (!a || !b) throw new Error("Thiếu JIBBLE_API_KEY / JIBBLE_API_SECRET");
  const tryToken = async (clientId: string, clientSecret: string) => {
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    });
    return await fetch(JIBBLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
  };
  let r = await tryToken(a, b);
  if (!r.ok) r = await tryToken(b, a);
  if (!r.ok) throw new Error(`Jibble token ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return (await r.json()).access_token as string;
}

async function fetchTTPeople(token: string): Promise<any[]> {
  // time-tracking service: $top max = 1000
  const r = await fetch(`${JIBBLE_TT_BASE}/People?$top=1000`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!r.ok) throw new Error(`People ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const data = await r.json();
  return Array.isArray(data) ? data : (data?.value ?? []);
}

async function fetchTTTimeEntries(
  token: string,
  fromISO?: string,
  toISO?: string,
): Promise<any[]> {
  let url = `${JIBBLE_TT_BASE}/TimeEntries?$top=1000&$orderby=time asc`;
  if (fromISO && toISO) {
    // Thử filter với time; nếu 500 thì bỏ filter
    const filtered = `${JIBBLE_TT_BASE}/TimeEntries?$filter=time ge ${fromISO} and time le ${toISO}&$top=1000&$orderby=time asc`;
    const r = await fetch(filtered, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    if (r.ok) {
      const d = await r.json();
      return Array.isArray(d) ? d : (d?.value ?? []);
    }
    // Fallback: lấy hết + filter client-side
    console.warn(`[cc-sync-jibble] Date filter failed, fallback to client-side`);
  }
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!r.ok) throw new Error(`TimeEntries ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const d = await r.json();
  return Array.isArray(d) ? d : (d?.value ?? []);
}

function toVNDateString(d: Date): string {
  const utcMs = d.getTime();
  const vnMs = utcMs + 7 * 3600 * 1000;
  const vn = new Date(vnMs);
  const y = vn.getUTCFullYear();
  const m = String(vn.getUTCMonth() + 1).padStart(2, "0");
  const day = String(vn.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface ParsedEvent {
  jibble_entry_id: string;
  employee_id: string;
  loai: "In" | "Out";
  thoi_diem: string;
  belongs_to_date: string;
  activity_id: string | null;
  location_id: string | null;
  client_type: string | null;
  is_manual: boolean;
  is_unusual: boolean;
  is_offline: boolean;
  is_automatic: boolean;
  is_outside_geofence: boolean;
  jibble_status: string | null;
  coordinates_lat: number | null;
  coordinates_lng: number | null;
  address: string | null;
  jibble_created_at: string | null;
  jibble_updated_at: string | null;
  prev_entry_id: string | null;
  next_entry_id: string | null;
  note: string | null;
}

function entryToEvent(entry: any, employeeId: string): ParsedEvent | null {
  const id = String(entry.id ?? "");
  const type = String(entry.type ?? "").toLowerCase();
  if (!id || (type !== "in" && type !== "out")) return null;
  const t = new Date(entry.time ?? entry.localTime);
  if (isNaN(t.getTime())) return null;
  const ts = t.toISOString();
  const coords = entry.coordinates ?? null;
  return {
    jibble_entry_id: `${id}__${type === "in" ? "In" : "Out"}`,
    employee_id: employeeId,
    loai: type === "in" ? "In" : "Out",
    thoi_diem: ts,
    belongs_to_date: toVNDateString(t),
    activity_id: entry.activityId ?? null,
    location_id: entry.locationId ?? null,
    client_type: entry.clientType ?? null,
    is_manual: !!entry.isManual,
    is_unusual: !!entry.isUnusual,
    is_offline: !!entry.isOffline,
    is_automatic: !!entry.isAutomatic,
    is_outside_geofence: !!entry.isOutsideGeofence,
    jibble_status: entry.status ?? null,
    coordinates_lat: coords?.latitude ?? null,
    coordinates_lng: coords?.longitude ?? null,
    address: entry.address ?? null,
    jibble_created_at: entry.createdAt ?? null,
    jibble_updated_at: entry.updatedAt ?? null,
    prev_entry_id: entry.previousTimeEntryId ?? null,
    next_entry_id: entry.nextTimeEntryId ?? null,
    note: entry.note ?? null,
  };
}

function resolveRange(
  type: string,
  payload: { from?: string; to?: string; days?: number } = {},
): { fromISO: string; toISO: string; fromDate: string; toDate: string } {
  const now = new Date();
  const toISO = now.toISOString();
  let from: Date;
  if (type === "L1_INCREMENTAL") {
    // 48h gần nhất (buffer 24h)
    from = new Date(now.getTime() - 48 * 3600 * 1000);
  } else if (type === "L2_FULL") {
    const days = payload.days ?? 30;
    from = new Date(now.getTime() - days * 24 * 3600 * 1000);
  } else if (type === "MANUAL") {
    const f = payload.from ? new Date(payload.from) : new Date(now.getTime() - 30 * 86400000);
    const t = payload.to ? new Date(payload.to) : now;
    return {
      fromISO: f.toISOString(),
      toISO: t.toISOString(),
      fromDate: toVNDateString(f),
      toDate: toVNDateString(t),
    };
  } else {
    from = new Date(now.getTime() - 24 * 3600 * 1000);
  }
  return {
    fromISO: from.toISOString(),
    toISO,
    fromDate: toVNDateString(from),
    toDate: toVNDateString(now),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const startedAt = new Date();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  let body: { type?: string; from?: string; to?: string; days?: number; source?: string } = {};
  try { body = await req.json().catch(() => ({})); } catch { /* ignore */ }
  const type = body.type ?? "L1_INCREMENTAL";
  const source = body.source ?? "cron";

  const range = resolveRange(type, body);
  const { data: logRow, error: logErr } = await admin
    .from("cc_sync_log")
    .insert({
      loai_sync: type === "L1_INCREMENTAL" ? "L_DAILY" : type === "L2_FULL" ? "L_MONTHLY" : "MANUAL",
      bat_dau: startedAt.toISOString(),
      so_phien_moi: 0, so_phien_cap_nhat: 0, so_vi_pham_phat_sinh: 0,
      trang_thai: "OK",
      loi: `[${source}] range=${range.fromISO} → ${range.toISO}`,
    })
    .select("id").single();
  const logId = logRow?.id;

  async function fail(message: string, status = 500) {
    console.error(`[cc-sync-jibble] ${message}`);
    if (logId) {
      await admin.from("cc_sync_log").update({
        ket_thuc: new Date().toISOString(),
        trang_thai: "LOI",
        loi: message.slice(0, 1000),
      }).eq("id", logId);
    }
    return jsonResponse({ ok: false, error: message, log_id: logId }, status);
  }

  try {
    // 1) Auth — 2 nhánh rõ ràng:
    //    a) Cron: gửi X-Cron-Secret header (khớp env CRON_SECRET) → pass
    //    b) UI user: gửi Bearer JWT user session → verify qua auth.getClaims + role
    //    c) Còn lại → 401
    const cronSecret = Deno.env.get("CRON_SECRET")?.trim();
    const sentCronSecret = req.headers.get("X-Cron-Secret")?.trim();
    const isCron = !!cronSecret && sentCronSecret === cronSecret;

    const authHeader = req.headers.get("Authorization");
    const isBearerUser = authHeader?.startsWith("Bearer ");

    if (isCron) {
      // OK — bypass user auth. Log để dễ debug.
      console.log(`[cc-sync-jibble] cron auth OK (source=${source})`);
    } else if (isBearerUser) {
      const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claims, error: claimsErr } = await userClient.auth.getClaims(
        authHeader.replace("Bearer ", ""),
      );
      if (claimsErr || !claims?.claims) return fail("Unauthorized", 401);
      const userId = claims.claims.sub as string;
      const { data: profile } = await admin
        .from("profiles")
        .select("role, is_active")
        .eq("id", userId)
        .maybeSingle();
      const allowed = ["ADMIN", "SUPER_ADMIN", "HR_MANAGER", "HCNS", "CEO"];
      if (!profile?.is_active || !allowed.includes(profile.role)) return fail("Forbidden", 403);
    } else {
      return fail("Unauthorized", 401);
    }

    // 2) Lấy token + People + TimeEntries
    const token = await getJibbleToken();
    const persons = await fetchTTPeople(token);
    const entries = await fetchTTTimeEntries(
      token,
      type === "L1_INCREMENTAL" ? range.fromISO : undefined,
      type === "L1_INCREMENTAL" ? range.toISO : undefined,
    );
    console.log(`[cc-sync-jibble] persons=${persons.length} entries=${entries.length}`);

    // 3) Build map từ cc_nhan_vien_map
    const { data: maps, error: mapErr } = await admin
      .from("cc_nhan_vien_map")
      .select("id, employee_id, jibble_person_id, jibble_tt_person_id, jibble_email, status, jibble_tt_full_name")
      .not("jibble_email", "is", null);
    if (mapErr) throw mapErr;

    // 4) Build lookup: tt_person_id → map row
    // Phát hiện thực tế (probe 11/06/2026): workspace personId VÀ time-tracking personId
    // là CÙNG MỘT ID (khác với comment cũ trong migration 20260609190000_tt_columns).
    // → match cả 2 trường.
    const ttById = new Map<string, { id: string; employee_id: string; tt_person_id: string; fullName: string | null; status: string | null; latest: string | null }>();
    for (const p of persons) {
      const id = String(p.id);
      ttById.set(id, {
        id,
        employee_id: "",
        tt_person_id: id,
        fullName: p.fullName ?? null,
        status: p.status ?? null,
        latest: p.latestTimeEntryTime ?? null,
      });
    }

    // 5) Auto-fill jibble_tt_person_id = jibble_person_id (vì chúng bằng nhau)
    //    Đồng thời cập nhật snapshot từ People: latest_jibble_time, jibble_status,
    //    jibble_tt_status, jibble_tt_full_name.
    let autoFilledTtId = 0;
    let snapshotUpdated = 0;
    for (const m of maps ?? []) {
      // 5a) Auto-fill tt_person_id nếu thiếu nhưng có workspace personId
      if (!m.jibble_tt_person_id && m.jibble_person_id) {
        const ttPerson = ttById.get(m.jibble_person_id);
        if (ttPerson) {
          await admin
            .from("cc_nhan_vien_map")
            .update({
              jibble_tt_person_id: m.jibble_person_id,
              jibble_tt_status: ttPerson.status,
              jibble_tt_full_name: ttPerson.fullName,
            })
            .eq("id", m.id);
          m.jibble_tt_person_id = m.jibble_person_id;
          autoFilledTtId++;
        }
      }

      // 5b) Cập nhật snapshot từ tt People
      const ttId = m.jibble_tt_person_id || m.jibble_person_id;
      if (ttId) {
        const ttPerson = ttById.get(ttId);
        if (ttPerson && (ttPerson.latest || ttPerson.status || ttPerson.fullName)) {
          await admin
            .from("cc_nhan_vien_map")
            .update({
              latest_jibble_time: ttPerson.latest ?? undefined,
              jibble_status: ttPerson.status ?? undefined,
              jibble_tt_status: ttPerson.status ?? undefined,
              jibble_tt_full_name: ttPerson.fullName ?? undefined,
            })
            .eq("id", m.id);
          snapshotUpdated++;
        }
      }
    }

    // 6) Build set tt_person_id (gộp cả tt_id và workspace id) để filter entries
    const matchedPersonIds = new Set<string>();
    for (const m of maps ?? []) {
      if (m.jibble_tt_person_id) matchedPersonIds.add(m.jibble_tt_person_id);
      if (m.jibble_person_id) matchedPersonIds.add(m.jibble_person_id);
    }
    const allEvents: ParsedEvent[] = [];
    let skippedNoPerson = 0;
    const unmatchedPersonIds = new Set<string>();
    for (const e of entries) {
      const ttId = String(e.personId ?? "");
      if (!matchedPersonIds.has(ttId)) {
        skippedNoPerson++;
        unmatchedPersonIds.add(ttId);
        continue;
      }
      const mapRow = (maps ?? []).find(
        (m: any) => m.jibble_tt_person_id === ttId || m.jibble_person_id === ttId,
      );
      if (!mapRow) { skippedNoPerson++; continue; }
      const ev = entryToEvent(e, mapRow.employee_id);
      if (ev) allEvents.push(ev);
    }

    let soMoi = 0, soCapNhat = 0;
    if (allEvents.length > 0) {
      const jibbleIds = allEvents.map((e) => e.jibble_entry_id);
      const { data: existing } = await admin
        .from("cc_su_kien")
        .select("jibble_entry_id")
        .in("jibble_entry_id", jibbleIds);
      const existingSet = new Set((existing ?? []).map((r: any) => r.jibble_entry_id));
      soCapNhat = allEvents.filter((e) => existingSet.has(e.jibble_entry_id)).length;
      soMoi = allEvents.length - soCapNhat;

      const BATCH = 200;
      for (let i = 0; i < allEvents.length; i += BATCH) {
        const slice = allEvents.slice(i, i + BATCH);
        const { error: upErr } = await admin
          .from("cc_su_kien")
          .upsert(slice, { onConflict: "jibble_entry_id", ignoreDuplicates: false });
        if (upErr) throw upErr;
      }
    }

    // 6) Rebuild cc_ngay
    if (allEvents.length > 0) {
      const { error: rebuildErr } = await admin.rpc("rebuild_cc_ngay_for_range", {
        p_from: range.fromDate, p_to: range.toDate,
      });
      if (rebuildErr) console.warn(`[cc-sync-jibble] rebuild lỗi: ${rebuildErr.message}`);
    }

    // 7) Vi phạm — sinh tự động dựa trên cc_ngay:
    //    - phut_di_muon > 0          → DI_MUON
    //    - phut_ve_som > 0           → VE_SOM
    //    - trang_thai = QUEN_CHAM_RA → QUEN_CHAM_RA
    //    - trang_thai = QUEN_CHAM_VAO → QUEN_CHAM_VAO
    const { data: ngayCoVP } = await admin
      .from("cc_ngay")
      .select("id, employee_id, ngay, phut_di_muon, phut_ve_som, trang_thai")
      .gte("ngay", range.fromDate).lte("ngay", range.toDate)
      .or("phut_di_muon.gt.0,phut_ve_som.gt.0,trang_thai.eq.QUEN_CHAM_RA,trang_thai.eq.QUEN_CHAM_VAO")
      .limit(500);

    let soViPham = 0;
    if (ngayCoVP) {
      const ngayIds = ngayCoVP.map((n) => n.id);
      const { data: existingVp } = await admin.from("cc_vi_pham_tu_dong")
        .select("cc_ngay_id, loai").in("cc_ngay_id", ngayIds)
        .in("trang_thai_xet", ["CHO_XAC_NHAN", "DA_DAY_NE_NEP"]);
      const vpSet = new Set((existingVp ?? []).map((v: any) => `${v.cc_ngay_id}__${v.loai}`));
      const toInsert: any[] = [];
      for (const ng of ngayCoVP) {
        if (ng.phut_di_muon > 0 && !vpSet.has(`${ng.id}__DI_MUON`)) {
          toInsert.push({ cc_ngay_id: ng.id, employee_id: ng.employee_id, loai: "DI_MUON", chi_tiet: { phut: ng.phut_di_muon, ngay: ng.ngay }, trang_thai_xet: "CHO_XAC_NHAN" });
        }
        if (ng.phut_ve_som > 0 && !vpSet.has(`${ng.id}__VE_SOM`)) {
          toInsert.push({ cc_ngay_id: ng.id, employee_id: ng.employee_id, loai: "VE_SOM", chi_tiet: { phut: ng.phut_ve_som, ngay: ng.ngay }, trang_thai_xet: "CHO_XAC_NHAN" });
        }
        if (ng.trang_thai === "QUEN_CHAM_RA" && !vpSet.has(`${ng.id}__QUEN_CHAM_RA`)) {
          toInsert.push({ cc_ngay_id: ng.id, employee_id: ng.employee_id, loai: "QUEN_CHAM_RA", chi_tiet: { ngay: ng.ngay }, trang_thai_xet: "CHO_XAC_NHAN" });
        }
        if (ng.trang_thai === "QUEN_CHAM_VAO" && !vpSet.has(`${ng.id}__QUEN_CHAM_VAO`)) {
          toInsert.push({ cc_ngay_id: ng.id, employee_id: ng.employee_id, loai: "QUEN_CHAM_VAO", chi_tiet: { ngay: ng.ngay }, trang_thai_xet: "CHO_XAC_NHAN" });
        }
      }
      if (toInsert.length > 0) {
        await admin.from("cc_vi_pham_tu_dong").insert(toInsert);
        soViPham = toInsert.length;
      }
    }

    // 8) Snapshot cập nhật đã làm ở bước 5b

    const endedAt = new Date();
    await admin.from("cc_sync_log").update({
      ket_thuc: endedAt.toISOString(),
      so_phien_moi: soMoi, so_phien_cap_nhat: soCapNhat, so_vi_pham_phat_sinh: soViPham,
      trang_thai: "OK",
    }).eq("id", logId);

    return jsonResponse({
      ok: true, log_id: logId, type, source: "time-tracking", range,
      persons_fetched: persons.length, entries_fetched: entries.length,
      skipped_no_person: skippedNoPerson,
      events_upserted: allEvents.length,
      so_phien_moi: soMoi, so_phien_cap_nhat: soCapNhat, so_vi_pham_phat_sinh: soViPham,
      auto_filled_tt_id: autoFilledTtId,
      snapshot_updated: snapshotUpdated,
      unmatched_person_ids: [...unmatchedPersonIds],
      duration_ms: endedAt.getTime() - startedAt.getTime(),
      note: "time-tracking.prod.jibble.io/v1. workspace personId = tt personId (verified 11/06/2026).",
    });
  } catch (e: any) {
    return fail(String(e?.message ?? e), 500);
  }
});
