/**
 * Templates HTML cho phiếu Tài chính: Dự toán, Quyết toán, Tạm ứng.
 * In bằng window.print() — CSS @media print đảm bảo chỉ in nội dung.
 */

export interface PrintBank {
  name?: string;
  holder?: string;
  number?: string;
}

export interface PrintCompanyInfo {
  name?: string;
  shortName?: string;
  tagline?: string;
  address?: string;
  address2?: string;
  taxCode?: string;
  license?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  banks?: PrintBank[];
}

const DEFAULT_COMPANY: Required<Omit<PrintCompanyInfo, "banks">> & { banks: PrintBank[] } = {
  name: "CÔNG TY TNHH DU LỊCH SAIGON HOLIDAY",
  shortName: "SAIGON HOLIDAY",
  tagline: "",
  address: "01 Hoa Cúc, P.07, Q.Phú Nhuận, TP.HCM",
  address2: "",
  taxCode: "",
  license: "",
  phone: "0905 33 55 16",
  email: "",
  website: "www.saigonholiday.vn",
  logoUrl: "",
  banks: [],
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const fmt = (v: number | null | undefined) =>
  v ? new Intl.NumberFormat("vi-VN").format(v) + " ₫" : "0 ₫";
const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("vi-VN") : "—";

const baseStyles = `
  body { font-family: 'Times New Roman', serif; padding: 24px; color: #111; max-width: 794px; margin: 0 auto; background: #fff; }
  .header { text-align: center; margin-bottom: 16px; }
  .header h2 { margin: 4px 0; font-size: 14px; }
  .header h1 { margin: 12px 0 4px; font-size: 20px; text-transform: uppercase; }
  .header .meta { font-size: 12px; color: #555; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; font-size: 13px; margin-bottom: 16px; }
  .info-grid div { padding: 4px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin: 12px 0; }
  th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #f3f4f6; font-weight: 600; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  .totals { margin-top: 12px; font-size: 13px; }
  .totals .row { display: flex; justify-content: space-between; padding: 4px 0; }
  .totals .grand { font-weight: 700; font-size: 14px; border-top: 2px solid #111; margin-top: 8px; padding-top: 8px; }
  .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 36px; text-align: center; font-size: 13px; }
  .signatures .box { border-top: 1px dashed #999; padding-top: 64px; }
  .signatures .label { font-weight: 600; }
  .toolbar { position: fixed; top: 12px; right: 12px; display: flex; gap: 8px; }
  .toolbar button { padding: 8px 14px; font-size: 13px; border: 1px solid #999; background: #fff; cursor: pointer; border-radius: 4px; }
  .toolbar button.primary { background: #E8963A; color: #fff; border-color: #E8963A; }
  @media print {
    .toolbar { display: none !important; }
    body { padding: 0; }
    @page { size: A4; margin: 14mm; }
  }
`;

const printToolbar = `
  <div class="toolbar">
    <button onclick="window.close()">Đóng</button>
    <button class="primary" onclick="window.print()">🖨️ In / Lưu PDF</button>
  </div>
`;

const headerBlock = (title: string, code: string, createdAt?: string, co?: PrintCompanyInfo) => {
  const c = { ...DEFAULT_COMPANY, ...(co || {}) };
  const logoHtml = c.logoUrl
    ? `<img src="${escapeHtml(c.logoUrl)}" alt="logo" style="max-height:60px;margin-bottom:6px"/>`
    : "";
  const contactBits = [
    c.address ? `📍 ${escapeHtml(c.address)}` : "",
    c.phone ? `☎ ${escapeHtml(c.phone)}` : "",
    c.email ? `📧 ${escapeHtml(c.email)}` : "",
    c.website ? `🌐 ${escapeHtml(c.website)}` : "",
    c.taxCode ? `MST: ${escapeHtml(c.taxCode)}` : "",
  ].filter(Boolean).join(" &nbsp;•&nbsp; ");
  return `
  <div class="header">
    ${logoHtml}
    <h2>${escapeHtml(c.name)}</h2>
    <div class="meta">${contactBits}</div>
    ${c.tagline ? `<div class="meta" style="font-style:italic;color:#E8963A">${escapeHtml(c.tagline)}</div>` : ""}
    <h1>${title}</h1>
    <div class="meta">Số: <strong>${escapeHtml(code)}</strong> &nbsp; • &nbsp; Ngày lập: <strong>${fmtDate(createdAt)}</strong></div>
  </div>
`;
};

const footerBlock = (co?: PrintCompanyInfo) => {
  const c = { ...DEFAULT_COMPANY, ...(co || {}) };
  const banks = (c.banks || []).filter((b) => b && (b.name || b.number));
  const bankHtml = banks.length
    ? `<div style="margin-top:20px;padding-top:10px;border-top:1px dashed #999;font-size:11px;color:#444">
        <strong>Thông tin chuyển khoản:</strong>
        ${banks.map((b) => `<div>🏦 ${escapeHtml(b.name || "")}${b.number ? ` — Số TK: <b>${escapeHtml(b.number)}</b>` : ""}${b.holder ? ` — CTK: ${escapeHtml(b.holder)}` : ""}</div>`).join("")}
      </div>`
    : "";
  const footerLine = [c.name, c.phone ? `☎ ${c.phone}` : "", c.email ? `📧 ${c.email}` : "", c.website ? `🌐 ${c.website}` : ""]
    .filter(Boolean).map(escapeHtml).join(" &nbsp;•&nbsp; ");
  return `${bankHtml}
  <div style="margin-top:14px;text-align:center;font-size:10px;color:#888;border-top:1px solid #ddd;padding-top:8px">
    ${footerLine}
  </div>`;
};

const signaturesBlock = `
  <div class="signatures">
    <div class="box"><div class="label">Người lập</div><div class="meta">(Ký, ghi rõ họ tên)</div></div>
    <div class="box"><div class="label">Kế toán</div><div class="meta">(Ký, ghi rõ họ tên)</div></div>
    <div class="box"><div class="label">Giám đốc</div><div class="meta">(Ký, ghi rõ họ tên)</div></div>
  </div>
`;

interface EstimateData {
  code: string;
  created_at?: string;
  booking_code?: string;
  customer_name?: string;
  created_by_name?: string;
  total_estimated?: number;
  advance_amount?: number;
  advance_recipient?: string;
  advance_purpose?: string;
  items: Array<{
    category: string;
    description?: string;
    unit_price?: number;
    quantity?: number;
    supplier?: string;
    payment_deadline?: string;
  }>;
}

export function buildEstimateHtml(d: EstimateData, co?: PrintCompanyInfo): string {
  const itemsHtml = d.items
    .map((it, idx) => {
      const total = (it.unit_price ?? 0) * (it.quantity ?? 0);
      return `<tr>
        <td>${idx + 1}</td>
        <td>${it.category}${it.description ? ` — ${it.description}` : ""}</td>
        <td class="num">${fmt(it.unit_price)}</td>
        <td class="num">${it.quantity ?? 0}</td>
        <td class="num">${fmt(total)}</td>
        <td>${it.supplier ?? "—"}</td>
        <td>${fmtDate(it.payment_deadline)}</td>
      </tr>`;
    })
    .join("");

  const totalCalc = d.items.reduce((s, i) => s + (i.unit_price ?? 0) * (i.quantity ?? 0), 0);

  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><title>Phiếu dự toán ${d.code}</title><style>${baseStyles}</style></head>
<body>
  ${printToolbar}
  ${headerBlock("PHIẾU DỰ TOÁN CHI PHÍ TOUR", d.code, d.created_at, co)}
  <div class="info-grid">
    <div><strong>Booking:</strong> ${d.booking_code ?? "—"}</div>
    <div><strong>Khách hàng:</strong> ${d.customer_name ?? "—"}</div>
    <div><strong>Người lập:</strong> ${d.created_by_name ?? "—"}</div>
    <div></div>
  </div>
  <table>
    <thead><tr>
      <th style="width:30px">STT</th>
      <th>Hạng mục / Mô tả</th>
      <th style="width:90px">Đơn giá</th>
      <th style="width:50px">SL</th>
      <th style="width:100px">Thành tiền</th>
      <th style="width:120px">NCC dự kiến</th>
      <th style="width:90px">Hạn TT</th>
    </tr></thead>
    <tbody>${itemsHtml || `<tr><td colspan="7" style="text-align:center;color:#999">Không có hạng mục</td></tr>`}</tbody>
  </table>
  <div class="totals">
    <div class="row"><span>Tạm ứng:</span><span>${fmt(d.advance_amount)}</span></div>
    ${d.advance_recipient ? `<div class="row"><span>Người nhận tạm ứng:</span><span>${d.advance_recipient}</span></div>` : ""}
    ${d.advance_purpose ? `<div class="row"><span>Mục đích tạm ứng:</span><span>${d.advance_purpose}</span></div>` : ""}
    <div class="row grand"><span>Tổng dự toán:</span><span>${fmt(d.total_estimated ?? totalCalc)}</span></div>
  </div>
  ${footerBlock(co)}
  ${signaturesBlock}
</body></html>`;
}

interface SettlementData {
  code: string;
  created_at?: string;
  estimate_code?: string;
  booking_code?: string;
  customer_name?: string;
  created_by_name?: string;
  total_estimated?: number;
  total_actual?: number;
  variance?: number;
  variance_pct?: number;
  advance_amount?: number;
  refund_amount?: number;
  additional_amount?: number;
  refund_status?: string;
  topup_status?: string;
  items: Array<{
    category: string;
    description?: string;
    estimated_amount?: number;
    actual_amount?: number;
    receipt_url?: string;
  }>;
}

export function buildSettlementHtml(d: SettlementData, co?: PrintCompanyInfo): string {
  const itemsHtml = d.items
    .map((it, idx) => {
      const variance = (it.actual_amount ?? 0) - (it.estimated_amount ?? 0);
      const pct = it.estimated_amount ? (variance / it.estimated_amount) * 100 : 0;
      return `<tr>
        <td>${idx + 1}</td>
        <td>${it.category}${it.description ? ` — ${it.description}` : ""}</td>
        <td class="num">${fmt(it.estimated_amount)}</td>
        <td class="num">${fmt(it.actual_amount)}</td>
        <td class="num" ${Math.abs(pct) > 10 ? 'style="color:#c00;font-weight:600"' : ""}>${fmt(variance)} (${pct.toFixed(0)}%)</td>
      </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><title>Phiếu quyết toán ${d.code}</title><style>${baseStyles}</style></head>
<body>
  ${printToolbar}
  ${headerBlock("PHIẾU QUYẾT TOÁN CHI PHÍ TOUR", d.code, d.created_at, co)}
  <div class="info-grid">
    <div><strong>Mã dự toán:</strong> ${d.estimate_code ?? "—"}</div>
    <div><strong>Booking:</strong> ${d.booking_code ?? "—"}</div>
    <div><strong>Khách hàng:</strong> ${d.customer_name ?? "—"}</div>
    <div><strong>Người lập:</strong> ${d.created_by_name ?? "—"}</div>
  </div>
  <table>
    <thead><tr>
      <th style="width:30px">STT</th>
      <th>Hạng mục / Mô tả</th>
      <th style="width:110px">Dự toán</th>
      <th style="width:110px">Thực chi</th>
      <th style="width:140px">Chênh lệch (%)</th>
    </tr></thead>
    <tbody>${itemsHtml || `<tr><td colspan="5" style="text-align:center;color:#999">Không có hạng mục</td></tr>`}</tbody>
  </table>
  <div class="totals">
    <div class="row"><span>Tổng dự toán:</span><span>${fmt(d.total_estimated)}</span></div>
    <div class="row"><span>Tổng thực chi:</span><span>${fmt(d.total_actual)}</span></div>
    <div class="row"><span>Chênh lệch:</span><span>${fmt(d.variance)} (${(d.variance_pct ?? 0).toFixed(1)}%)</span></div>
    <div class="row"><span>Tạm ứng đã giải ngân:</span><span>${fmt(d.advance_amount)}</span></div>
    ${(d.refund_amount ?? 0) > 0 ? `<div class="row"><span>Hoàn ứng (NV trả lại):</span><span>${fmt(d.refund_amount)} — ${d.refund_status ?? ""}</span></div>` : ""}
    ${(d.additional_amount ?? 0) > 0 ? `<div class="row"><span>Chi bù (Cty chi thêm):</span><span>${fmt(d.additional_amount)} — ${d.topup_status ?? ""}</span></div>` : ""}
    <div class="row grand"><span>Số tiền cần thanh toán:</span><span>${fmt((d.additional_amount ?? 0) - (d.refund_amount ?? 0))}</span></div>
  </div>
  ${footerBlock(co)}
  ${signaturesBlock}
</body></html>`;
}

interface AdvanceData {
  code: string;
  created_at?: string;
  recipient: string;
  amount: number;
  purpose: string;
  booking_code?: string;
}

export function buildAdvanceHtml(d: AdvanceData, co?: PrintCompanyInfo): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><title>Phiếu tạm ứng ${d.code}</title><style>${baseStyles}</style></head>
<body>
  ${printToolbar}
  ${headerBlock("PHIẾU TẠM ỨNG", d.code, d.created_at, co)}
  <div class="info-grid" style="font-size:14px">
    <div><strong>Người nhận:</strong> ${d.recipient}</div>
    <div><strong>Số tiền:</strong> <span style="font-size:16px;font-weight:700">${fmt(d.amount)}</span></div>
    <div><strong>Booking liên quan:</strong> ${d.booking_code ?? "—"}</div>
    <div><strong>Ngày giải ngân:</strong> ${fmtDate(d.created_at)}</div>
  </div>
  <p style="font-size:13px;margin:16px 0 8px"><strong>Mục đích sử dụng:</strong></p>
  <div style="border:1px solid #999;padding:12px;min-height:80px;font-size:13px">${d.purpose}</div>
  <p style="font-size:12px;color:#555;margin-top:16px;font-style:italic">
    Người nhận có trách nhiệm hoàn ứng và quyết toán đầy đủ chứng từ sau khi hoàn thành công việc.
  </p>
  ${footerBlock(co)}
  <div class="signatures">
    <div class="box"><div class="label">Người nhận tạm ứng</div><div class="meta">(Ký, ghi rõ họ tên)</div></div>
    <div class="box"><div class="label">Kế toán</div><div class="meta">(Ký, ghi rõ họ tên)</div></div>
    <div class="box"><div class="label">Giám đốc</div><div class="meta">(Ký, ghi rõ họ tên)</div></div>
  </div>
</body></html>`;
}

/** Mở document mới và in. Pattern giống PrintConfirmationButton. */
export function openPrintWindow(html: string) {
  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) {
    alert("Trình duyệt chặn popup. Vui lòng cho phép popup để in.");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
