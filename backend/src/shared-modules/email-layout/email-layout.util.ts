const OKAYSYNC_URL = 'https://okaysync.com';

export interface EmailShellOptions {
  /** Header identity — the tenant's own Business Profile name for
   * customer-facing sends, OkaySync's own name for platform-ops sends. */
  brandName: string;
  brandLogoUrl?: string | null;
  /** The template's own inner content — plain, inline-styled HTML, no
   * <html>/<body> wrapper. */
  bodyHtml: string;
  /** Small copyright line under the brand — usually `brandName` again,
   * omit for platform-ops sends where the header already says it all. */
  ownerLine?: string | null;
  /** Whether the "Powered by OkaySync" footer line renders — false only
   * when SUPER_ADMIN has disabled it for this specific tenant
   * (`Tenant.poweredByBrandingEnabled`). Always true for platform-ops
   * sends, since those already carry OkaySync's own identity. */
  showPoweredBy: boolean;
}

/**
 * The one shared transactional-email shell used by every email this
 * platform sends. Table-based layout with fully inline CSS — required for
 * consistent rendering across email clients (no external stylesheet, no
 * flexbox/grid). Templates only ever author/store the *inner* `bodyHtml`;
 * this shell (including whether the "Powered by OkaySync" line appears) is
 * applied at send time, so neither a tenant's override nor the stored
 * template content can affect it either way.
 */
export function renderEmailShell(options: EmailShellOptions): string {
  const { brandName, brandLogoUrl, bodyHtml, ownerLine, showPoweredBy } =
    options;
  const year = new Date().getFullYear();

  const headerBrand = brandLogoUrl
    ? `<img src="${brandLogoUrl}" alt="${escapeHtml(brandName)}" height="32" style="height:32px;max-width:220px;object-fit:contain;" />`
    : `<span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">${escapeHtml(brandName)}</span>`;

  const poweredByLine = showPoweredBy
    ? `<a href="${OKAYSYNC_URL}" target="_blank" rel="noopener noreferrer" style="color:#16a34a;text-decoration:underline;">OkaySync</a>`
    : null;

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
            <tr>
              <td style="background-color:#18181b;padding:20px 32px;">
                ${headerBrand}
              </td>
            </tr>
            <tr>
              <td style="padding:32px;color:#27272a;font-size:15px;line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background-color:#fafafa;border-top:1px solid #e4e4e7;font-size:12px;line-height:1.6;color:#71717a;">
                ${ownerLine ? `<p style="margin:0 0 4px;">&copy; ${year} ${escapeHtml(ownerLine)}. All rights reserved.</p>` : ''}
                ${poweredByLine ? `<p style="margin:0;">Powered by ${poweredByLine}</p>` : ''}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
