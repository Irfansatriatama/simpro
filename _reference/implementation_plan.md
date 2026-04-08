# Migration Plan: Trackly — Vanilla JS + Firebase → Next.js + NestJS + Supabase

## Ringkasan Codebase

Berdasarkan analisis mendalam terhadap kode yang ada:

**Statistik Kode:**
- `app.js` — 1.105 baris (entry point + router + login + setup wizard)
- 21 module di `js/modules/` (total ~650KB JS)
- 9 core utilities di `js/core/`
- 7 komponen UI di `js/components/`
- CSS: 4 file global + 15 halaman + 1 komponen (total ~400KB CSS)

---

## 1. Inventaris Lengkap: Halaman & Fitur

### Halaman (Routes → Next.js App Router)

| Route Lama (hash) | Modul JS | Next.js Route Baru | Role Guard |
|---|---|---|---|
| `#/login` | `app.js` (inline) | `/login` | Public |
| `#/dashboard` | `dashboard.js` | `/dashboard` | All |
| `#/projects` | `projects.js` | `/projects` | All |
| `#/projects/:id` | `projects.js` | `/projects/[id]` | All |
| `#/projects/:id/board` | `board.js` | `/projects/[id]/board` | All |
| `#/projects/:id/backlog` | `backlog.js` | `/projects/[id]/backlog` | All |
| `#/projects/:id/sprint` | `sprint.js` | `/projects/[id]/sprint` | All |
| `#/projects/:id/gantt` | `gantt.js` | `/projects/[id]/gantt` | All |
| `#/projects/:id/maintenance` | `maintenance.js` | `/projects/[id]/maintenance` | All |
| `#/projects/:id/maintenance-report` | `maintenance-report.js` | `/projects/[id]/maintenance-report` | Admin/PM |
| `#/projects/:id/reports` | `reports.js` | `/projects/[id]/reports` | All |
| `#/projects/:id/discussion` | `discussion.js` | `/projects/[id]/discussion` | All |
| `#/projects/:id/log` | `log.js` | `/projects/[id]/log` | Admin/PM |
| `#/meetings` | `meetings.js` | `/meetings` | All |
| `#/meetings/:id` | `meetings.js` (renderDetail) | `/meetings/[id]` | All |
| `#/clients` | `clients.js` | `/clients` | All |
| `#/assets` | `assets.js` | `/assets` | All |
| `#/members` | `members.js` | `/members` | Admin only |
| `#/settings` | `settings.js` | `/settings` | All |
| `#/guide` | `guide.js` | `/guide` | All |
| `#/project-guide` | `project-guide.js` | `/project-guide` | Admin/PM |
| `#/notifications` | `notifications.js` | `/notifications` | All |
| `#/notes` | `notes.js` | `/notes` | All |
| `#/profile` | `profile.js` | `/profile` | All |

### Fitur Inti
1. **Auth** — Custom username/password auth, session di localStorage, SHA-256 password hashing, "remember me", setup wizard (first-run)
2. **Projects** — CRUD, sub-project (parent_id), filter multi-kriteria, cover color picker, member picker dengan project roles, breadcrumb, progress bar
3. **Board** — Kanban drag-and-drop, WIP limits, custom columns
4. **Backlog** — CRUD tasks, Epic grouping, sprint assignment, dependency tracking (blocking/blocked), filter, sort, CSV export
5. **Sprint** — Sprint management, burndown chart, velocity tracking, start/complete sprint
6. **Gantt** — Timeline visualization dengan SVG
7. **Maintenance** — Ticket management, SLA tracking, Kanban board
8. **Reports** — Multi-tab (Progress, Workload, Burndown, Maintenance, Assets), CSV + PDF export
9. **Discussion** — Thread-based comments dengan @mentions
10. **Meetings** — CRUD meeting, agenda, attendees, lampiran via Cloudinary
11. **Clients** — CRUD client dengan logo upload via Cloudinary
12. **Assets** — Asset management dengan file/image upload via Cloudinary
13. **Members** — Full user CRUD, avatar upload via Cloudinary, role management
14. **Notifications** — Real-time(ish) notif dari activity_log, 2-tier (personal + broadcast), mark read/all
15. **Notes** — Rich text notes dengan folder
16. **Activity Log** — Audit trail semua aksi
17. **Settings** — App preferences
18. **Guide/Project Guide** — Static content halaman panduan

