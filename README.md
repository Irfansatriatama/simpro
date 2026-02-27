# SIMPRO — Simple Project Management Office

> **Dokumen Tunggal & Tersentralisasi** — Ini adalah satu-satunya README yang perlu dibaca.  
> Menggabungkan semua informasi dari `README_SIMPRO.md` dan `README_BUG_SIMPRO.md`.  
> Update terakhir: **2026-02-27** | Versi saat ini: **v1.0.2** (Bug Fix Release — BUG-8 SELESAI)

Aplikasi web manajemen proyek tim berbasis browser — task tracking, sprint planning, kanban board, gantt chart, dan laporan progress untuk Project Manager, Developer, Client, dan Manager.

**Offline-first · Pure localStorage · Tanpa server · Tanpa instalasi · PWA Ready · GitHub Pages**

---

## Daftar Isi

1. [Status & Versi](#1-status--versi)
2. [Deskripsi Proyek](#2-deskripsi-proyek)
3. [Target Pengguna & Role](#3-target-pengguna--role)
4. [Cara Menjalankan](#4-cara-menjalankan)
5. [Struktur Folder](#5-struktur-folder)
6. [Arsitektur & Pola Kode](#6-arsitektur--pola-kode)
7. [Design System & UI Guidelines](#7-design-system--ui-guidelines)
8. [localStorage Key Reference](#8-localstorage-key-reference)
9. [Skema Data](#9-skema-data)
10. [Fitur Lengkap](#10-fitur-lengkap)
11. [Panduan untuk Claude Selanjutnya](#11-panduan-untuk-claude-selanjutnya)
12. [Log Pengerjaan — Fase Pembangunan](#12-log-pengerjaan--fase-pembangunan)
13. [Log Pengerjaan — Fase Bug Fix](#13-log-pengerjaan--fase-bug-fix)

---

## 1. Status & Versi

| Info | Detail |
|------|--------|
| **Nama Proyek** | SIMPRO |
| **Kepanjangan** | Simple Project Management Office |
| **Versi App** | v1.0.2 (Bug Fix Release — BUG-8) |
| **Fase Pembangunan Selesai** | FASE 16 — Polish, PWA Penuh & Audit Final ✅ |
| **Fase Bug Fix Saat Ini** | BUG-8 ✅ — Navbar Dropdown, Notifikasi & Dashboard My Tasks (SELESAI) |
| **Fase Bug Fix Berikutnya** | — (Ongoing bug fix, upload zip terbaru jika ada bug baru) |
| **Tech Stack** | HTML5 + CSS3 + JavaScript ES6+ (Vanilla, no framework) |
| **Storage** | `localStorage` 100% — tanpa server, tanpa database |
| **PWA** | Aktif sejak Fase 1 (manifest.json + sw.js) |
| **Deploy** | GitHub Pages (github.io) |

### Ringkasan Status Bug Fix

| Fase | Nama | Status | Tanggal |
|------|------|--------|---------|
| BUG-1 | Foundation: Fix Semua Path & Nav Links | ✅ Selesai | 2026-02-27 |
| BUG-2 | Auth: Login, Register & Logout | ✅ Selesai | 2026-02-27 |
| BUG-3 | Shell & Dashboard | ✅ Selesai | 2026-02-27 |
| BUG-4 | Project & Task | ✅ Selesai | 2026-02-27 |
| BUG-5 | Board & Sprint | ✅ Selesai | 2026-02-27 |
| BUG-6 | Data & Laporan (Gantt, Reports, IO) | ✅ Selesai | 2026-02-27 |
| BUG-7 | User & Setting + README Final | ✅ Selesai | 2026-02-27 |
| BUG-8 | Navbar Dropdown, Notifikasi & Dashboard My Tasks | ✅ Selesai | 2026-02-27 |

---

## 2. Deskripsi Proyek

**SIMPRO** adalah aplikasi web manajemen proyek tim yang berjalan **100% di browser** tanpa server, database, atau koneksi internet setelah diunduh. Seluruh data tersimpan di `localStorage` dan dapat di-export/import sebagai file JSON.

SIMPRO dirancang untuk **Project Manager** yang berinteraksi dengan tiga arah: client (user), tim developer, dan manajemen level atas — dalam satu workspace yang terpadu.

### Prinsip Desain Produk

- **Clean, no-noise** — Tidak ada emoji dekoratif di UI, tidak ada elemen yang tidak berguna
- **Data-dense tapi tetap readable** — Seperti Linear dan Jira, bukan seperti app konsumer
- **Role-aware** — Setiap role melihat tampilan yang relevan untuknya
- **Fast** — Semua operasi instan karena localStorage, tidak ada loading spinner yang tidak perlu

---

## 3. Target Pengguna & Role

### Konteks Penggunaan

SIMPRO dibangun untuk **Project Manager** yang:
- Berinteraksi dengan **client** untuk requirement, approval, dan feedback progress
- Mengkoordinasikan **tim developer** untuk pengerjaan task sehari-hari
- Melapor ke **kepala divisi / manajemen** dengan data progress yang akurat

### Role System

| Role | Deskripsi | Permission |
|------|-----------|------------|
| **Admin** | System administrator | Full access — kelola semua user, project, settings |
| **Project Manager** | Pengelola proyek | Buat/kelola project, assign task, akses semua laporan |
| **Developer** | Anggota tim teknis | Lihat & update task yang diassign, comment, time log |
| **Viewer** | Client / stakeholder | Read-only — pantau progress, lihat board & laporan |

---

## 4. Cara Menjalankan

### ⚠️ Catatan Penting — Path Relatif

Sejak Bug Fix BUG-1, semua path aset menggunakan **relative path** (bukan absolute). Aplikasi dapat dibuka langsung via `file://` **maupun** via web server (Live Server, GitHub Pages).

### Lokal (via file browser)

```
1. Ekstrak zip ke folder manapun
2. Double klik pages/login.html  ← mulai dari sini (bukan index.html)
3. Login dengan akun default (lihat seed data di bawah)
4. Tidak perlu npm, pip, server, atau koneksi internet
```

> `index.html` di root berfungsi sebagai redirect — akan redirect ke login atau dashboard sesuai session.

### GitHub Pages (untuk PWA penuh)

```
1. Push folder ke repo GitHub (misal: username/simpro)
2. Aktifkan GitHub Pages: Settings → Pages → Deploy from branch → main → / (root)
3. Akses via https://username.github.io/simpro/
4. Browser akan menampilkan prompt install PWA
```

### Default Accounts (seed data)

```
Admin     : admin / admin123
PM        : pm / pm123
Developer : dev / dev123
Viewer    : viewer / viewer123
```

---

## 5. Struktur Folder

```
simpro/
├── index.html                          ← Entry point — cek session, redirect
├── 404.html                            ← Halaman not found
├── manifest.json                       ← PWA manifest
├── sw.js                               ← Service Worker
├── README.md                           ← Dokumentasi ini (satu-satunya README)
│
├── assets/
│   ├── css/
│   │   ├── tokens.css                  ← Design tokens (warna, spacing, tipografi)
│   │   ├── reset.css                   ← CSS reset
│   │   ├── layout.css                  ← Shell: sidebar, topbar, main area
│   │   ├── components.css              ← Button, Input, Modal, Dropdown, Badge, Toast, Avatar
│   │   ├── dashboard.css               ← Widget dashboard
│   │   ├── projects.css                ← Halaman projects & project detail
│   │   ├── task.css                    ← Task detail, time tracker, comment thread
│   │   ├── kanban.css                  ← Kanban board & task card
│   │   ├── sprint.css                  ← Sprint & backlog view
│   │   ├── gantt.css                   ← Gantt chart & timeline
│   │   ├── reports.css                 ← Laporan & chart
│   │   ├── members.css                 ← Halaman members & admin panel
│   │   ├── profile.css                 ← Halaman profile & settings
│   │   ├── io.css                      ← Halaman import/export
│   │   ├── polish.css                  ← Skeleton, empty states, PWA banners, WCAG
│   │   └── print.css                   ← Style khusus print
│   │
│   ├── js/
│   │   ├── core/
│   │   │   ├── app.js                  ← Init, event bus, theme toggle, error boundary, PWA
│   │   │   ├── auth.js                 ← Login, logout, session, role guard
│   │   │   ├── storage.js              ← Wrapper localStorage CRUD + query + seed
│   │   │   ├── router.js               ← Hash-based router
│   │   │   ├── shell.js                ← Builder sidebar + topbar (semua halaman authenticated)
│   │   │   └── utils.js                ← Helper functions
│   │   │
│   │   ├── modules/
│   │   │   ├── project.js
│   │   │   ├── task.js
│   │   │   ├── task-modal.js           ← Modal global buat task baru
│   │   │   ├── sprint.js
│   │   │   ├── kanban.js
│   │   │   ├── comment.js
│   │   │   ├── label.js
│   │   │   ├── milestone.js
│   │   │   ├── timelog.js
│   │   │   ├── notification.js
│   │   │   ├── report.js
│   │   │   ├── gantt.js
│   │   │   └── io.js
│   │   │
│   │   └── pages/
│   │       ├── login.js
│   │       ├── dashboard.js
│   │       ├── projects.js
│   │       ├── project-detail.js
│   │       ├── board.js
│   │       ├── backlog.js
│   │       ├── sprint.js
│   │       ├── task-detail.js
│   │       ├── gantt.js
│   │       ├── reports.js
│   │       ├── members.js
│   │       ├── settings.js
│   │       ├── profile.js
│   │       └── io.js
│   │
│   └── icons/
│       ├── icon-192.png
│       └── icon-512.png
│
└── pages/
    ├── login.html
    ├── register.html
    ├── dashboard.html
    ├── projects.html
    ├── project-detail.html
    ├── board.html
    ├── backlog.html
    ├── sprint.html
    ├── task-detail.html
    ├── gantt.html
    ├── reports.html
    ├── members.html
    ├── settings.html
    ├── profile.html
    └── io.html                         ← Import/Export hub
```

---

## 6. Arsitektur & Pola Kode

### Prinsip Absolut

```
Bahasa     : HTML5, CSS3, JavaScript ES6+ (Vanilla)
Framework  : TIDAK ADA — no React, Vue, Angular, jQuery
Build tool : TIDAK ADA — no webpack, vite, npm, bundler
Storage    : localStorage — 100% client-side
Server     : TIDAK ADA — buka file HTML langsung di browser
PWA        : Service Worker + manifest.json
Target     : Chrome, Firefox, Edge, Safari (modern)
Mobile     : Responsive, touch-friendly
Path aset  : Relative — bukan absolute (fix sejak BUG-1)
```

### Urutan Init Halaman (WAJIB diikuti)

```javascript
// ⚠️ Urutan ini KRITIS. Jangan diubah.
Auth.requireAuth();
Shell.applyTo('page-id', 'Judul Halaman');
App.init('page-id').then(() => {
  Page.init();           // inject semua HTML ke DOM terlebih dahulu
  lucide.createIcons();  // baru scan icon — setelah DOM siap
});
```

### Routing (hash-based)

```javascript
// Contoh URL:
// index.html#dashboard
// pages/board.html?project=proj_001
// pages/task-detail.html?id=task_042

// Navigasi antar halaman menggunakan relative path + query string
// Bukan hash-router lintas halaman untuk kompatibilitas file://
```

### Pola Modul JS

```javascript
// Setiap modul: IIFE yang return public API
// Tidak ada ES import/export — agar bisa dibuka langsung di browser

const ProjectModule = (() => {
  function _validate(data) { ... }   // private (prefix _)
  function create(data) { ... }      // public
  function getAll() { ... }
  function getById(id) { ... }
  function update(id, data) { ... }
  function remove(id) { ... }
  return { create, getAll, getById, update, remove };
})();
```

### Storage Wrapper

```javascript
// WAJIB: Semua akses data hanya melalui storage.js
// Dilarang akses localStorage langsung di modul lain

const Storage = (() => {
  function get(key) { ... }
  function set(key, value) { ... }
  function update(key, fn) { ... }    // fn(oldValue) → newValue
  function remove(key) { ... }
  function query(key, filterFn) { ... }  // filter array di storage
  return { get, set, update, remove, query };
})();
```

### Event Bus

```javascript
// app.js menyediakan event bus untuk komunikasi antar modul
App.events.on('task:updated', (task) => { ... });
App.events.emit('task:updated', updatedTask);
App.events.off('task:updated', handler);
```

---

## 7. Design System & UI Guidelines

### Filosofi Visual

SIMPRO mengacu pada estetika **productivity tool profesional** seperti Linear, Jira, dan Plane.

- **Dense tapi bernafas** — banyak informasi tapi tidak sesak
- **Monochromatic base + satu warna aksen** — tidak berwarna-warni
- **Tipografi sebagai hierarki** — ukuran, weight, warna teks menunjukkan prioritas
- **Interaksi halus** — hover state, transisi 150–200ms
- **Zero emoji di UI** — semua ikon menggunakan Lucide Icons (SVG)

### Design Tokens (tokens.css)

```css
:root {
  /* Warna Utama */
  --color-bg:           #F7F8FA;
  --color-surface:      #FFFFFF;
  --color-surface-2:    #F0F1F3;
  --color-border:       #E2E4E9;
  --color-border-strong:#C8CBD3;

  /* Teks */
  --color-text:         #1A1D23;
  --color-text-2:       #5C6070;
  --color-text-3:       #9BA0AD;

  /* Aksen */
  --color-accent:       #3B5BDB;
  --color-accent-hover: #3451C7;
  --color-accent-light: #EEF2FF;

  /* Status */
  --color-success:      #2F9E44;   --color-success-bg: #EBFBEE;
  --color-warning:      #E67700;   --color-warning-bg: #FFF9DB;
  --color-danger:       #C92A2A;   --color-danger-bg:  #FFF5F5;
  --color-info:         #1971C2;   --color-info-bg:    #E7F5FF;

  /* Priority */
  --color-critical:     #C92A2A;
  --color-high:         #E67700;
  --color-medium:       #3B5BDB;
  --color-low:          #5C6070;

  /* Task Type */
  --color-story:        #3B5BDB;
  --color-bug:          #C92A2A;
  --color-task:         #2F9E44;
  --color-epic:         #7048E8;

  /* Spacing */
  --sp-1: 4px;   --sp-2: 8px;   --sp-3: 12px;  --sp-4: 16px;
  --sp-5: 20px;  --sp-6: 24px;  --sp-8: 32px;  --sp-10: 40px;

  /* Tipografi */
  --font-sans: 'DM Sans', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  --text-xs:   11px;  --text-sm: 13px;  --text-base: 14px;
  --text-md:   15px;  --text-lg: 17px;  --text-xl:   20px;
  --text-2xl:  24px;  --text-3xl: 30px;

  /* Layout */
  --sidebar-width:  240px;
  --topbar-height:  52px;

  /* Border Radius */
  --radius-sm: 4px;  --radius-md: 6px;  --radius-lg: 8px;
  --radius-xl: 12px; --radius-full: 9999px;

  /* Shadow */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 2px 8px rgba(0,0,0,0.08);
  --shadow-lg: 0 4px 16px rgba(0,0,0,0.10);
  --shadow-xl: 0 8px 32px rgba(0,0,0,0.12);

  /* Transisi */
  --transition:      150ms ease;
  --transition-slow: 250ms ease;
}

[data-theme="dark"] {
  --color-bg:           #0F1117;
  --color-surface:      #161B22;
  --color-surface-2:    #1C2330;
  --color-border:       #2D333B;
  --color-border-strong:#3D444D;
  --color-text:         #E6EDF3;
  --color-text-2:       #8B949E;
  --color-text-3:       #484F58;
  --color-accent:       #4C6EF5;
  --color-accent-hover: #5C7EFF;
  --color-accent-light: #1A2040;
}
```

### Komponen Standar

```
Button   : variant (primary / secondary / ghost / danger) + size (sm / md / lg)
Badge    : status task, priority, role — teks pendek + warna background
Input    : text, textarea, select, date — border, focus ring, error state
Modal    : overlay gelap semi-transparan, panel slide-up, close via Esc atau klik overlay
Dropdown : posisi absolut, z-index tinggi, close saat klik luar atau Esc
Toast    : pojok kanan bawah, auto-dismiss 3 detik, variant success/error/info
Avatar   : inisial 1–2 huruf nama, warna deterministic berdasarkan userId
```

### Ikon & Font

```
Library : Lucide Icons via CDN — https://unpkg.com/lucide@latest/dist/umd/lucide.min.js
Ukuran  : 14px (inline), 16px (default), 20px (button icon), 24px (header)
Warna   : inherit dari parent

Font    : DM Sans + JetBrains Mono via Google Fonts
URL     : https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600&family=JetBrains+Mono:wght@400;500&display=swap
```

---

## 8. localStorage Key Reference

| Key | Tipe | Deskripsi |
|-----|------|-----------|
| `sp_users` | Array | Semua user |
| `sp_session` | Object | Session aktif (userId, role, loginAt) |
| `sp_projects` | Array | Semua project |
| `sp_tasks` | Array | Semua task (semua project) |
| `sp_sprints` | Array | Semua sprint |
| `sp_comments` | Array | Semua komentar & activity log |
| `sp_timelogs` | Array | Semua time log |
| `sp_labels` | Array | Semua label |
| `sp_milestones` | Array | Semua milestone |
| `sp_notifications` | Array | Semua notifikasi |
| `sp_settings` | Object | Setting global app |
| `sp_theme` | String | `"light"` atau `"dark"` |
| `sp_font_size` | String | `"normal"` atau `"large"` |
| `sp_seeded` | Boolean | Tanda seed data sudah dijalankan |
| `sp_pwa_dismissed` | Boolean | Tanda PWA install banner sudah di-dismiss |
| `sp_user_{id}_prefs` | Object | Preferensi per user |

**Aturan:** Selalu gunakan prefix `sp_` untuk semua key. Akses hanya melalui `storage.js`.

---

## 9. Skema Data

### User
```javascript
{
  id: "user_001",
  name: "Budi Santoso",
  email: "budi@example.com",
  password: "sha256_hash",
  role: "pm",                     // admin | pm | developer | viewer
  avatar: null,                   // null = tampilkan inisial; string = base64 JPEG
  bio: "",
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  lastLoginAt: "2026-02-27T08:00:00.000Z"
}
```

### Project
```javascript
{
  id: "proj_001",
  name: "Website Redesign",
  description: "Redesign halaman utama dan dashboard client",
  key: "WR",                      // Prefix task: WR-1, WR-2, dst (2–5 huruf kapital)
  status: "active",               // active | on-hold | completed | archived
  priority: "high",
  color: "#3B5BDB",
  ownerId: "user_001",
  memberIds: ["user_001", "user_002"],
  memberRoles: { "user_003": "viewer" },
  startDate: "2026-01-01",
  endDate: "2026-06-30",
  taskCounter: 12,                // Auto-increment untuk task key
  createdAt: "...",
  updatedAt: "..."
}
```

### Task
```javascript
{
  id: "task_001",
  projectId: "proj_001",
  sprintId: "sprint_001",         // null = di backlog
  parentId: null,                 // null = bukan subtask
  key: "WR-1",
  title: "Buat halaman login baru",
  description: "",
  type: "story",                  // story | bug | task | epic
  status: "todo",                 // todo | in-progress | review | done
  priority: "high",               // critical | high | medium | low
  assigneeIds: ["user_002"],
  reporterId: "user_001",
  labelIds: ["label_001"],
  milestoneId: null,
  storyPoints: 3,
  estimatedHours: 8,
  loggedHours: 0,
  dueDate: "2026-02-15",
  order: 0,
  attachments: [],
  createdAt: "...",
  updatedAt: "..."
}
```

### Sprint
```javascript
{
  id: "sprint_001",
  projectId: "proj_001",
  name: "Sprint 1",
  goal: "Selesaikan semua halaman auth",
  status: "active",               // planned | active | completed
  startDate: "2026-01-06",
  endDate: "2026-01-19",
  completedAt: null,
  velocity: 0,
  createdAt: "..."
}
```

### Comment / Activity
```javascript
{
  id: "comment_001",
  taskId: "task_001",
  authorId: "user_001",
  content: "Sudah dicek, perlu revisi form validation",
  type: "comment",                // comment | activity
  activityData: null,             // diisi jika type = "activity"
  createdAt: "...",
  updatedAt: "...",
  isEdited: false
}

// Contoh activity log
{
  id: "comment_002",
  taskId: "task_001",
  authorId: "user_002",
  content: "",
  type: "activity",
  activityData: {
    action: "status_changed",     // status_changed | assigned | priority_changed | dll
    from: "todo",
    to: "in-progress"
  },
  createdAt: "..."
}
```

### Time Log
```javascript
{
  id: "tl_001",
  taskId: "task_001",
  userId: "user_002",
  hours: 2.5,
  description: "Implementasi form validation",
  date: "2026-02-10",
  createdAt: "..."
}
```

### Notification
```javascript
{
  id: "notif_001",
  userId: "user_002",
  type: "task_assigned",          // task_assigned | task_commented | due_soon | sprint_started | sprint_completed
  title: "Task baru diassign",
  message: "WR-5 diassign ke kamu oleh Budi",
  referenceType: "task",          // task | sprint | project
  referenceId: "task_001",
  isRead: false,
  createdAt: "..."
}
```

### Label
```javascript
{
  id: "label_001",
  projectId: "proj_001",
  name: "Frontend",
  color: "#3B5BDB"
}
```

### Milestone
```javascript
{
  id: "ms_001",
  projectId: "proj_001",
  name: "MVP Launch",
  description: "Semua fitur core selesai dan sudah di-test",
  dueDate: "2026-03-31",
  status: "on-track",             // on-track | at-risk | missed | completed
  createdAt: "..."
}
```

---

## 10. Fitur Lengkap

### Auth & Session
- Login / logout, session persisten di localStorage
- Register akun baru (self-service)
- Role-based access control per halaman dan per action
- Redirect otomatis jika belum login

### Project Management
- CRUD project: buat, edit, arsipkan, hapus (dengan cascade delete)
- Project key unik sebagai prefix task ID (WR-1, BE-5, dll)
- Undang member, atur role per-member dalam project
- Project overview: ringkasan task, sprint aktif, milestone

### Task Management
- Task type: Story, Bug, Task, Epic — dengan subtask (satu level)
- Field lengkap: title, deskripsi, type, status, priority, assignee, label, milestone, story points, estimasi jam, due date
- Activity log otomatis setiap perubahan field penting
- Inline edit title dan deskripsi (autosave)

### Kanban Board
- 4 kolom: To Do / In Progress / In Review / Done
- Drag & drop native (mouse + touch via Pointer Events)
- Filter: assignee, label, priority, type
- Swimlane view (Group by Assignee)
- Quick-add task dari footer kolom

### Sprint & Backlog
- Product backlog, buat sprint dengan nama/goal/tanggal
- Drag task dari backlog ke sprint
- Start sprint (validasi: 1 aktif per project)
- Complete sprint + penanganan task belum done
- Sprint summary otomatis dengan velocity

### Sprint Active View
- Header: nama, goal, tanggal, progress bar, sisa hari
- Mini burndown chart (SVG native)
- 3 tab: Board View / List View / Stats

### Gantt Chart
- Timeline task per project (SVG native)
- Zoom: Week / Month / Quarter
- Milestone sebagai diamond marker
- Today marker (garis merah), scroll horizontal

### Laporan & Statistik
- Burndown chart, Velocity chart, Task distribution (Canvas API native)
- Time tracking summary per task dan per member
- Layout siap cetak via browser print

### Time Tracking
- Log waktu manual: jam (desimal) + deskripsi + tanggal
- Progress bar logged vs estimated di task detail
- Summary waktu per member di laporan

### Notifikasi In-App
- Trigger: task diassign, komentar, due date dekat 2 hari, sprint dimulai/selesai
- Badge counter di topbar, panel dropdown, mark as read, clear all

### Import / Export
- Export/Import SIMPRO JSON (Replace atau Merge)
- Import Trello JSON (wizard 3 langkah)
- Import Jira CSV (field mapping otomatis)
- Export task ke CSV

### Member Management
- Tabel semua user (Admin), filter by role & status, search
- Tambah, edit, toggle aktif/nonaktif user
- Modal detail user: project list, task count, jam log

### Profile & Settings
- Edit profil, upload avatar (Canvas resize 128×128), ganti password
- Toggle light/dark theme, ukuran font Normal/Large
- CRUD label per project, konfigurasi project
- Danger zone: reset data (Admin only)

### PWA & Offline
- Service Worker cache semua shell files
- Offline banner real-time
- PWA install prompt (dismissable)
- Manifest dengan shortcuts: Dashboard, Board, Backlog

---

## 11. Panduan untuk Claude Selanjutnya

### Status Final

```
✅ 7 fase pembangunan + 8 fase bug fix selesai.
Versi saat ini: v1.0.2

Ini adalah endless bug fix mode — upload zip terbaru + README ke Claude
jika ada bug baru, dan minta perbaikan fase berikutnya (BUG-9, dst).
```

### Cara Melanjutkan (bug baru)

```
Upload ke Claude:
- README.md ← file ini
- simpro_bugfix_fase8.zip ← versi stabil terakhir

Lalu tulis: "Ada bug di [halaman X], tolong perbaiki sebagai BUG-9"
```

### Prinsip Wajib

1. **Baca README ini dulu** — sumber kebenaran tunggal
2. **Jangan buat ulang logika bisnis** — hanya fix bug dan path
3. **Ikuti urutan init**: `Auth.requireAuth()` → `Shell.applyTo()` → `App.init().then()` → `Page.init()` → `lucide.createIcons()`
4. **Path aset relative**: file di `pages/X.html` butuh `../assets/` untuk akses aset
5. **Prefix `sp_`** untuk semua localStorage key
6. **Akses localStorage hanya via storage.js**
7. **Update README ini** setiap akhir fase
8. **Output zip**: `simpro_bugfix_fase[N].zip` berisi seluruh folder `simpro/`

### Yang Tidak Boleh

```
DILARANG : React, Vue, Angular, Svelte, jQuery, atau framework JS apapun
DILARANG : npm, webpack, vite, parcel, atau build tool apapun
DILARANG : fetch() ke API eksternal (CDN font/icon diperbolehkan)
DILARANG : Emoji sebagai elemen UI fungsional — gunakan Lucide Icons
DILARANG : Akses localStorage langsung di luar storage.js
DILARANG : Chart library eksternal (Chart.js, D3) — gunakan Canvas/SVG native
DILARANG : Drag & drop library (SortableJS) — gunakan pointer events native
DILARANG : Path absolut (/assets/...) — gunakan relative path (../assets/...)
DILARANG : Meninggalkan fase setengah jadi
```

---

## 12. Log Pengerjaan — Fase Pembangunan

### Ringkasan

| Versi | Fase | Tanggal | Status | Highlight |
|-------|------|---------|--------|-----------|
| 0.1.0 | FASE 1 | 2026-02-27 | ✅ | Core Infrastructure & Design System |
| 0.2.0 | FASE 2 | 2026-02-27 | ✅ | Auth: Login, Register & Session |
| 0.3.0 | FASE 3 | 2026-02-27 | ✅ | Dashboard Utama |
| 0.4.0 | FASE 4 | 2026-02-27 | ✅ | Project Management |
| 0.5.0 | FASE 5 | 2026-02-27 | ✅ | Task Management: CRUD & Task Detail |
| 0.6.0 | FASE 6 | 2026-02-27 | ✅ | Kanban Board |
| 0.7.0 | FASE 7 | 2026-02-27 | ✅ | Sprint Planning & Backlog |
| 0.8.0 | FASE 8 | 2026-02-27 | ✅ | Sprint Active View |
| 0.9.0 | FASE 9 | 2026-02-27 | ✅ | Gantt Chart & Milestone |
| 0.10.0 | FASE 10 | 2026-02-27 | ✅ | Time Tracking |
| 0.11.0 | FASE 11 | 2026-02-27 | ✅ | Notifikasi In-App |
| 0.12.0 | FASE 12 | 2026-02-27 | ✅ | Laporan & Statistik |
| 0.13.0 | FASE 13 | 2026-02-27 | ✅ | Import / Export |
| 0.14.0 | FASE 14 | 2026-02-27 | ✅ | Member Management & Admin Panel |
| 0.15.0 | FASE 15 | 2026-02-27 | ✅ | Profile & Settings |
| 1.0.0 | FASE 16 | 2026-02-27 | ✅ | Polish, PWA Penuh & Audit Final |

---

### FASE 1 — Core Infrastructure & Design System
**v0.1.0** | 2026-02-27 | ✅

**File Ditambahkan:** `index.html`, `404.html`, `manifest.json`, `sw.js`, `assets/css/tokens.css`, `reset.css`, `layout.css`, `components.css`, `assets/js/core/utils.js`, `storage.js`, `app.js`, `auth.js`, `router.js`, semua modul dan halaman sebagai placeholder.

**Catatan:** Pola IIFE untuk semua modul JS (no ES modules). Seed data auto-populate via `sp_seeded`. hashPassword pakai SubtleCrypto. Design token mendukung dark mode via `[data-theme="dark"]`.

---

### FASE 2 — Auth: Login, Register & Session
**v0.2.0** | 2026-02-27 | ✅

**File Ditambahkan:** `assets/js/core/shell.js` (builder sidebar+topbar untuk semua halaman authenticated).

**File Diubah:** `pages/login.html` (redesign 2 kolom), `pages/register.html`, 12 halaman authenticated (Shell.applyTo terintegrasi), `components.css`.

**Catatan:** Shell.js menggunakan IIFE. Nav menggunakan tag `<a>` untuk aksesibilitas. Password strength 5 level.

---

### FASE 3 — Dashboard Utama
**v0.3.0** | 2026-02-27 | ✅

**File Ditambahkan:** `assets/css/dashboard.css`, `assets/js/pages/dashboard.js`.

**Fitur:** 4 widget (My Tasks/Active Projects/Recent Activity/Sprint Overview), stat bar, greeting dinamis, role-aware, welcome state, responsive 2→1 kolom.

---

### FASE 4 — Project Management
**v0.4.0** | 2026-02-27 | ✅

**File Ditambahkan:** `assets/css/projects.css`, `assets/js/modules/project.js`, `pages/projects.js`, `pages/project-detail.js`.

**Fitur:** CRUD project penuh, cascade delete, auto-generate key, color picker, 3 tab detail (Overview/Members/Settings), role guard.

---

### FASE 5 — Task Management: CRUD & Task Detail
**v0.5.0** | 2026-02-27 | ✅

**File Ditambahkan:** `assets/css/task.css`, `task.js`, `comment.js`, `label.js`, `task-modal.js`, `pages/task-detail.js`.

**Fitur:** Layout 2 kolom, inline edit, subtask dengan progress bar, activity thread, auto-log aktivitas, TaskModal global, role guard penuh.

---

### FASE 6 — Kanban Board
**v0.6.0** | 2026-02-27 | ✅

**File Ditambahkan:** `assets/css/kanban.css`, `modules/kanban.js`, `pages/board.js`.

**Fitur:** 4 kolom, drag & drop via Pointer Events + `setPointerCapture`, ghost card semi-transparan, drop indicator garis biru, swimlane view, quick-add, filter multi-select. Activity log otomatis via `Comment.addActivity()`.

---

### FASE 7 — Sprint Planning & Backlog
**v0.7.0** | 2026-02-27 | ✅

**File Ditambahkan:** `assets/css/sprint.css`, `modules/sprint.js`, `pages/backlog.js`, `pages/backlog.html`.

**Fitur:** Collapsible sprint/backlog panel, drag task antar section (handle-based), Start/Complete Sprint modal, carry-over undone tasks, velocity tracking. `Sprint.complete()` atomik.

---

### FASE 8 — Sprint Active View
**v0.8.0** | 2026-02-27 | ✅

**File Ditambahkan:** `pages/sprint.js` (logic full), style di `sprint.css`.

**Fitur:** Header sprint dengan mini burndown SVG (planned vs actual), 3 tab (Board/List/Stats), breakdown per assignee, state completed & no-sprint. Burndown snapshot hari ini (tidak historical per hari).

---

### FASE 9 — Gantt Chart & Milestone
**v0.9.0** | 2026-02-27 | ✅

**File Ditambahkan:** `assets/css/gantt.css`, `modules/gantt.js`, `modules/milestone.js`, `pages/gantt.js`.

**Fitur:** SVG murni (tanpa library), dual-header adaptif per zoom, bar status, diamond milestone, today marker merah, sync scroll vertikal L/R via flag `_syncScrolling`. `Milestone.checkStatus()` auto-update missed.

---

### FASE 10 — Time Tracking
**v0.10.0** | 2026-02-27 | ✅

**File Diubah:** `modules/timelog.js` (implementasi penuh), `pages/task-detail.js` (time tracker section), `pages/project-detail.js` (widget summary).

**Fitur:** Progress bar logged/estimated (merah jika over), form log time, daftar log dengan hapus, widget summary per member di project-detail. `TimeLog.add/remove()` atomik update `loggedHours` di task.

---

### FASE 11 — Notifikasi In-App
**v0.11.0** | 2026-02-27 | ✅

**File Diubah:** `modules/notification.js` (implementasi penuh), `pages/task-detail.js` (trigger notif), `modules/sprint.js` (trigger sprint events), `auth.js` (`checkDueSoon` setelah login).

**Fitur:** `checkDueSoon()` cek sekali per hari. Notify assignee + commenters saat komentar. Notify semua member saat sprint start/complete. Tombol "Hapus semua" di shell dropdown.

---

### FASE 12 — Laporan & Statistik
**v0.12.0** | 2026-02-27 | ✅

**File Diubah:** `modules/report.js`, `pages/reports.js`, `assets/css/reports.css`, `assets/css/print.css`.

**Fitur:** 5 chart Canvas native (burndown, velocity, donut status, assignee bar, priority bar), devicePixelRatio support, theme change → redraw via MutationObserver, window resize → debounce redraw, print.css untuk A4.

---

### FASE 13 — Import / Export
**v0.13.0** | 2026-02-27 | ✅

**File Ditambahkan:** `modules/io.js`, `pages/io.js`, `assets/css/io.css`.

**Fitur:** Export JSON (all data), Import JSON (Replace/Merge), Import Trello JSON (wizard 3 langkah, auto-guess status mapping), Import Jira CSV (auto-detect 7 field, editable mapping), Export Task CSV (BOM untuk Excel). CSV parser custom tanpa library.

---

### FASE 14 — Member Management & Admin Panel
**v0.14.0** | 2026-02-27 | ✅

**File Ditambahkan:** `assets/css/members.css`.

**Fitur:** Tabel user, filter, search, modal add/edit/detail, toggle aktif/nonaktif. Role: Admin full, PM lihat member project sendiri, Developer/Viewer read-only. User tidak bisa nonaktifkan dirinya sendiri.

---

### FASE 15 — Profile & Settings
**v0.15.0** | 2026-02-27 | ✅

**File Ditambahkan:** `assets/css/profile.css`.

**Fitur:** Avatar upload → Canvas crop center-square → base64 JPEG 0.85. Password strength 4 level. Font size via `sp_font_size` → CSS custom property. Project cascade delete (tasks/sprints/timelogs/comments/milestones/labels). Label inline edit (tanpa modal). Danger Zone Admin only via `Storage.clearAll() + Storage.seed()`.

---

### FASE 16 — Polish, PWA Penuh & Audit Final
**v1.0.0** | 2026-02-27 | ✅

**File Ditambahkan:** `assets/css/polish.css` (skeleton, empty states, offline banner, PWA install banner, WCAG AA improvements).

**Fitur:** sw.js cache semua files + stale-while-revalidate CDN, global error boundary (Toast error), BeforeInstallPrompt handler, focus trap modal, skip-to-main, aria-* attributes, animasi CSS transform/opacity only.

**Audit:** ✅ PWA offline · ✅ Empty states · ✅ Skeleton screens · ✅ Responsive 375px/768px · ✅ Keyboard UX · ✅ Error handling · ✅ WCAG AA · ✅ Cross-browser

---

## 13. Log Pengerjaan — Fase Bug Fix

### Root Cause Utama

Seluruh halaman di `pages/` menggunakan **absolute path** (`/assets/css/...`) yang hanya berfungsi via web server. Saat dibuka via `file://`, path resolve ke root drive dan semua CSS/JS silent fail — tampilan 100% rusak, semua fitur mati.

**Solusi:** Path diubah ke relative sesuai posisi file: `pages/*.html` → `../assets/...`

---

### BUG-1 — Foundation: Fix Semua Path & Nav Links
**2026-02-27** | ✅

**Scope:** Perubahan murni path dan href — tidak ada logika bisnis.

**Yang Diperbaiki:**
- Semua `pages/*.html` (15 file): `href="/assets/css/..."` → `href="../assets/css/..."`, `src="/assets/js/..."` → `src="../assets/js/..."`
- `assets/js/core/shell.js`: array `NAV_ITEMS` href dari `/pages/...` → `./namahalaman.html`
- `assets/js/core/auth.js` dan semua JS pages: semua path redirect dari absolute ke relative
- `sw.js`: cek konsistensi cache list

---

### BUG-2 — Auth: Login, Register & Logout
**2026-02-27** | ✅

**Yang Diperbaiki:**
- Fix link navigasi login ↔ register (href relative)
- Fix redirect `file://` aman di `auth.js` (tidak menggunakan absolute path saat redirect)
- Fix `login.js`: `window.location.href` ke relative path saat redirect ke dashboard

---

### BUG-3 — Shell & Dashboard
**2026-02-27** | ✅

**Yang Diperbaiki:**
- Fix urutan init `dashboard.js`: `Page.init()` dipanggil sebelum `lucide.createIcons()`
- Fix path manifest di semua `pages/*.html`
- Fix `sw.js` register path di `app.js` (path relative untuk `navigator.serviceWorker.register`)

---

### BUG-4 — Project & Task
**2026-02-27** | ✅

**Yang Diperbaiki:**
- Fix init order `projects.html` dan `project-detail.html`: `App.init().then()`
- Fix breadcrumb absolute path di `project-detail.html`
- Fix urutan `Page.init()` sebelum `lucide` di `task-detail.html`

---

### BUG-5 — Board & Sprint
**2026-02-27** | ✅

**Yang Diperbaiki:**
- Fix `getAvatarColor` destructuring di board/backlog/sprint (undefined crash)
- Fix init order `lucide` di `board.html`, `backlog.html`, `sprint.html`
- Guard semua `lucide.createIcons()` call: `if (window.lucide) lucide.createIcons()`

---

### BUG-6 — Data & Laporan
**2026-02-27** | ✅

**Yang Diperbaiki:**
- Fix init order (`Page.init` sebelum `lucide`) di `gantt.html`, `reports.html`, `io.html`
- Fix `STATUS_COLORS` keys di `gantt.js` module — key `in-progress` dan `review` tidak cocok dengan enum status task, diubah ke yang sesuai
- Tambah `roundRect` polyfill di `reports.js` untuk kompatibilitas browser lama
- Guard semua `lucide.createIcons()` di `io.js`

---

### BUG-7 — User & Setting + README Final
**2026-02-27** | ✅

**Yang Diperbaiki:**

**`pages/members.html` — urutan init salah:**
- Sebelum: `lucide.createIcons()` dipanggil SEBELUM `MembersPage.init()` → icon tidak ter-render di konten yang diinject
- Sesudah: `MembersPage.init()` dipanggil dulu (inject HTML), baru `lucide.createIcons()`

**`assets/js/pages/members.js` — `App.toast` (lowercase) tidak ada:**
- `App.toast(msg, 'error')` → `App.Toast.error(msg)` (11 call)
- `App.toast(msg, 'success')` → `App.Toast.success(msg)`
- `App.toast(msg, 'warning')` → `App.Toast.warning(msg)`
- Root cause: `App` hanya mengekspos `App.Toast` (kapital T), tidak ada `App.toast`

**`pages/profile.html` — urutan init salah:**
- Sebelum: `lucide.createIcons()` sebelum `Page.init()` → icon tidak muncul di form yang diinject
- Sesudah: `Page.init()` dulu, baru `lucide.createIcons()`

**`pages/settings.html` — dua bug:**
1. Urutan init salah: `lucide → font-size → Page.init()` → icon tidak muncul di panel settings
   - Diperbaiki ke: `Page.init() → font-size → lucide.createIcons()`
2. Font size tidak pernah diapply: `localStorage.getItem('sp_font_size')` return `'"large"'` (dengan quotes karena `Storage.set` menyimpan via `JSON.stringify`)
   - Diperbaiki ke: `JSON.parse(localStorage.getItem('sp_font_size'))` dalam try-catch → return `'large'` (tanpa quotes) → kondisi `=== 'large'` benar

**README final:**
- Status versi diupdate ke `v1.0.1` (SELESAI)
- Tabel bug fix semua ✅
- Scope BUG-7 dihapus, diganti dengan info "semua fase selesai"

---

### BUG-8 — Navbar Dropdown, Notifikasi & Dashboard My Tasks
**2026-02-27** | ✅

**Root Cause Utama: `.hidden` class tidak pernah didefinisikan di CSS**

Seluruh JS codebase menggunakan `classList.add('hidden')` / `classList.remove('hidden')` untuk toggle visibility dropdown (avatar menu, notification panel) dan badge counter. Namun class `.hidden { display: none }` **tidak ada di satu pun file CSS**. Akibatnya:
- Dropdown avatar menu selalu terlihat (tidak bisa disembunyikan)
- Dropdown notification selalu terlihat
- Badge notif counter "0" selalu tampil meski tidak ada notif

**Fix 1 — `assets/css/components.css`:**
- Tambah `.hidden { display: none !important; }` di bagian atas file

**Fix 2 — `assets/js/pages/dashboard.js` — `getAvatarColor` misuse:**
- `Utils.getAvatarColor(id)` mengembalikan array `[fg, bg]` (bukan object)
- Dua tempat di `_renderActiveProjects` dan `_renderRecentActivity` mengakses `c.bg` / `c.text` yang `undefined`
- Diperbaiki: `c.bg` → `c[1]`, `c.text` → `c[0]` (atau destructuring `[cText, cBg]`)

**Fix 3 — `assets/js/pages/dashboard.js` — isolasi render per widget:**
- Sebelum: semua 5 render function dalam satu try-catch — jika satu crash, semua widget stuck di skeleton
- Sesudah: tiap widget punya try-catch mandiri — satu crash tidak memblokir widget lain
- Ini juga memperbaiki "My Tasks bug" dimana widget bisa stuck karena error di widget lain

---

*SIMPRO v1.0.2 — Offline-first. Zero server. Pure localStorage.*  
*README ini adalah sumber kebenaran tunggal. Tidak ada file dokumentasi lain yang diperlukan.*
*README ini adalah sumber kebenaran tunggal. Tidak ada file dokumentasi lain yang diperlukan.*
