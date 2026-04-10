'use server';

import { revalidatePath } from 'next/cache';
import { Priority, TaskStatus, TaskType } from '@prisma/client';
import { ACTIVITY_ACTION, ACTIVITY_ENTITY } from '@/lib/activity-log-constants';
import { recordActivityLog } from '@/lib/activity-log-record';
import { boardColumnIdForStatus } from '@/lib/board-columns';
import { requireBacklogAccess } from '@/lib/backlog-access';
import {
  canonicalMeetingType,
  isMeetingStatus,
  isMeetingType,
  normalizeMeetingStatus,
} from '@/lib/meeting-constants';
import { parseMeetingAnchorDate } from '@/lib/meeting-date';
import { meetingDateKeyFromIso } from '@/lib/meeting-date';
import { requireManagementSession } from '@/lib/management-auth';
import type { MeetingDetail } from '@/lib/meeting-types';
import { prisma } from '@/lib/prisma';

export type MeetingActionResult = { ok: true } | { ok: false; error: string };

function trim(s: FormDataEntryValue | null): string {
  return String(s ?? '').trim();
}

function readMulti(formData: FormData, key: string): string[] {
  const all = formData.getAll(key);
  return Array.from(
    new Set(all.map((v) => String(v).trim()).filter(Boolean)),
  );
}

function parseAgendaBody(s: string): string[] {
  return s
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

type AgendaPayload = {
  id?: string;
  text: string;
  order: number;
  done: boolean;
};

function parseAgendaFromForm(formData: FormData): AgendaPayload[] | 'invalid' {
  const json = trim(formData.get('agendaJson'));
  if (json) {
    try {
      const arr = JSON.parse(json) as unknown;
      if (!Array.isArray(arr)) return 'invalid';
      const out: AgendaPayload[] = [];
      for (let i = 0; i < arr.length; i++) {
        const row = arr[i] as Record<string, unknown>;
        if (typeof row?.text !== 'string') continue;
        out.push({
          id: typeof row.id === 'string' ? row.id : undefined,
          text: row.text,
          order: typeof row.order === 'number' ? row.order : i,
          done: Boolean(row.done),
        });
      }
      return out;
    } catch {
      return 'invalid';
    }
  }
  const lines = parseAgendaBody(trim(formData.get('agenda')));
  return lines.map((text, order) => ({ text, order, done: false }));
}

function logProjectId(projectIds: string[]): string | null {
  return projectIds[0] ?? null;
}

async function syncMeetingProjects(
  meetingId: string,
  projectIds: string[],
): Promise<MeetingActionResult | null> {
  for (const pid of projectIds) {
    const p = await prisma.project.findUnique({ where: { id: pid } });
    if (!p) return { ok: false, error: 'Salah satu proyek tidak valid.' };
  }
  await prisma.meetingProject.deleteMany({ where: { meetingId } });
  if (projectIds.length > 0) {
    await prisma.meetingProject.createMany({
      data: projectIds.map((projectId) => ({ meetingId, projectId })),
      skipDuplicates: true,
    });
  }
  return null;
}

async function syncMeetingAttendees(
  meetingId: string,
  userIds: string[],
): Promise<MeetingActionResult | null> {
  for (const uid of userIds) {
    const u = await prisma.user.findUnique({ where: { id: uid } });
    if (!u) return { ok: false, error: 'Salah satu peserta tidak valid.' };
  }
  await prisma.meetingAttendee.deleteMany({ where: { meetingId } });
  if (userIds.length > 0) {
    await prisma.meetingAttendee.createMany({
      data: userIds.map((userId) => ({ meetingId, userId })),
      skipDuplicates: true,
    });
  }
  return null;
}

async function syncAgendaFromPayload(
  meetingId: string,
  items: AgendaPayload[],
): Promise<void> {
  const existing = await prisma.meetingAgendaItem.findMany({
    where: { meetingId },
  });
  const existingIds = new Set(existing.map((e) => e.id));
  const keptIds = new Set<string>();
  const trimmed = items.filter((p) => p.text.trim());

  if (trimmed.length === 0) {
    await prisma.meetingAgendaItem.deleteMany({ where: { meetingId } });
    return;
  }

  for (const p of trimmed) {
    const text = p.text.trim();
    if (p.id && existingIds.has(p.id)) {
      await prisma.meetingAgendaItem.update({
        where: { id: p.id },
        data: { text, order: p.order, done: p.done },
      });
      keptIds.add(p.id);
    } else {
      const created = await prisma.meetingAgendaItem.create({
        data: { meetingId, text, order: p.order, done: p.done },
      });
      keptIds.add(created.id);
    }
  }

  await prisma.meetingAgendaItem.deleteMany({
    where: { meetingId, id: { notIn: Array.from(keptIds) } },
  });
}

/** Untuk dialog edit dari kalender — hanya admin/PM. */
export async function getMeetingFormSnapshotAction(
  meetingId: string,
): Promise<MeetingDetail | null> {
  const ctx = await requireManagementSession();
  if (!ctx) return null;

  const m = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: {
      creator: { select: { name: true } },
      projects: { select: { projectId: true } },
      attendees: { select: { userId: true } },
      agendaItems: { orderBy: { order: 'asc' } },
      attachments: { orderBy: { createdAt: 'asc' } },
      actionItems: { orderBy: { id: 'asc' } },
    },
  });
  if (!m) return null;

  const iso = m.date.toISOString();
  return {
    id: m.id,
    title: m.title,
    description: m.description,
    type: m.type,
    date: iso,
    dateKey: meetingDateKeyFromIso(iso),
    startTime: m.startTime,
    endTime: m.endTime,
    location: m.location,
    status: m.status,
    notulensi: m.notulensi,
    createdBy: m.createdBy,
    creatorName: m.creator.name,
    projectIds: m.projects.map((p) => p.projectId),
    attendeeIds: m.attendees.map((a) => a.userId),
    agendaItems: m.agendaItems.map((a) => ({
      id: a.id,
      text: a.text,
      done: a.done,
      order: a.order,
    })),
    attachments: m.attachments.map((a) => ({
      id: a.id,
      name: a.name,
      url: a.url,
      size: a.size,
      mimeType: a.mimeType,
    })),
    actionItems: m.actionItems.map((a) => ({
      id: a.id,
      text: a.text,
      assigneeId: a.assigneeId,
      dueDate: a.dueDate ? a.dueDate.toISOString() : null,
      taskId: a.taskId,
    })),
  };
}

