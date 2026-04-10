'use client';

import {
  Building2,
  Calendar,
  Pencil,
  Pin,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  PRIORITY_LABEL,
  PROJECT_PHASE_LABEL,
  PROJECT_STATUS_LABEL,
} from '@/lib/project-labels';
import type { ProjectListRow } from '@/lib/project-types';
import { cn } from '@/lib/utils';
import type { ProjectPhase, ProjectStatus } from '@prisma/client';

function truncate(s: string, n: number): string {
  const t = s.trim();
  if (t.length <= n) return t;
  return `${t.slice(0, n)}…`;
}

function isOverdue(
  endDate: string | null,
  status: ProjectStatus,
): boolean {
  if (!endDate) return false;
  if (status === 'completed' || status === 'cancelled') return false;
  const end = new Date(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return end < today;
}

function fmtEnd(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || '?';
}

export function ProjectListCard(props: {
  project: ProjectListRow;
  canManage: boolean;
  onEdit: (p: ProjectListRow) => void;
  onDelete: (p: ProjectListRow) => void;
}) {
  const { project: p, canManage, onEdit, onDelete } = props;
  const overdue = isOverdue(p.endDate, p.status);
  const extraMembers = Math.max(0, p.memberCount - p.memberPreview.length);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card transition-shadow hover:shadow-md">
      <div
        className="relative min-h-[100px] px-3 pt-3 pb-2"
        style={{ backgroundColor: p.coverColor }}
      >
        <div className="relative z-[1] flex items-start justify-between gap-2">
          <span className="rounded bg-black/20 px-2 py-0.5 font-mono text-xs font-medium text-white backdrop-blur-sm">
            {p.code}
          </span>
          {canManage ? (
            <div className="flex gap-0.5">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-white hover:bg-white/20"
                aria-label={`Edit ${p.name}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onEdit(p);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-white hover:bg-red-500/40"
                aria-label={`Hapus ${p.name}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(p);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </div>
        {p.clientLogo ? (
          <div className="relative z-[1] mt-2 flex justify-end">
            {/* eslint-disable-next-line @next/next/no-img-element -- URL eksternal Cloudinary */}
            <img
              src={p.clientLogo}
              alt=""
              className="h-10 max-w-[100px] rounded-md border border-white/30 bg-white/90 object-contain p-1"
            />
          </div>
        ) : null}
        <Link
          href={`/projects/${p.id}`}
          className="absolute inset-0 z-0"
          aria-label={`Buka ${p.name}`}
        />
      </div>

      <div className="relative flex flex-1 flex-col p-3 pt-2">
        <Link
          href={`/projects/${p.id}`}
          className="absolute inset-0 z-0"
          tabIndex={-1}
          aria-hidden
        />
        <div className="relative z-[1] mb-2 flex flex-wrap gap-1.5">
          <span className="rounded-md bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
            {PROJECT_STATUS_LABEL[p.status]}
          </span>
          {p.phase ? (
            <span className="rounded-md bg-sky-500/15 px-2 py-0.5 text-xs font-medium text-sky-700 dark:text-sky-300">
              {PROJECT_PHASE_LABEL[p.phase as ProjectPhase]}
            </span>
          ) : null}
          <span className="rounded-md bg-border/80 px-2 py-0.5 text-xs font-medium">
            {PRIORITY_LABEL[p.priority]}
          </span>
          {overdue ? (
            <span className="rounded-md bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive">
              Lewat jadwal
            </span>
          ) : null}
        </div>

        <h3 className="relative z-[1] line-clamp-2 text-base font-semibold text-foreground">
          {p.name}
        </h3>

        {p.clientName ? (
          <p className="relative z-[1] mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <Building2 className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{p.clientName}</span>
          </p>
        ) : null}

        {p.description ? (
          <p className="relative z-[1] mt-2 line-clamp-2 text-xs text-muted-foreground">
            {truncate(p.description, 80)}
          </p>
        ) : null}

        <div className="relative z-[1] mt-3">
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>Progres</span>
            <span className="tabular-nums font-medium text-foreground">
              {p.progress}%
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-border/60">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, Math.max(0, p.progress))}%`,
                backgroundColor: p.coverColor,
              }}
            />
          </div>
        </div>

        <div className="relative z-[1] mt-3 flex items-end justify-between gap-2 border-t border-border pt-3">
          <div className="flex -space-x-2">
            {p.memberPreview.map((m) => (
              <div
                key={m.userId}
                title={m.name}
                className={cn(
                  'relative z-0 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-card bg-primary text-xs font-medium text-primary-foreground',
                )}
              >
                {m.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.image}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials(m.name)
                )}
              </div>
            ))}
            {extraMembers > 0 ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-muted text-xs font-medium text-muted-foreground">
                +{extraMembers}
              </div>
            ) : null}
            {p.memberCount === 0 ? (
              <span className="text-xs text-muted-foreground">
                Belum ada anggota
              </span>
            ) : null}
          </div>
          {p.endDate ? (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span className={cn(overdue && 'font-medium text-destructive')}>
                {fmtEnd(p.endDate)}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
