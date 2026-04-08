import { PlaceholderPage } from '@/components/placeholder-page';

export default function BoardPage({ params }: { params: { id: string } }) {
  return <PlaceholderPage title={`Board — ${params.id}`} />;
}