### Firestore Collections (→ Prisma Tables)

| Firestore Collection | Entity | Catatan |
|---|---|---|
| `users` | User | username + SHA-256 hash, bukan Firebase Auth |
| `projects` | Project | `members` array of `{user_id, project_role}` |
| `tasks` | Task | `assignees[]`, `dependencies[]`, subtask via `parent_task_id` |
| `sprints` | Sprint | |
| `clients` | Client | logo dari Cloudinary |
| `assets` | Asset | file URL dari Cloudinary |
| `maintenance` | Maintenance | |
| `meetings` | Meeting | attachments via Cloudinary |
| `discussions` | Discussion | |
| `notes` | Note | |
| `note_folders` | NoteFolder | |
| `activity_log` | ActivityLog | audit trail |
| `notifications` | Notification | per-user |

---

## 2. Proposed Changes

### Fase 1: Monorepo Setup & Infrastructure

#### [NEW] `turbo.json`
Pipeline Turborepo untuk `build`, `dev`, `lint`.

#### [NEW] `apps/web/` — Next.js App
```
apps/web/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (dashboard)/layout.tsx   ← shell, sidebar, topbar
│   ├── dashboard/page.tsx
│   ├── projects/
│   │   ├── page.tsx
│   │   └── [id]/
│   │       ├── page.tsx
│   │       ├── board/page.tsx
│   │       ├── backlog/page.tsx
│   │       └── ... (11 sub-pages)
│   ├── meetings/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── clients/page.tsx
│   ├── assets/page.tsx
│   ├── members/page.tsx
│   ├── notifications/page.tsx
│   ├── notes/page.tsx
│   ├── settings/page.tsx
│   └── ...
├── components/
│   ├── ui/           ← shadcn/ui
│   ├── layout/       ← Sidebar, Topbar, MobileNav
│   └── shared/       ← Badge, Avatar, Toast, Modal, Confirm
├── lib/
│   ├── supabase.ts   ← client
│   ├── api.ts        ← fetch wrapper to NestJS
│   └── utils.ts      ← formatDate, formatCurrency, dll
└── middleware.ts     ← auth guard
```

#### [NEW] `apps/api/` — NestJS
```
apps/api/
├── src/
│   ├── app.module.ts
│   ├── auth/         ← AuthModule, guards, JWT strategy
│   ├── projects/
│   ├── tasks/
│   ├── sprints/
│   ├── members/
│   ├── clients/
│   ├── assets/
│   ├── maintenance/
│   ├── meetings/
│   ├── discussions/
│   ├── notifications/
│   ├── notes/
│   ├── activity-log/
│   └── cloudinary/   ← upload service
├── prisma/
│   └── schema.prisma
└── .env
```

#### [NEW] `packages/shared/`
```
packages/shared/
└── src/
    ├── types/
    │   ├── user.ts
    │   ├── project.ts
    │   ├── task.ts
    │   └── ...
    └── constants/
        ├── status.ts
        └── roles.ts
```

---

### Fase 2: Auth Migration

#### Strategi Auth
Auth saat ini adalah **custom username-based** (bukan Firebase Auth native). Password di-hash SHA-256 di client dan disimpan di Firestore `users` collection.

**Migrasi ke Supabase + NestJS:**
- Supabase Auth digunakan untuk session management (JWT)
- Password di-re-hash dengan bcrypt di NestJS pada saat migrasi data
- Login tetap berbasis username (bukan email) — perlu custom logic di API

#### [NEW] `apps/api/src/auth/auth.service.ts`
```typescript
// Existing: SHA-256 hash di client-side
// Baru: bcrypt di server-side
async validateUser(username: string, password: string) {
  const user = await this.prisma.user.findUnique({ where: { username } });
  if (!user) return null;
  const isValid = await bcrypt.compare(password, user.passwordHash);
  return isValid ? user : null;
}
```

