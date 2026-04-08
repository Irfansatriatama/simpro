import type { UserRole, UserStatus } from '@prisma/client';

export type MemberRow = {
  id: string;
  name: string;
  email: string;
  username: string;
  displayUsername: string | null;
  role: UserRole;
  status: UserStatus;
  image: string | null;
  phoneNumber: string | null;
  company: string | null;
  department: string | null;
  position: string | null;
  bio: string | null;
  linkedin: string | null;
  github: string | null;
  timezone: string;
  createdAt: string;
  lastLogin: string | null;
};
