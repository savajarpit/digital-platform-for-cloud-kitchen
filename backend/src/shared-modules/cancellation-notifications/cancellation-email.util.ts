import { escapeHtml } from '../email-layout/email-layout.util';

const LABEL = 'color:#71717a;font-size:13px;';

/** "Mon, 28 Sept" for a tenant-local YYYY-MM-DD date. */
export function formatDateLabel(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00.000Z`).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

export function formatRupees(paise: number): string {
  return (paise / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** One "label / value" block for the owner email's details section. Both
 * parts are escaped here — the result is the only HTML the template
 * receives unescaped. */
export function detailRow(label: string, value: string): string {
  return `<p style="margin:0 0 8px;"><span style="${LABEL}">${escapeHtml(label)}</span><br/>${escapeHtml(value)}</p>`;
}

export function holdLineFor(heldFromDate: string | null): string {
  if (!heldFromDate) return '';
  return `Deliveries are on hold from ${formatDateLabel(heldFromDate)} while this is reviewed.`;
}
