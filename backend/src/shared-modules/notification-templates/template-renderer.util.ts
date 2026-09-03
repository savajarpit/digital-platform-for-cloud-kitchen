/**
 * The interpolation engine shared by every editable email template —
 * platform defaults and tenant overrides alike. Deliberately dumb: replaces
 * `{{token}}` with `data[token]`, leaves an unknown token untouched (so a
 * typo in a SUPER_ADMIN/tenant-authored template degrades to visible
 * placeholder text instead of throwing or silently dropping content).
 */
export function renderTemplateString(
  template: string,
  data: Record<string, string>,
): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, token: string) =>
    Object.prototype.hasOwnProperty.call(data, token) ? data[token] : match,
  );
}
