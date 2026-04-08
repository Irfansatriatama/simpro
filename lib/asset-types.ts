/** Baris daftar aset (nilai tanggal ISO string). */
export type AssetRow = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  serialNumber: string | null;
  purchaseDate: string | null;
  purchasePrice: number | null;
  vendor: string | null;
  assignedTo: string | null;
  assigneeName: string | null;
  projectId: string | null;
  projectCode: string | null;
  projectName: string | null;
  status: string;
  warrantyExpiry: string | null;
  notes: string | null;
  image: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AssetProjectPick = {
  id: string;
  code: string;
  name: string;
};

export type AssetUserPick = {
  id: string;
  name: string;
  username: string;
  email: string;
};
