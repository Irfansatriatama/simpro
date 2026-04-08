import { ClientsClient } from '@/components/clients/clients-client';
import type { ClientRow } from '@/lib/client-types';
import { requireManagementSession } from '@/lib/management-auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ClientsPage() {
  if (!(await requireManagementSession())) {
    redirect('/dashboard');
  }

  const rows = await prisma.client.findMany({
    orderBy: { companyName: 'asc' },
    include: {
      _count: { select: { projects: true } },
    },
  });

  const clients: ClientRow[] = rows.map((r) => ({
    id: r.id,
    companyName: r.companyName,
    industry: r.industry,
    contactPerson: r.contactPerson,
    contactEmail: r.contactEmail,
    contactPhone: r.contactPhone,
    address: r.address,
    website: r.website,
    logo: r.logo,
    notes: r.notes,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    projectCount: r._count.projects,
  }));

  return <ClientsClient clients={clients} />;
}
