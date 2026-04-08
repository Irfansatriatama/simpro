import { ProjectGuideContent } from '@/components/guide/project-guide-content';
import { requireManagementSession } from '@/lib/management-auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ProjectGuidePage() {
  if (!(await requireManagementSession())) {
    redirect('/dashboard');
  }

  return <ProjectGuideContent />;
}
