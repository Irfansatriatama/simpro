export type ClientRow = {
  id: string;
  companyName: string;
  industry: string | null;
  contactPerson: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  website: string | null;
  logo: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  projectCount: number;
};

export const CLIENT_STATUSES = ['active', 'inactive', 'prospect'] as const;
export type ClientStatusValue = (typeof CLIENT_STATUSES)[number];

export function isClientStatus(s: string): s is ClientStatusValue {
  return (CLIENT_STATUSES as readonly string[]).includes(s);
}
