/** Kunci baris di tabel `settings` (nilai disimpan sebagai string). */
export const SETTINGS_KEYS = [
  'system_name',
  'timezone',
  'date_format',
  'currency',
  'currency_symbol',
  'hourly_rate',
  'tax_rate',
] as const;

export type SettingsKey = (typeof SETTINGS_KEYS)[number];

export type OrgSettings = {
  systemName: string;
  timezone: string;
  dateFormat: string;
  currency: string;
  currencySymbol: string;
  hourlyRate: number;
  taxRate: number;
};

export const DEFAULT_ORG_SETTINGS: OrgSettings = {
  systemName: 'SIMPRO',
  timezone: 'Asia/Jakarta',
  dateFormat: 'DD MMM YYYY',
  currency: 'IDR',
  currencySymbol: 'Rp',
  hourlyRate: 0,
  taxRate: 11,
};

export const SETTINGS_TIMEZONES = [
  'Asia/Jakarta',
  'Asia/Singapore',
  'Asia/Kuala_Lumpur',
  'Asia/Bangkok',
  'Asia/Manila',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Shanghai',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'UTC',
] as const;

export const SETTINGS_DATE_FORMATS = [
  'DD MMM YYYY',
  'MM/DD/YYYY',
  'YYYY-MM-DD',
  'DD/MM/YYYY',
] as const;

export const SETTINGS_CURRENCIES: {
  code: string;
  symbol: string;
  label: string;
}[] = [
  { code: 'IDR', symbol: 'Rp', label: 'Rupiah Indonesia' },
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'SGD', symbol: 'S$', label: 'Dolar Singapura' },
  { code: 'MYR', symbol: 'RM', label: 'Ringgit Malaysia' },
  { code: 'GBP', symbol: '£', label: 'Pound Inggris' },
];

export function currencySymbolForCode(code: string): string {
  const c = SETTINGS_CURRENCIES.find((x) => x.code === code);
  return c?.symbol ?? DEFAULT_ORG_SETTINGS.currencySymbol;
}
