import { PlaceholderPage } from '@/components/placeholder-page';

export default function MeetingDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <PlaceholderPage title={`Meeting ${params.id}`} />;
}
