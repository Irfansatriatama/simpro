export type NoteAccessRole = 'owner' | 'shared_edit' | 'shared_view';

export type NoteShareRow = {
  userId: string;
  userName: string;
  username: string;
  permission: string;
};

/** Satu baris untuk klien daftar + editor. */
export type NoteClientRow = {
  id: string;
  userId: string;
  title: string | null;
  content: string;
  pinned: boolean;
  color: string | null;
  tags: string[];
  updatedAt: string;
  createdAt: string;
  access: NoteAccessRole;
  ownerName: string;
  ownerId: string;
  sharedWith: NoteShareRow[];
};

export type NoteShareTargetUser = {
  id: string;
  name: string;
  username: string;
};