#### [MODIFY] `apps/web/app/(auth)/login/page.tsx`
Login page sebagai Client Component, yang mengirim kredensial ke `/api/auth/login` NestJS, lalu store JWT di httpOnly cookie.

---

### Fase 3: Database Schema (Prisma)

#### [NEW] `apps/api/prisma/schema.prisma`

Schema lengkap berdasarkan Firestore collections yang ada. Karena Firestore menggunakan nested arrays, perlu normalisasi ke SQL:

```prisma
model User {
  id           String    @id @default(cuid())
  username     String    @unique
  fullName     String
  email        String    @unique
  passwordHash String
  role         UserRole
  status       UserStatus @default(ACTIVE)
  avatar       String?
  department   String?
  position     String?
  clientId     String?
  client       Client?   @relation(fields: [clientId], references: [id])
  timezone     String    @default("Asia/Jakarta")
  bio          String?
  linkedin     String?
  github       String?
  lastLogin    DateTime?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  
  projectMembers ProjectMember[]
  assignedTasks  TaskAssignee[]
  notifications  Notification[]
}

model Project {
  id            String  @id
  name          String
  code          String
  description   String?
  status        ProjectStatus @default(PLANNING)
  phase         ProjectPhase?
  priority      Priority @default(MEDIUM)
  clientId      String?
  client        Client? @relation(fields: [clientId], references: [id])
  parentId      String?
  parent        Project? @relation("SubProjects", fields: [parentId], references: [id])
  children      Project[] @relation("SubProjects")
  startDate     DateTime?
  endDate       DateTime?
  actualEndDate DateTime?
  budget        Float   @default(0)
  actualCost    Float   @default(0)
  tags          String[] // Supabase supports arrays
  coverColor    String  @default("#2563EB")
  progress      Int     @default(0)
  createdBy     String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  members       ProjectMember[]
  tasks         Task[]
  sprints       Sprint[]
  maintenance   MaintenanceTicket[]
  meetings      Meeting[]
  discussions   Discussion[]
  activityLogs  ActivityLog[]
}

// ProjectMember junction table (menggantikan embedded array)
model ProjectMember {
  id          String @id @default(cuid())
  projectId   String
  project     Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  userId      String
  user        User @relation(fields: [userId], references: [id], onDelete: Cascade)
  projectRole ProjectRole @default(DEVELOPER)
  
  @@unique([projectId, userId])
}

model Task {
  id           String    @id
  projectId    String
  project      Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  sprintId     String?
  sprint       Sprint?   @relation(fields: [sprintId], references: [id])
  epicId       String?
  parentTaskId String?
  parentTask   Task?     @relation("SubTasks", fields: [parentTaskId], references: [id])
  subTasks     Task[]    @relation("SubTasks")
  title        String
  description  String?
  type         TaskType  @default(STORY)
  status       TaskStatus @default(BACKLOG)
  priority     Priority  @default(MEDIUM)
  storyPoints  Int?
  reporterId   String?
  startDate    DateTime?
  dueDate      DateTime?
  timeLogged   Int       @default(0) // minutes
  tags         String[]
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  
  assignees    TaskAssignee[]
  dependencies TaskDependency[] @relation("DependentTask")
  dependents   TaskDependency[] @relation("BlockingTask")
}

// ... (Sprint, Client, Asset, Meeting, Discussion, Notification, ActivityLog, Note, NoteFolder, MaintenanceTicket)
```

> **Catatan Penting:** `members` array di Project (Firestore) harus dinormalisasi ke tabel junction `ProjectMember`. Ini adalah perubahan struktur data terbesar.

---

### Fase 4: Frontend Components Mapping

| Komponen Lama (Vanilla JS) | Komponen Baru (shadcn/ui + Custom) |
|---|---|
| `modal.js` + `confirm.js` | `Dialog`, `AlertDialog` (shadcn) |
| `toast.js` | `Sonner` / `useToast` (shadcn) |
| `badge.js` | `Badge` (shadcn) |
| `sidebar.js` | Custom `Sidebar` React component |
| `topbar.js` | Custom `Topbar` React component |
| `avatar.js` | `Avatar` (shadcn) |
| Filter modals | `Sheet` atau `Dialog` (shadcn) |
| Form inputs | `Input`, `Select`, `Textarea` (shadcn) |
| Lucide icons | `lucide-react` (package, bukan CDN) |

