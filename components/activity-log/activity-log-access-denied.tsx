import { Lock } from 'lucide-react';

export function ActivityLogAccessDenied() {
  return (
    <div className="rounded-xl border border-border bg-card py-16 text-center shadow-card">
      <Lock
        className="mx-auto h-12 w-12 text-muted-foreground"
        aria-hidden
      />
      <h1 className="mt-4 text-lg font-semibold text-foreground">
        Akses dibatasi
      </h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Log aktivitas hanya dapat dilihat oleh peran Admin dan PM.
      </p>
    </div>
  );
}