export async function createMeetingAction(
  formData: FormData,
): Promise<MeetingActionResult> {
  const ctx = await requireManagementSession();
  if (!ctx) return { ok: false, error: 'Hanya administrator atau PM.' };

  const title = trim(formData.get('title'));
  if (!title || title.length < 2) {
    return { ok: false, error: 'Judul minimal 2 karakter.' };
  }

  const typeRaw = trim(formData.get('type')) || 'internal';
  if (!isMeetingType(typeRaw)) {
    return { ok: false, error: 'Tipe meeting tidak valid.' };
  }
  const typeCanon = canonicalMeetingType(typeRaw);

  const statusRaw = trim(formData.get('status')) || 'scheduled';
  if (!isMeetingStatus(statusRaw)) {
    return { ok: false, error: 'Status tidak valid.' };
  }
  const statusCanon = normalizeMeetingStatus(statusRaw);

  const dateYmd = trim(formData.get('date'));
  const date = parseMeetingAnchorDate(dateYmd);
  if (!dateYmd || Number.isNaN(date.getTime())) {
    return { ok: false, error: 'Tanggal meeting wajib diisi.' };
  }

  const agendaParsed = parseAgendaFromForm(formData);
  if (agendaParsed === 'invalid') {
    return { ok: false, error: 'Format agenda tidak valid.' };
  }

  const projectIds = readMulti(formData, 'projectIds');
  const attendeeIds = readMulti(formData, 'attendeeIds');

  for (const pid of projectIds) {
    const p = await prisma.project.findUnique({ where: { id: pid } });
    if (!p) return { ok: false, error: 'Salah satu proyek tidak valid.' };
  }
  for (const uid of attendeeIds) {
    const u = await prisma.user.findUnique({ where: { id: uid } });
    if (!u) return { ok: false, error: 'Salah satu peserta tidak valid.' };
  }

  try {
    const m = await prisma.meeting.create({
      data: {
        title,
        description: trim(formData.get('description')) || null,
        type: typeCanon,
        date,
        startTime: trim(formData.get('startTime')) || null,
        endTime: trim(formData.get('endTime')) || null,
        location: trim(formData.get('location')) || null,
        status: statusCanon,
        notulensi: trim(formData.get('notulensi')) || null,
        createdBy: ctx.userId,
      },
    });

    if (projectIds.length > 0) {
      await prisma.meetingProject.createMany({
        data: projectIds.map((projectId) => ({
          meetingId: m.id,
          projectId,
        })),
        skipDuplicates: true,
      });
    }
    if (attendeeIds.length > 0) {
      await prisma.meetingAttendee.createMany({
        data: attendeeIds.map((userId) => ({
          meetingId: m.id,
          userId,
        })),
        skipDuplicates: true,
      });
    }
    await syncAgendaFromPayload(m.id, agendaParsed);

    await recordActivityLog({
      projectId: logProjectId(projectIds),
      entityType: ACTIVITY_ENTITY.meeting,
      entityId: m.id,
      entityName: m.title,
      action: ACTIVITY_ACTION.created,
      actorId: ctx.userId,
    });

    revalidatePath('/meetings');
    revalidatePath(`/meetings/${m.id}`);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal membuat meeting.' };
  }
}

