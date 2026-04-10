/** Calendar day key in local timezone (matches Trackly date string behavior). */
export function meetingDateKeyFromIso(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Store meeting anchor at local noon so timezone shifts rarely change the calendar day. */
export function parseMeetingAnchorDate(dateYmd: string): Date {
  const [y, mo, d] = dateYmd.split('-').map((x) => Number(x));
  if (!y || !mo || !d) return new Date(NaN);
  return new Date(y, mo - 1, d, 12, 0, 0, 0);
}

export function formatMeetingDayTitle(dateKey: string, locale = 'id-ID'): string {
  if (!dateKey) return '';
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
