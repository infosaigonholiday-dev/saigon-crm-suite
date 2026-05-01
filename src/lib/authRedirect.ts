import { getAppBaseUrl } from "./getAppBaseUrl";

const PUBLISHED_URL = "https://saigon-holiday-nexus.lovable.app";

/**
 * URL callback cho reset password (FE).
 * Dùng helper duy nhất getAppBaseUrl() — KHÔNG hardcode origin ở nơi khác.
 */
export function getResetPasswordUrl(): string {
  return `${getAppBaseUrl()}/reset-password`;
}

/** For use in edge functions where window is not available */
export function getResetPasswordUrlForEdge(requestOrigin?: string): string {
  if (requestOrigin) {
    return `${requestOrigin}/reset-password`;
  }
  return `${PUBLISHED_URL}/reset-password`;
}