---

## 3. Contoh Konversi Konkret

### Contoh 1: Database Layer (`db.js` → API Client + NestJS Controller)

**LAMA — `js/core/db.js`:**
```javascript
// Vanilla Firestore wrapper
export async function getAll(storeName) {
  const querySnapshot = await getDocs(collection(db, storeName));
  return querySnapshot.docs.map(doc => doc.data());
}

export async function add(storeName, record) {
  const docRef = doc(db, storeName, record.id);
  await setDoc(docRef, record);
  return record.id;
}
```

**BARU — `apps/api/src/projects/projects.service.ts` (NestJS):**
```typescript
@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, role: UserRole) {
    // Different query based on role
    if (role === 'admin' || role === 'pm') {
      return this.prisma.project.findMany({
        include: { client: true, members: { include: { user: true } } },
        orderBy: { updatedAt: 'desc' },
      });
    }
    // viewer/developer: only projects they're members of
    return this.prisma.project.findMany({
      where: { members: { some: { userId } } },
      include: { client: true, members: { include: { user: true } } },
    });
  }

  async create(createProjectDto: CreateProjectDto, createdBy: string) {
    const { memberIds, ...projectData } = createProjectDto;
    return this.prisma.project.create({
      data: {
        ...projectData,
        createdBy,
        members: {
          create: memberIds?.map(({ userId, projectRole }) => ({ userId, projectRole })) ?? [],
        },
      },
    });
  }
}
```

**BARU — `apps/web/lib/api/projects.ts` (Next.js fetch wrapper):**
```typescript
export async function getProjects(): Promise<Project[]> {
  const res = await fetch(`${API_URL}/projects`, {
    headers: { Authorization: `Bearer ${getToken()}` },
    next: { tags: ['projects'] }, // Next.js cache tag
  });
  if (!res.ok) throw new Error('Failed to fetch projects');
  return res.json();
}
```

---

### Contoh 2: Auth (`auth.js` + `app.js` login → Next.js + NestJS)

**LAMA — Login di `app.js` (baris 519–579):**
```javascript
// Fetch semua user dari Firestore lalu filter di client-side!
const users = await getAll('users');
let user = users.find(u => u.username.toLowerCase() === usernameInput.toLowerCase());
const isValid = await verifyPassword(password, user.password_hash);
createSession(user, remember); // simpan di localStorage
```

**BARU — `apps/api/src/auth/auth.controller.ts`:**
```typescript
@Post('login')
async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
  const user = await this.authService.validateUser(dto.username, dto.password);
  if (!user) throw new UnauthorizedException('Invalid credentials');
  
  const { accessToken } = await this.authService.generateToken(user);
  
  // HttpOnly cookie — lebih aman dari localStorage
  res.cookie('auth_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: dto.remember ? 30 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000,
  });
  
  return { user: { id: user.id, role: user.role, fullName: user.fullName } };
}
```

**BARU — `apps/web/app/(auth)/login/page.tsx`:**
```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: formData.get('username'),
        password: formData.get('password'),
        remember: formData.get('remember') === 'on',
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!res.ok) {
      setError('Username or password is incorrect.');
      return;
    }
    
    router.push('/dashboard');
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 p-8">
        <h1 className="text-2xl font-bold">TRACKLY</h1>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <Input name="username" placeholder="Username" required />
        <Input name="password" type="password" placeholder="Password" required />
        <Button type="submit" className="w-full">Sign In</Button>
      </form>
    </div>
  );
}
```

---

### Contoh 3: Module → React Component (`members.js` → `MembersPage.tsx`)

**LAMA — `js/modules/members.js` (pola template string):**
```javascript
// DOM manipulation manual — 678 baris
function renderMembersPage() {
  const content = document.getElementById('main-content');
  content.innerHTML = `
    <div class="page-container page-enter">
      <div class="page-header">
        <h1>Members</h1>
        <button id="btnAddMember">Add Member</button>
      </div>
      <div id="membersTableContainer">${renderMembersTable()}</div>
    </div>`;
  bindPageEvents(); // manual event delegation
}

// State management manual dengan module-level variables
let _members = [];
let _filterRole = '';
```

