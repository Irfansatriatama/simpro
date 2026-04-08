export type MeetingProjectPick = { id: string; code: string; name: string };

export type MeetingUserPick = {
  id: string;
  name: string;
  username: string;
  email: string;
};

export type MeetingListRow = {
  id: string;
  title: string;
  type: string;
  status: string;
  date: string;
  location: string | null;
  creatorName: string;
  projectCodes: string;
};

export type MeetingAgendaRow = {
  id: string;
  text: string;
  done: boolean;
  order: number;
};

export type MeetingDetail = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  date: string;
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
};
