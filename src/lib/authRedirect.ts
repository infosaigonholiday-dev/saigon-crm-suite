const PRODUCTION_URL = "https://app.saigonholiday.vn";
const PUBLISHED_URL = "https://saigon-holiday-nexus.lovable.app";

export function getResetPasswordUrl(): string {
  // If running on the production domain, use it
  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    // On production domain
    if (origin === PRODUCTION_URL) {
      return `${PRODUCTION_URL}/reset-password`;
    }
    // On any other domain (preview, published, localhost), use current origin
    return `${origin}/reset-password`;
  }
  // Fallback for SSR/edge context — use published URL
  return `${PUBLISHED_URL}/reset-password`;
}

/** For use in edge functions where window is not available */
export function getResetPasswordUrlForEdge(requestOrigin?: string): string {
  if (requestOrigin) {
    return `${requestOrigin}/reset-password`;
  }
  return `${PUBLISHED_URL}/reset-password`;
}