**BARU — `apps/web/app/members/page.tsx`:**
```tsx
import { getMembers } from '@/lib/api/members';
import MembersClient from './members-client';

// Server Component — data fetching di server
export default async function MembersPage() {
  const members = await getMembers(); // fetch dari NestJS di server-side
  const clients = await getClients();
  return <MembersClient initialMembers={members} initialClients={clients} />;
}
```

```tsx
// apps/web/app/members/members-client.tsx
'use client';
import { useState } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { columns } from './columns';
import { Button } from '@/components/ui/button';
import { AddMemberDialog } from '@/components/members/add-member-dialog';

export default function MembersClient({ initialMembers, initialClients }) {
  const [members, setMembers] = useState(initialMembers);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [search, setSearch] = useState('');
  
  const filtered = members.filter(m => 
    m.fullName.toLowerCase().includes(search.toLowerCase()) ||
    m.username.toLowerCase().includes(search.toLowerCase())
  );
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Members</h1>
        <Button onClick={() => setShowAddDialog(true)}>Add Member</Button>
      </div>
      <Input 
        placeholder="Search members..." 
        value={search} 
        onChange={e => setSearch(e.target.value)} 
      />
      <DataTable columns={columns} data={filtered} />
      <AddMemberDialog 
        open={showAddDialog} 
        onOpenChange={setShowAddDialog}
        clients={initialClients}
        onSuccess={(newMember) => setMembers(prev => [...prev, newMember])}
      />
    </div>
  );
}
```

---

### Contoh 4: Cloudinary Upload (`cloudinary.js` → NestJS Upload Service)

**LAMA — `js/core/cloudinary.js`:**
```javascript
// Upload langsung dari browser ke Cloudinary — EXPOSED credentials!
const CLOUD_NAME = 'dc6d0tiuk';
const UPLOAD_PRESET = 'trackly'; // unsigned preset
export async function uploadFile(fileOrBase64, customFilename = null) {
  const formData = new FormData();
  formData.append('file', blob, filename);
  formData.append('upload_preset', UPLOAD_PRESET);
  const response = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
  return data.secure_url;
}
```

**BARU — `apps/api/src/cloudinary/cloudinary.service.ts`:**
```typescript
// Upload via backend — credentials aman di server
@Injectable()
export class CloudinaryService {
  private cloudinary = v2; // configured via env
  
  async uploadFile(buffer: Buffer, filename: string, folder: string) {
    return new Promise((resolve, reject) => {
      this.cloudinary.uploader.upload_stream(
        { folder, public_id: filename, resource_type: 'auto' },
        (error, result) => error ? reject(error) : resolve(result.secure_url)
      ).end(buffer);
    });
  }
}

// apps/api/src/members/members.controller.ts
@Post(':id/avatar')
@UseInterceptors(FileInterceptor('file'))
async uploadAvatar(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
  const url = await this.cloudinaryService.uploadFile(file.buffer, `avatar_${id}`, 'avatars');
  return this.membersService.updateAvatar(id, url);
}
```

---

### Contoh 5: Notification System (`logActivity` di `utils.js`)

**LAMA:** Notifikasi digenerate di client-side saat setiap aksi, dengan direct Firestore write.

```javascript
// utils.js - _generateNotifications() dipanggil setelah setiap logActivity
await add('notifications', { id: notifId, user_id: uid, message: ..., read: false });
```

**BARU Architecture:** 
- NestJS emits events via `EventEmitter2` setelah setiap mutation  
- `NotificationService` subscribes dan create notifications  
- Supabase Realtime push ke Frontend via WebSocket

```typescript
// apps/api/src/notifications/notifications.service.ts
@OnEvent('task.created')
async handleTaskCreated(payload: TaskCreatedEvent) {
  const recipients = await this.getRecipients(payload);
  await this.prisma.notification.createMany({
    data: recipients.map(userId => ({
      userId, entityType: 'task', message: `...`, read: false,
    })),
  });
  // Optionally: broadcast via Supabase Realtime
}
```

