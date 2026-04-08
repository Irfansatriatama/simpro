/** Nilai `entityType` yang dipakai saat mencatat log. */
export const ACTIVITY_ENTITY = {
  task: 'task',
  sprint: 'sprint',
  maintenance: 'maintenance',
  discussion: 'discussion',
  discussion_reply: 'discussion_reply',
  meeting: 'meeting',
  asset: 'asset',
} as const;

/** Nilai `action` umum (bebas string lain tetap ditampilkan mentah). */
export const ACTIVITY_ACTION = {
  created: 'created',
  updated: 'updated',
  deleted: 'deleted',
  board_moved: 'board_moved',
  pin_toggled: 'pin_toggled',
} as const;
