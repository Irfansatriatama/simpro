import { PlaceholderPage } from '@/components/placeholder-page';

export default function ProjectOverviewPage({
  params,
}: {
  params: { id: string };
}) {
  return <PlaceholderPage title={`Project ${params.id}`} />;
}