---

## 4. Urutan Prioritas Pengerjaan

### Fase 1 — Foundation (Minggu 1-2) 🔴 Critical
1. Init Turborepo monorepo
2. Create Next.js app (web) + NestJS app (api) + shared package
3. Setup Supabase project + koneksi Prisma
4. Init shadcn/ui di web app
5. **Auth flow** end-to-end: Login → JWT → middleware guard
6. Setup Wizard (first-run) migration

### Fase 2 — Data Migration (Minggu 2-3) 🔴 Critical
7. Buat Prisma schema lengkap + migrate
8. **Data export script** dari Firestore → JSON
9. **Data import script** JSON → PostgreSQL (termasuk password re-hash SHA-256 → bcrypt)
10. API: User/Member CRUD + Cloudinary avatar upload

### Fase 3 — Core Pages (Minggu 3-5) 🟡 High
11. App Shell: Sidebar + Topbar layouts dengan navigation
12. Dashboard page (stats, charts, activity)
13. Projects list + detail + create/edit modal
14. Members page (admin-only)
15. Clients page

### Fase 4 — Project Sub-pages (Minggu 5-8) 🟡 High
16. Backlog (paling kompleks — Epic, dependency, Sprint assignment)
17. Board (Kanban drag-and-drop — gunakan `@dnd-kit`)
18. Sprint management + burndown chart
19. Gantt chart (SVG atau library seperti `frappe-gantt`)
20. Discussion + @mentions

### Fase 5 — Advanced Features (Minggu 8-10) 🟢 Medium
21. Maintenance + Maintenance Report
22. Reports (multi-tab, CSV export)
23. Meetings + Cloudinary attachments
24. Assets management
25. Notifications (realtime via Supabase Realtime)

### Fase 6 — Polish & Deploy (Minggu 10-12) 🟢 Medium
26. Notes (rich text — gunakan `Tiptap` atau `BlockNote`)
27. Settings, Guide, Project Guide pages
28. Activity Log viewer
29. Print/PDF export
30. Testing + Deploy (Vercel for web, Railway/Fly.io for api)

---

## 5. Potensi Masalah & Mitigasi

### 🔴 Problem 1: Password Re-hashing (CRITICAL)

**Masalah:** Auth saat ini menggunakan SHA-256 di client. Semua `password_hash` di Firestore adalah SHA-256. Supabase/NestJS mengharapkan bcrypt.

**Mitigasi:**
```typescript
// Saat user pertama kali login setelah migrasi:
// 1. Cek apakah hash adalah SHA-256 (64-char hex)
// 2. Jika ya, validate dengan SHA-256, lalu re-hash dengan bcrypt dan update DB
async function validateLegacyPassword(input: string, stored: string): Promise<boolean> {
  const sha256 = createHash('sha256').update(input).digest('hex');
  if (sha256 === stored) {
    // Migrate hash on-the-fly
    await this.prisma.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(input, 10) }});
    return true;
  }
  return bcrypt.compare(input, stored);
}
```

### 🔴 Problem 2: Firestore `members` Array → SQL Join Table

**Masalah:** Di Firestore, `project.members = [{ user_id, project_role }]`. Di Prisma, ini harus `ProjectMember` junction table. Data migration perlu loop dan insert per member.

**Mitigasi:**
```typescript
// migration script
for (const project of firestoreProjects) {
  for (const member of project.members || []) {
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: project.id, userId: member.user_id } },
      create: { projectId: project.id, userId: member.user_id, projectRole: member.project_role || 'DEVELOPER' },
      update: {},
    });
  }
}
```

### 🔴 Problem 3: Sequential ID Format (`PRJ-0001`, `USR-0001`)

**Masalah:** App lama menggunakan `generateSequentialId()` yang men-scan semua records untuk menentukan ID berikutnya. Ini tidak aman jika dijalankan concurrent.

**Mitigasi:** Di NestJS, gunakan auto-increment ID dengan prefix di level aplikasi:
```typescript
// Atau gunakan Supabase sequence
const lastProject = await prisma.project.findFirst({ orderBy: { sequenceNum: 'desc' } });
const nextNum = (lastProject?.sequenceNum ?? 0) + 1;
const id = `PRJ-${String(nextNum).padStart(4, '0')}`;
```

