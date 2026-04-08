import { PlaceholderPage } from '@/components/placeholder-page';

export default function MaintenancePage({
  params,
}: {
  params: { id: string };
}) {
  return <PlaceholderPage title={`Maintenance — ${params.id}`} />;
}
