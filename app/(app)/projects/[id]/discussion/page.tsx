import { DiscussionClient } from '@/components/discussion/discussion-client';
import { auth } from '@/lib/auth';
import { isDiscussionType } from '@/lib/discussion-constants';
import type {
  DiscussionReplyRow,
  DiscussionThreadRow,
} from '@/lib/discussion-types';
import {
  canManageProjects,
  projectViewWhere,
} from '@/lib/project-access';
import { prisma } from '@/lib/prisma';
import { getUserRole } from '@/lib/session-user';
import { canEditTasksInProject } from '@/lib/task-access';
import type { Prisma } from '@prisma/client';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 8;

export default async function DiscussionPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { page?: string; q?: string; type?: string };
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect('/login');

  const userId = session.user.id;
  const role = getUserRole(session);
  const projectId = params.id;

  const project = await prisma.project.findFirst({
    where: projectViewWhere(userId, role, projectId),
    select: { id: true },
  });
  if (!project) notFound();

  const memberRecord = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  const canPost = canEditTasksInProject(role, !!memberRecord);
  const canModerate = canManageProjects(role);

  const q = (searchParams?.q ?? '').trim();
  const typeParam = (searchParams?.type ?? 'all').trim();
  const pageRaw = Number(searchParams?.page ?? '1');
  const page =
    Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;

  const where: Prisma.DiscussionWhereInput = { projectId };
  if (typeParam !== 'all' && isDiscussionType(typeParam)) {
    where.type = typeParam;
  }
  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { content: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [totalThreads, discussions] = await Promise.all([
    prisma.discussion.count({ where }),
    prisma.discussion.findMany({
      where,
      orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        author: { select: { id: true, name: true, username: true } },
        replies: { orderBy: { createdAt: 'asc' } },
        attachments: { orderBy: { createdAt: 'asc' } },
      },
    }),
  ]);

  const replyAuthorIds = new Set<string>();
  for (const d of discussions) {
    for (const r of d.replies) {
      replyAuthorIds.add(r.authorId);
    }
  }
  const replyAuthors =
    replyAuthorIds.size > 0
      ? await prisma.user.findMany({
          where: { id: { in: Array.from(replyAuthorIds) } },
          select: { id: true, name: true, username: true },
        })
      : [];
  const replyAuthorMap = new Map(
    replyAuthors.map((u) => [u.id, u] as const),
  );

  const threads: DiscussionThreadRow[] = discussions.map((d) => {
    const replies: DiscussionReplyRow[] = d.replies.map((r) => {
      const u = replyAuthorMap.get(r.authorId);
      return {
        id: r.id,
        discussionId: r.discussionId,
        content: r.content,
        authorId: r.authorId,
        authorName: u?.name ?? 'Pengguna',
        authorUsername: u?.username ?? '?',
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      };
    });
    return {
      id: d.id,
      title: d.title,
      content: d.content,
      type: d.type,
      pinned: d.pinned,
      authorId: d.authorId,
      authorName: d.author.name,
      authorUsername: d.author.username,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
      replies,
      attachments: d.attachments.map((a) => ({
        id: a.id,
        discussionId: a.discussionId,
        name: a.name,
        url: a.url,
        size: a.size,
        mimeType: a.mimeType,
        createdAt: a.createdAt.toISOString(),
      })),
    };
  });

  return (
    <DiscussionClient
      projectId={projectId}
      threads={threads}
      totalThreads={totalThreads}
      page={page}
      pageSize={PAGE_SIZE}
      query={q}
      typeFilter={typeParam}
      currentUserId={userId}
      canPost={canPost}
      canModerate={canModerate}
    />
  );
}
