export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground">{title}</h1>
      <p className="mt-2 text-sm text-muted">Placeholder — implementasi mengikuti roadmap.</p>
    </div>
  );
}
