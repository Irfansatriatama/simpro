import { PlaceholderPage } from '@/components/placeholder-page';

export default function ReportsPage({ params }: { params: { id: string } }) {
  return <PlaceholderPage title={`Reports — ${params.id}`} />;
}
