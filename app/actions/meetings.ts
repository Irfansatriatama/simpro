'use server';

import { revalidatePath } from 'next/cache';
import { ACTIVITY_ACTION, ACTIVITY_ENTITY } from '@/lib/activity-log-constants';
import { recordActivityLog } from '@/lib/activity-log-record';
import {
  isMeetingStatus,
  isMeetingType,
} from '@/lib/meeting-constants';
import { requireManagementSession } from '@/lib/management-auth';
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

function parseMeetingDate(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseAgendaBody(s: string): string[] {
  return s
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
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

async function syncAgendaItems(meetingId: string, lines: string[]) {
  await prisma.meetingAgendaItem.deleteMany({ where: { meetingId } });
  if (lines.length === 0) return;
  await prisma.meetingAgendaItem.createMany({
    data: lines.map((text, order) => ({
      meetingId,
      text,
      order,
      done: false,
    })),
  });
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

  const statusRaw = trim(formData.get('status')) || 'scheduled';
  if (!isMeetingStatus(statusRaw)) {
    return { ok: false, error: 'Status tidak valid.' };
  }

  const dateRaw = trim(formData.get('date'));
  const date = parseMeetingDate(dateRaw);
  if (!date) {
    return { ok: false, error: 'Tanggal/waktu meeting wajib diisi.' };
  }

  const projectIds = readMulti(formData, 'projectIds');
  const attendeeIds = readMulti(formData, 'attendeeIds');
  const agendaLines = parseAgendaBody(trim(formData.get('agenda')));

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
        type: typeRaw,
        date,
        startTime: trim(formData.get('startTime')) || null,
        endTime: trim(formData.get('endTime')) || null,
        location: trim(formData.get('location')) || null,
        status: statusRaw,
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
    if (agendaLines.length > 0) {
      await prisma.meetingAgendaItem.createMany({
        data: agendaLines.map((text, order) => ({
          meetingId: m.id,
          text,
          order,
          done: false,
        })),
      });
    }

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

  const statusRaw = trim(formData.get('status')) || 'scheduled';
  if (!isMeetingStatus(statusRaw)) {
    return { ok: false, error: 'Status tidak valid.' };
  }

  const dateRaw = trim(formData.get('date'));
  const date = parseMeetingDate(dateRaw);
  if (!date) {
    return { ok: false, error: 'Tanggal/waktu meeting wajib diisi.' };
  }

  const projectIds = readMulti(formData, 'projectIds');
  const attendeeIds = readMulti(formData, 'attendeeIds');
  const agendaLines = parseAgendaBody(trim(formData.get('agenda')));

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
        type: typeRaw,
        date,
        startTime: trim(formData.get('startTime')) || null,
        endTime: trim(formData.get('endTime')) || null,
        location: trim(formData.get('location')) || null,
        status: statusRaw,
        notulensi: trim(formData.get('notulensi')) || null,
      },
    });

    await syncAgendaItems(meetingId, agendaLines);

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
    select: { id: true, title: true, projects: { select: { projectId: true }, take: 1 } },
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
