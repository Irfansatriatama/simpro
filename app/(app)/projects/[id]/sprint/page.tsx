import { PlaceholderPage } from '@/components/placeholder-page';

export default function SprintPage({ params }: { params: { id: string } }) {
  return <PlaceholderPage title={`Sprint — ${params.id}`} />;
}