### 🟡 Problem 4: Cloudinary Credentials Exposed

**Masalah:** `cloudinary.js` saat ini upload langsung dari browser dengan unsigned preset. Ini bisa disalahgunakan.

**Mitigasi:** Pindahkan semua upload ke NestJS backend. Frontend hanya mengirim file ke `/api/upload`, NestJS yang upload ke Cloudinary dengan credentials yang aman di ENV.

### 🟡 Problem 5: Real-time Notifications

**Masalah:** App lama polling Firestore atau menggunakan Firestore realtime listeners. Supabase Realtime bisa digunakan, tapi perlu setup channel per user.

**Mitigasi:**
```tsx
// apps/web/hooks/useNotifications.ts
'use client';
import { createClient } from '@/lib/supabase/client';
import { useEffect } from 'react';

export function useNotifications(userId: string) {
  const supabase = createClient();
  useEffect(() => {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        // Update notification badge
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [userId]);
}
```

### 🟡 Problem 6: `logActivity` Coupling

**Masalah:** Di app lama, `logActivity` + notifikasi dibuat inline di setiap module, dari client-side. Ini memperumit migrasi karena tiap module harus diperbaiki.

**Mitigasi:** Di NestJS, gunakan `@OnEvent()` interceptors atau Prisma middleware untuk auto-log activity tanpa coupling ke service:
```typescript
// Prisma middleware
prisma.$use(async (params, next) => {
  const result = await next(params);
  if (['create', 'update', 'delete'].includes(params.action)) {
    await activityLogService.log({ model: params.model, action: params.action, ... });
  }
  return result;
});
```

### 🟡 Problem 7: Kanban Drag-and-Drop

**Masalah:** `board.js` mengimplementasi drag-and-drop dari scratch. Di React, gunakan library yang sudah proven.

**Mitigasi:** Gunakan `@dnd-kit/core` + `@dnd-kit/sortable` yang lightweight dan accessible.

### 🟢 Problem 8: Setup Wizard (First-Run)

**Masalah:** App lama punya setup wizard 3-step untuk create admin pertama. Di app baru, ini perlu ekuivalen.

**Mitigasi:** Buat route `/setup` yang hanya accessible jika tidak ada user di DB. Bisa cek di middleware Next.js.

### 🟢 Problem 9: CSS Migration Volume

**Masalah:** Terdapat ~400KB custom CSS yang sudah sangat mature. Migrasi ke Tailwind tidak bisa 1:1.

**Mitigasi:** Jangan migrasi CSS sekaligus. Tulis page baru dengan Tailwind + shadcn dari awal. Gunakan inspeksi visual dari app lama sebagai referensi desain.

### 🟢 Problem 10: Gantt Chart

**Masalah:** `gantt.js` menggambar Gantt Chart dengan SVG murni (30KB). Ini sangat kompleks untuk direkonstruksi.

**Mitigasi:** Gunakan library seperti `frappe-gantt` atau `react-gantt-chart` sebagai drop-in replacement. Perlu evaluasi apakah styling bisa di-customize.

---

## Verification Plan

### Automated Tests
- Unit tests NestJS services dengan Jest
- Integration tests API endpoints
- Prisma migration dry-run: `prisma migrate dry-run`
- E2E tests key flows: Login, Create Project, Create Task, kanban drag

### Manual Verification
1. Login dengan user yang dimigrasi dari Firestore
2. Data integritas: jumlah records sebelum dan sesudah migration
3. Cloudinary links dari data lama masih accessible (URL tidak berubah)
4. Role-based access control: setiap role hanya bisa akses halaman yang sesuai
5. Notifikasi realtime muncul setelah create task
6. Export CSV backlog menghasilkan file yang benar
7. Mobile responsive di semua halaman

---

> **Estimasi Total:** ~10-12 minggu untuk full migration dengan 1-2 developer.  
> **Rekomendasi:** Jalankan app lama dan baru secara paralel selama Fase 3-5, lakukan cutover bertahap per feature.
