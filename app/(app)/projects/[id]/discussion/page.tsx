import { PlaceholderPage } from '@/components/placeholder-page';

export default function DiscussionPage({
  params,
}: {
  params: { id: string };
}) {
  return <PlaceholderPage title={`Discussion — ${params.id}`} />;
}
