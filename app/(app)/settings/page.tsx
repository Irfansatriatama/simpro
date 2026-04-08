import { SettingsClient } from '@/components/settings/settings-client';
import { getOrgSettings } from '@/lib/org-settings';
import { requireManagementSession } from '@/lib/management-auth';
import { redirect } from 'next/navigation';

import pkg from '@/package.json';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  if (!(await requireManagementSession())) {
    redirect('/dashboard');
  }

  const initial = await getOrgSettings();
  const envAppName = process.env.NEXT_PUBLIC_APP_NAME ?? 'SIMPRO';

  return (
    <SettingsClient
      initial={initial}
      appVersion={typeof pkg.version === 'string' ? pkg.version : '0.0.1'}
      envAppName={envAppName}
    />
  );
}
