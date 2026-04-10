const PRODUCTION_URL = "https://app.saigonholiday.vn";

export function getResetPasswordUrl(): string {
  return `${PRODUCTION_URL}/reset-password`;
}
