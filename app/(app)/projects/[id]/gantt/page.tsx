import { PlaceholderPage } from '@/components/placeholder-page';

export default function GanttPage({ params }: { params: { id: string } }) {
  return <PlaceholderPage title={`Gantt — ${params.id}`} />;
}
