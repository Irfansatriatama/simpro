/** Payload serializable untuk halaman laporan proyek (tanpa menyimpan ke tabel Report). */

export type ReportsProgress = {
  byStatus: { key: string; label: string; count: number }[];
  byType: { key: string; label: string; count: number }[];
  total: number;
};

export type ReportsWorkloadRow = {
  userId: string;
  name: string;
  assigned: number;
  open: number;
  storyPoints: number;
};

export type ReportsSprintSummary = {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  status: string;
  totalTasks: number;
  doneTasks: number;
  totalStoryPoints: number;
  doneStoryPoints: number;
};

export type ReportsMaintenance = {
  byStatus: { key: string; label: string; count: number }[];
  recent: { title: string; status: string; statusLabel: string; typeLabel: string }[];
};

export type ReportsAssets = {
  byCategory: { category: string; count: number }[];
  total: number;
};

export type ReportsTimeRow = {
  userId: string;
  name: string;
  minutes: number;
};

export type ReportsPayload = {
  progress: ReportsProgress;
  workload: ReportsWorkloadRow[];
  sprints: ReportsSprintSummary[];
  maintenance: ReportsMaintenance;
  assets: ReportsAssets;
  timeTracking: { totalMinutes: number; byUser: ReportsTimeRow[] };
  filterActive: boolean;
};
