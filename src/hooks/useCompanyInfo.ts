import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const COMPANY_INFO_KEYS = [
  "COMPANY_NAME",
  "COMPANY_SHORT_NAME",
  "COMPANY_TAGLINE",
  "COMPANY_TAX_CODE",
  "COMPANY_LICENSE",
  "COMPANY_ADDRESS",
  "COMPANY_ADDRESS2",
  "COMPANY_PHONE",
  "COMPANY_EMAIL",
  "COMPANY_WEBSITE",
  "COMPANY_LOGO_URL",
  "COMPANY_BANK_1",
  "COMPANY_BANK_2",
] as const;

export type CompanyInfoKey = (typeof COMPANY_INFO_KEYS)[number];

export type CompanyInfo = Record<CompanyInfoKey, string>;

/** Fallback dùng khi DB chưa có record (giữ nguyên giá trị hardcode cũ). */
export const COMPANY_INFO_DEFAULTS: CompanyInfo = {
  COMPANY_NAME: "CÔNG TY TNHH DU LỊCH SAIGON HOLIDAY",
  COMPANY_SHORT_NAME: "SAIGON HOLIDAY",
  COMPANY_TAGLINE: "✦ Đi để cảm nhận ✦",
  COMPANY_TAX_CODE: "",
  COMPANY_LICENSE: "79–1000/2019/TCDL",
  COMPANY_ADDRESS: "01 Hoa Cúc, P.07, Q.Phú Nhuận, TP.HCM",
  COMPANY_ADDRESS2: "VP: 1009 Hoàng Sa, P.11, Q.3, TP.HCM",
  COMPANY_PHONE: "0905 33 55 16 – 0902 141 901",
  COMPANY_EMAIL: "",
  COMPANY_WEBSITE: "www.saigonholiday.vn",
  COMPANY_LOGO_URL: "",
  COMPANY_BANK_1: "ACB|CÔNG TY TNHH DU LỊCH SAIGON HOLIDAY|",
  COMPANY_BANK_2: "Vietcombank|CÔNG TY TNHH DU LỊCH SAIGON HOLIDAY|",
};

export function useCompanyInfo() {
  return useQuery({
    queryKey: ["company-info"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<CompanyInfo> => {
      const { data, error } = await supabase
        .from("system_config")
        .select("key,value")
        .in("key", COMPANY_INFO_KEYS as unknown as string[]);

      if (error) throw error;
      const map = new Map((data || []).map((r: any) => [r.key, r.value ?? ""]));
      const out = { ...COMPANY_INFO_DEFAULTS };
      for (const k of COMPANY_INFO_KEYS) {
        const v = map.get(k);
        if (v !== undefined && v !== null && v !== "") {
          (out as any)[k] = v;
        }
      }
      return out;
    },
  });
}

/** Parse "BankName|Account Holder|AccountNo" */
export function parseBank(raw: string | null | undefined) {
  if (!raw) return { name: "", holder: "", number: "" };
  const [name = "", holder = "", number = ""] = raw.split("|");
  return { name: name.trim(), holder: holder.trim(), number: number.trim() };
}

/** Map CompanyInfo → PrintCompanyInfo cho financePrintTemplates */
export function toPrintCompanyInfo(info: CompanyInfo | undefined) {
  const c = info || COMPANY_INFO_DEFAULTS;
  return {
    name: c.COMPANY_NAME,
    shortName: c.COMPANY_SHORT_NAME,
    tagline: c.COMPANY_TAGLINE,
    address: c.COMPANY_ADDRESS,
    address2: c.COMPANY_ADDRESS2,
    taxCode: c.COMPANY_TAX_CODE,
    license: c.COMPANY_LICENSE,
    phone: c.COMPANY_PHONE,
    email: c.COMPANY_EMAIL,
    website: c.COMPANY_WEBSITE,
    logoUrl: c.COMPANY_LOGO_URL,
    banks: [parseBank(c.COMPANY_BANK_1), parseBank(c.COMPANY_BANK_2)].filter(
      (b) => b.name || b.number
    ),
  };
}
