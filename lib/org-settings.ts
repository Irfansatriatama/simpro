import {
  DEFAULT_ORG_SETTINGS,
  SETTINGS_KEYS,
  type OrgSettings,
} from '@/lib/settings-constants';
import { prisma } from '@/lib/prisma';

function parseNumber(s: string | undefined, fallback: number): number {
  if (s === undefined || s === '') return fallback;
  const n = Number(String(s).replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
}

/** Membaca pengaturan organisasi dari DB; nilai hilang memakai default. */
export async function getOrgSettings(): Promise<OrgSettings> {
  const rows = await prisma.settings.findMany({
    where: { key: { in: [...SETTINGS_KEYS] } },
  });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<
    string,
    string
  >;

  return {
    systemName:
      map.system_name?.trim() ||
      process.env.NEXT_PUBLIC_APP_NAME?.trim() ||
      DEFAULT_ORG_SETTINGS.systemName,
    timezone: map.timezone || DEFAULT_ORG_SETTINGS.timezone,
    dateFormat: map.date_format || DEFAULT_ORG_SETTINGS.dateFormat,
    currency: map.currency || DEFAULT_ORG_SETTINGS.currency,
    currencySymbol:
      map.currency_symbol || DEFAULT_ORG_SETTINGS.currencySymbol,
    hourlyRate: parseNumber(map.hourly_rate, DEFAULT_ORG_SETTINGS.hourlyRate),
    taxRate: parseNumber(map.tax_rate, DEFAULT_ORG_SETTINGS.taxRate),
  };
}
