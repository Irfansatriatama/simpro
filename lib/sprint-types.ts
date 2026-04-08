/** Baris sprint untuk UI (nilai tanggal siap input date HTML). */
export type SprintRow = {
  id: string;
  name: string;
  goal: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  completedAt: string | null;
  retro: string | null;
  taskCount: number;
};