export async function updateMeetingAction(
  formData: FormData,
): Promise<MeetingActionResult> {
  const ctx = await requireManagementSession();
  if (!ctx) return { ok: false, error: 'Hanya administrator atau PM.' };

  const meetingId = trim(formData.get('meetingId'));
  if (!meetingId) return { ok: false, error: 'Meeting tidak valid.' };

  const existing = await prisma.meeting.findUnique({ where: { id: meetingId } });
  if (!existing) return { ok: false, error: 'Meeting tidak ditemukan.' };

  const title = trim(formData.get('title'));
  if (!title || title.length < 2) {
    return { ok: false, error: 'Judul minimal 2 karakter.' };
  }

  const typeRaw = trim(formData.get('type')) || 'internal';
  if (!isMeetingType(typeRaw)) {
    return { ok: false, error: 'Tipe meeting tidak valid.' };
  }
  const typeCanon = canonicalMeetingType(typeRaw);

  const statusRaw = trim(formData.get('status')) || 'scheduled';
  if (!isMeetingStatus(statusRaw)) {
    return { ok: false, error: 'Status tidak valid.' };
  }
  const statusCanon = normalizeMeetingStatus(statusRaw);

  const dateYmd = trim(formData.get('date'));
  const date = parseMeetingAnchorDate(dateYmd);
  if (!dateYmd || Number.isNaN(date.getTime())) {
    return { ok: false, error: 'Tanggal meeting wajib diisi.' };
  }

  const agendaParsed = parseAgendaFromForm(formData);
  if (agendaParsed === 'invalid') {
    return { ok: false, error: 'Format agenda tidak valid.' };
  }

  const projectIds = readMulti(formData, 'projectIds');
  const attendeeIds = readMulti(formData, 'attendeeIds');

  const ep = await syncMeetingProjects(meetingId, projectIds);
  if (ep) return ep;
  const ea = await syncMeetingAttendees(meetingId, attendeeIds);
  if (ea) return ea;

  try {
    await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        title,
        description: trim(formData.get('description')) || null,
        type: typeCanon,
        date,
        startTime: trim(formData.get('startTime')) || null,
        endTime: trim(formData.get('endTime')) || null,
        location: trim(formData.get('location')) || null,
        status: statusCanon,
        notulensi: trim(formData.get('notulensi')) || null,
      },
    });

    await syncAgendaFromPayload(meetingId, agendaParsed);

    await recordActivityLog({
      projectId: logProjectId(projectIds),
      entityType: ACTIVITY_ENTITY.meeting,
      entityId: meetingId,
      entityName: title,
      action: ACTIVITY_ACTION.updated,
      actorId: ctx.userId,
    });

    revalidatePath('/meetings');
    revalidatePath(`/meetings/${meetingId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal memperbarui meeting.' };
  }
}

export async function deleteMeetingAction(
  formData: FormData,
): Promise<MeetingActionResult> {
  const ctx = await requireManagementSession();
  if (!ctx) return { ok: false, error: 'Hanya administrator atau PM.' };

  const meetingId = trim(formData.get('meetingId'));
  if (!meetingId) return { ok: false, error: 'Meeting tidak valid.' };

  const existing = await prisma.meeting.findUnique({
    where: { id: meetingId },
    select: {
      id: true,
      title: true,
      projects: { select: { projectId: true }, take: 1 },
    },
  });
  if (!existing) return { ok: false, error: 'Meeting tidak ditemukan.' };

  try {
    await prisma.meeting.delete({ where: { id: meetingId } });
    await recordActivityLog({
      projectId: existing.projects[0]?.projectId ?? null,
      entityType: ACTIVITY_ENTITY.meeting,
      entityId: meetingId,
      entityName: existing.title,
      action: ACTIVITY_ACTION.deleted,
      actorId: ctx.userId,
    });
    revalidatePath('/meetings');
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal menghapus meeting.' };
  }
}

export async function toggleMeetingAgendaItemAction(payload: {
  meetingId: string;
  itemId: string;
  done: boolean;
}): Promise<MeetingActionResult> {
  const ctx = await requireManagementSession();
  if (!ctx) return { ok: false, error: 'Hanya administrator atau PM.' };

  const item = await prisma.meetingAgendaItem.findFirst({
    where: { id: payload.itemId, meetingId: payload.meetingId },
  });
  if (!item) return { ok: false, error: 'Item tidak ditemukan.' };

  try {
    await prisma.meetingAgendaItem.update({
      where: { id: payload.itemId },
      data: { done: payload.done },
    });
    revalidatePath('/meetings');
    revalidatePath(`/meetings/${payload.meetingId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal memperbarui agenda.' };
  }
}

