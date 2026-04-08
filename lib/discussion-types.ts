export type DiscussionReplyRow = {
  id: string;
  discussionId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  createdAt: string;
  updatedAt: string;
};

export type DiscussionThreadRow = {
  id: string;
  title: string | null;
  content: string;
  type: string;
  pinned: boolean;
  authorId: string;
  authorName: string;
  authorUsername: string;
  createdAt: string;
  updatedAt: string;
  replies: DiscussionReplyRow[];
};
