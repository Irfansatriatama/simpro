import { PlaceholderPage } from '@/components/placeholder-page';

export default function MaintenanceReportPage({
  params,
}: {
  params: { id: string };
}) {
  return <PlaceholderPage title={`Maintenance report — ${params.id}`} />;
}
