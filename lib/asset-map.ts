import type { Asset } from '@prisma/client';

import type { AssetRow } from '@/lib/asset-types';

type ProjectMini = { code: string; name: string } | null | undefined;
type UserMini = { name: string } | null | undefined;

export function toAssetRow(
  a: Asset,
  project: ProjectMini,
  assignee: UserMini,
): AssetRow {
  return {
    id: a.id,
    name: a.name,
    category: a.category,
    description: a.description,
    serialNumber: a.serialNumber,
    purchaseDate: a.purchaseDate?.toISOString() ?? null,
    purchasePrice: a.purchasePrice,
    vendor: a.vendor,
    assignedTo: a.assignedTo,
    assigneeName: assignee?.name ?? null,
    projectId: a.projectId,
    projectCode: project?.code ?? null,
    projectName: project?.name ?? null,
    status: a.status,
    warrantyExpiry: a.warrantyExpiry?.toISOString() ?? null,
    notes: a.notes,
    image: a.image,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}
