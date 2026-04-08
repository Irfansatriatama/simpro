export const ASSET_CATEGORIES = [
  'hardware',
  'software',
  'license',
  'document',
  'other',
] as const;

export type AssetCategory = (typeof ASSET_CATEGORIES)[number];

export const ASSET_STATUSES = [
  'available',
  'in_use',
  'maintenance',
  'retired',
] as const;

export type AssetStatus = (typeof ASSET_STATUSES)[number];

export const ASSET_CATEGORY_LABEL: Record<AssetCategory, string> = {
  hardware: 'Perangkat keras',
  software: 'Perangkat lunak',
  license: 'Lisensi',
  document: 'Dokumen',
  other: 'Lainnya',
};

export const ASSET_STATUS_LABEL: Record<AssetStatus, string> = {
  available: 'Tersedia',
  in_use: 'Dipakai',
  maintenance: 'Maintenance',
  retired: 'Diarsipkan',
};

export function isAssetCategory(s: string): s is AssetCategory {
  return (ASSET_CATEGORIES as readonly string[]).includes(s);
}

export function isAssetStatus(s: string): s is AssetStatus {
  return (ASSET_STATUSES as readonly string[]).includes(s);
}
