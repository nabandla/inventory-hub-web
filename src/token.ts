/**
 * Reads the roles out of an access token so the page can show what the user may do.
 * This only DISPLAYS information: the browser can't verify the signature, so it must never be
 * trusted for security. The API checks the token properly on every request.
 */
export function decodeRoles(token: string): string[] {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payload.length / 4) * 4, "="));
    const roles = JSON.parse(json).roles;
    return Array.isArray(roles) ? roles.filter((r): r is string => typeof r === "string") : [];
  } catch {
    return [];
  }
}
