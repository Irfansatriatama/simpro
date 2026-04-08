export default function AppSegmentLoading() {
  return (
    <div
      className="flex min-h-[50vh] flex-col items-center justify-center gap-3"
      aria-busy
      aria-label="Memuat halaman"
    >
      <div
        className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent"
        aria-hidden
      />
      <p className="text-sm text-muted-foreground">Memuat…</p>
    </div>
  );
}
