export type MeetingProjectPick = { id: string; code: string; name: string };

export type MeetingUserPick = {
  id: string;
  name: string;
  username: string;
  email: string;
  image: string | null;
};

export type MeetingListRow = {
  id: string;
  title: string;
  type: string;
  status: string;
  date: string;
  dateKey: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  creatorName: string;
  projectCodes: string;
  attendeeCount: number;
  agendaDone: number;
  agendaTotal: number;
  attendeePreview: { id: string; name: string; image: string | null }[];
};

export type MeetingAgendaRow = {
  id: string;
  text: string;
  done: boolean;
  order: number;
};

export type MeetingAttachmentRow = {
  id: string;
  name: string;
  url: string;
  size: number | null;
  mimeType: string | null;
};

export type MeetingActionItemRow = {
  id: string;
  text: string;
  assigneeId: string | null;
  dueDate: string | null;
  taskId: string | null;
};

export type MeetingDetail = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  date: string;
  dateKey: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  status: string;
  notulensi: string | null;
  createdBy: string;
  creatorName: string;
  projectIds: string[];
  attendeeIds: string[];
  agendaItems: MeetingAgendaRow[];
  attachments: MeetingAttachmentRow[];
  actionItems: MeetingActionItemRow[];
};
