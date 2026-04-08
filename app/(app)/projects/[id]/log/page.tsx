import { PlaceholderPage } from '@/components/placeholder-page';

export default function LogPage({ params }: { params: { id: string } }) {
  return <PlaceholderPage title={`Activity log — ${params.id}`} />;
}
