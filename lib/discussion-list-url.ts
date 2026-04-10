/** Bangun path daftar diskusi dengan paginasi & filter (GET). */
export function discussionListPath(
  projectId: string,
  opts: { page?: number; q?: string; type?: string },
): string {
  const params = new URLSearchParams();
  const page = opts.page ?? 1;
  if (page > 1) params.set('page', String(page));
  const q = opts.q?.trim();
  if (q) params.set('q', q);
  const type = opts.type?.trim();
  if (type && type !== 'all') params.set('type', type);
  const qs = params.toString();
  return qs
    ? `/projects/${projectId}/discussion?${qs}`
    : `/projects/${projectId}/discussion`;
}