export async function updateMeetingNotulensiAction(
  formData: FormData,
): Promise<MeetingActionResult> {
  const ctx = await requireManagementSession();
  if (!ctx) return { ok: false, error: 'Hanya administrator atau PM.' };

  const meetingId = trim(formData.get('meetingId'));
  if (!meetingId) return { ok: false, error: 'Meeting tidak valid.' };

  const m = await prisma.meeting.findUnique({ where: { id: meetingId } });
  if (!m) return { ok: false, error: 'Meeting tidak ditemukan.' };

  try {
    await prisma.meeting.update({
      where: { id: meetingId },
      data: { notulensi: trim(formData.get('notulensi')) || null },
    });
    revalidatePath(`/meetings/${meetingId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal menyimpan notulensi.' };
  }
}

export async function addMeetingAttachmentAction(
  formData: FormData,
): Promise<MeetingActionResult> {
  const ctx = await requireManagementSession();
  if (!ctx) return { ok: false, error: 'Hanya administrator atau PM.' };

  const meetingId = trim(formData.get('meetingId'));
  const url = trim(formData.get('url'));
  const name = trim(formData.get('name')) || 'lampiran';
  if (!meetingId || !url) {
    return { ok: false, error: 'Meeting atau URL lampiran tidak valid.' };
  }

  const m = await prisma.meeting.findUnique({ where: { id: meetingId } });
  if (!m) return { ok: false, error: 'Meeting tidak ditemukan.' };

  const sizeRaw = trim(formData.get('size'));
  const size =
    sizeRaw === '' ? null : Math.round(Number(sizeRaw)) || null;
  const mimeType = trim(formData.get('mimeType')) || null;

  try {
    await prisma.meetingAttachment.create({
      data: { meetingId, name, url, size, mimeType },
    });
    revalidatePath(`/meetings/${meetingId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal menambah lampiran.' };
  }
}

export async function deleteMeetingAttachmentAction(
  formData: FormData,
): Promise<MeetingActionResult> {
  const ctx = await requireManagementSession();
  if (!ctx) return { ok: false, error: 'Hanya administrator atau PM.' };

  const id = trim(formData.get('attachmentId'));
  const meetingId = trim(formData.get('meetingId'));
  if (!id || !meetingId) return { ok: false, error: 'Lampiran tidak valid.' };

  try {
    await prisma.meetingAttachment.deleteMany({
      where: { id, meetingId },
    });
    revalidatePath(`/meetings/${meetingId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal menghapus lampiran.' };
  }
}

export async function addMeetingActionItemAction(
  formData: FormData,
): Promise<MeetingActionResult> {
  const ctx = await requireManagementSession();
  if (!ctx) return { ok: false, error: 'Hanya administrator atau PM.' };

  const meetingId = trim(formData.get('meetingId'));
  const text = trim(formData.get('text'));
  if (!meetingId || !text) {
    return { ok: false, error: 'Meeting dan teks action item wajib diisi.' };
  }

  const m = await prisma.meeting.findUnique({ where: { id: meetingId } });
  if (!m) return { ok: false, error: 'Meeting tidak ditemukan.' };

  const assigneeId = trim(formData.get('assigneeId')) || null;
  if (assigneeId) {
    const u = await prisma.user.findUnique({ where: { id: assigneeId } });
    if (!u) return { ok: false, error: 'Penanggung jawab tidak valid.' };
  }

  const dueRaw = trim(formData.get('dueDate'));
  let dueDate: Date | null = null;
  if (dueRaw) {
    dueDate = new Date(dueRaw);
    if (Number.isNaN(dueDate.getTime())) dueDate = null;
  }

  try {
    await prisma.meetingActionItem.create({
      data: { meetingId, text, assigneeId, dueDate },
    });
    revalidatePath(`/meetings/${meetingId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal menambah action item.' };
  }
}

export async function deleteMeetingActionItemAction(
  formData: FormData,
): Promise<MeetingActionResult> {
  const ctx = await requireManagementSession();
  if (!ctx) return { ok: false, error: 'Hanya administrator atau PM.' };

  const id = trim(formData.get('actionItemId'));
  const meetingId = trim(formData.get('meetingId'));
  if (!id || !meetingId) return { ok: false, error: 'Action item tidak valid.' };

  try {
    await prisma.meetingActionItem.deleteMany({
      where: { id, meetingId },
    });
    revalidatePath(`/meetings/${meetingId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal menghapus action item.' };
  }
}

const STATUS_ADVANCE: Record<string, string | null> = {
  scheduled: 'ongoing',
  ongoing: 'done',
  done: null,
  cancelled: null,
  completed: null,
};

export async function advanceMeetingStatusAction(
  formData: FormData,
): Promise<MeetingActionResult> {
  const ctx = await requireManagementSession();
  if (!ctx) return { ok: false, error: 'Hanya administrator atau PM.' };

  const meetingId = trim(formData.get('meetingId'));
  if (!meetingId) return { ok: false, error: 'Meeting tidak valid.' };

  const m = await prisma.meeting.findUnique({ where: { id: meetingId } });
  if (!m) return { ok: false, error: 'Meeting tidak ditemukan.' };

  const current = normalizeMeetingStatus(m.status);
  const next = STATUS_ADVANCE[current];
  if (!next) {
    return { ok: false, error: 'Status tidak bisa ditingkatkan lagi.' };
  }

  try {
    await prisma.meeting.update({
      where: { id: meetingId },
      data: { status: next },
    });
    revalidatePath('/meetings');
    revalidatePath(`/meetings/${meetingId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal memperbarui status.' };
  }
}

export async function createTaskFromMeetingActionItemAction(
  formData: FormData,
): Promise<MeetingActionResult> {
  const ctx = await requireManagementSession();
  if (!ctx) return { ok: false, error: 'Hanya administrator atau PM.' };

  const meetingId = trim(formData.get('meetingId'));
  const actionItemId = trim(formData.get('actionItemId'));
  if (!meetingId || !actionItemId) {
    return { ok: false, error: 'Meeting atau action item tidak valid.' };
  }

  const [meeting, ai] = await Promise.all([
    prisma.meeting.findUnique({
      where: { id: meetingId },
      include: { projects: { take: 1, select: { projectId: true } } },
    }),
    prisma.meetingActionItem.findFirst({
      where: { id: actionItemId, meetingId },
    }),
  ]);

  if (!meeting || !ai) {
    return { ok: false, error: 'Data tidak ditemukan.' };
  }
  if (ai.taskId) {
    return { ok: false, error: 'Sudah dikonversi ke tugas.' };
  }

  const projectId = meeting.projects[0]?.projectId;
  if (!projectId) {
    return {
      ok: false,
      error: 'Tautkan minimal satu proyek ke meeting untuk membuat tugas.',
    };
  }

  const backlog = await requireBacklogAccess(projectId);
  if (!backlog?.canEdit) {
    return { ok: false, error: 'Tidak punya akses menulis backlog proyek.' };
  }

  if (ai.assigneeId) {
    const mem = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId: ai.assigneeId },
      },
    });
    if (!mem) {
      return {
        ok: false,
        error: 'Penanggung jawab harus menjadi anggota proyek terkait.',
      };
    }
  }

  try {
    const task = await prisma.$transaction(async (tx) => {
      const t = await tx.task.create({
        data: {
          projectId,
          title: ai.text.slice(0, 500),
          description: `Dari meeting: ${meeting.title}`,
          type: TaskType.task,
          status: TaskStatus.backlog,
          priority: Priority.medium,
          reporterId: ctx.userId,
          dueDate: ai.dueDate,
          tags: [],
          timeLogged: 0,
          columnId: boardColumnIdForStatus(TaskStatus.backlog),
        },
      });
      if (ai.assigneeId) {
        await tx.taskAssignee.create({
          data: { taskId: t.id, userId: ai.assigneeId },
        });
      }
      await tx.meetingActionItem.update({
        where: { id: ai.id },
        data: { taskId: t.id },
      });
      return t;
    });

    await recordActivityLog({
      projectId,
      entityType: ACTIVITY_ENTITY.task,
      entityId: task.id,
      entityName: task.title,
      action: ACTIVITY_ACTION.created,
      actorId: ctx.userId,
    });

    revalidatePath(`/projects/${projectId}/backlog`);
    revalidatePath(`/projects/${projectId}/board`);
    revalidatePath(`/meetings/${meetingId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal membuat tugas.' };
  }
}
