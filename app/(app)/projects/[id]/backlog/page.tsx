import { PlaceholderPage } from '@/components/placeholder-page';

export default function BacklogPage({ params }: { params: { id: string } }) {
  return <PlaceholderPage title={`Backlog — ${params.id}`} />;
}
