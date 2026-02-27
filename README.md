# SIMPRO — Simple Project Management Office

Aplikasi web manajemen proyek tim berbasis browser — task tracking, sprint planning, kanban board, gantt chart, dan laporan progress untuk Project Manager, Developer, Client, dan Manager.  
**Offline-first · Pure localStorage · Tanpa server · Tanpa instalasi · PWA Ready · GitHub Pages**

---

## Daftar Isi

1. [Status & Versi](#1-status--versi)
2. [Deskripsi Proyek](#2-deskripsi-proyek)
3. [Target Pengguna & Role](#3-target-pengguna--role)
4. [Cara Menjalankan](#4-cara-menjalankan)
5. [Struktur Folder Target Akhir](#5-struktur-folder-target-akhir)
6. [Arsitektur & Pola Kode](#6-arsitektur--pola-kode)
7. [Design System & UI Guidelines](#7-design-system--ui-guidelines)
8. [localStorage Key Reference](#8-localstorage-key-reference)
9. [Skema Data](#9-skema-data)
10. [Fitur Lengkap](#10-fitur-lengkap)
11. [Riwayat Fase](#11-riwayat-fase)
12. [Roadmap Fase](#12-roadmap-fase)
13. [Panduan untuk Claude Selanjutnya](#13-panduan-untuk-claude-selanjutnya)
14. [Log Pengerjaan & Versi](#14-log-pengerjaan--versi)

---

## 1. Status & Versi

| Info | Detail |
|------|--------|
| **Nama Proyek** | SIMPRO |
| **Kepanjangan** | Simple Project Management Office |
| **Versi App** | 0.1.0 |
| **Fase Saat Ini** | FASE 1 — Core Infrastructure & Design System ✅ |
| **Fase Berikutnya** | FASE 2 — Auth: Login, Register & Session |
| **Tech Stack** | HTML5 + CSS3 + JavaScript ES6+ (Vanilla, no framework) |
| **Storage** | `localStorage` 100% — tanpa server, tanpa database |
| **PWA** | Aktif sejak Fase 1 (manifest.json + sw.js) |
| **Deploy** | GitHub Pages (github.io) |
| **Total Fase v1** | 16 Fase |

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

### Lokal (tanpa server)

```
1. Ekstrak zip ke folder manapun
2. Double klik index.html
3. Login dengan akun default (lihat seed data di bawah)
4. Tidak perlu npm, pip, server, atau koneksi internet
```

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

## 5. Struktur Folder Target Akhir

```
simpro/
├── index.html                          ← Entry point — cek session, redirect
├── 404.html                            ← Halaman not found
├── manifest.json                       ← PWA manifest
├── sw.js                               ← Service Worker
├── README.md                           ← Dokumentasi ini
│
├── assets/
│   ├── css/
│   │   ├── tokens.css                  ← Design tokens (warna, spacing, tipografi)
│   │   ├── reset.css                   ← CSS reset
│   │   ├── layout.css                  ← Shell: sidebar, topbar, main area
│   │   ├── components.css              ← Button, Input, Modal, Dropdown, Badge, Toast, Avatar
│   │   ├── kanban.css                  ← Kanban board & task card
│   │   ├── sprint.css                  ← Sprint & backlog view
│   │   ├── gantt.css                   ← Gantt chart & timeline
│   │   ├── reports.css                 ← Laporan & chart
│   │   └── print.css                   ← Style khusus print
│   │
│   ├── js/
│   │   ├── core/
│   │   │   ├── app.js                  ← Init, event bus, theme toggle
│   │   │   ├── auth.js                 ← Login, logout, session, role guard
│   │   │   ├── storage.js              ← Wrapper localStorage CRUD + query
│   │   │   ├── router.js               ← Hash-based router
│   │   │   └── utils.js                ← Helper functions
│   │   │
│   │   ├── modules/
│   │   │   ├── project.js
│   │   │   ├── task.js
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
Server     : TIDAK ADA — buka index.html langsung di browser
PWA        : Service Worker + manifest.json
Target     : Chrome, Firefox, Edge, Safari (modern)
Mobile     : Responsive, touch-friendly
```

### Routing (hash-based)

```javascript
// Contoh URL:
// index.html#dashboard
// index.html#board?project=proj_001
// index.html#task?id=task_042
// index.html#reports?project=proj_001&sprint=sprint_003

// router.js membaca window.location.hash lalu load halaman yang sesuai
window.addEventListener('hashchange', router.handle);
```

### Pola Modul JS

```javascript
// Setiap modul: IIFE yang return public API
// Tidak ada ES import/export — agar bisa dibuka langsung di browser

const ProjectModule = (() => {
  function _validate(data) { ... }   // private
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
// Semua akses data WAJIB melalui storage.js — tidak boleh akses localStorage langsung di kode lain

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
// app.js menyediakan event bus sederhana untuk komunikasi antar modul
App.events.on('task:updated', (task) => { ... });
App.events.emit('task:updated', updatedTask);
App.events.off('task:updated', handler);
```

---

## 7. Design System & UI Guidelines

### Filosofi Visual

SIMPRO mengacu pada estetika **productivity tool profesional** seperti Linear, Jira, dan Plane. Bukan aplikasi konsumer, bukan dark-mode gaming.

Karakteristiknya:
- **Dense tapi bernafas** — banyak informasi tapi tidak sesak, whitespace yang proporsional
- **Monochromatic base + satu warna aksen** — tidak berwarna-warni
- **Tipografi sebagai hierarki** — ukuran, weight, warna teks menunjukkan prioritas informasi
- **Interaksi halus** — hover state, transisi 150–200ms, tidak ada animasi berlebihan
- **Zero emoji di UI** — semua ikon menggunakan Lucide Icons (SVG)

### Design Tokens (tokens.css)

```css
:root {
  /* Warna */
  --color-bg:           #F7F8FA;
  --color-surface:      #FFFFFF;
  --color-surface-2:    #F0F1F3;
  --color-border:       #E2E4E9;
  --color-border-strong:#C8CBD3;

  --color-text:         #1A1D23;
  --color-text-2:       #5C6070;
  --color-text-3:       #9BA0AD;

  --color-accent:       #3B5BDB;
  --color-accent-hover: #3451C7;
  --color-accent-light: #EEF2FF;

  /* Status */
  --color-success:      #2F9E44;
  --color-success-bg:   #EBFBEE;
  --color-warning:      #E67700;
  --color-warning-bg:   #FFF9DB;
  --color-danger:       #C92A2A;
  --color-danger-bg:    #FFF5F5;
  --color-info:         #1971C2;
  --color-info-bg:      #E7F5FF;

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

  /* Border Radius */
  --radius-sm: 4px;  --radius-md: 6px;  --radius-lg: 8px;
  --radius-xl: 12px; --radius-full: 9999px;

  /* Shadow */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 2px 8px rgba(0,0,0,0.08);
  --shadow-lg: 0 4px 16px rgba(0,0,0,0.10);
  --shadow-xl: 0 8px 32px rgba(0,0,0,0.12);

  /* Transisi */
  --transition: 150ms ease;
  --transition-slow: 250ms ease;

  /* Layout */
  --sidebar-width: 240px;
  --topbar-height: 52px;
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
Tooltip  : muncul saat hover 400ms, teks singkat
Toast    : pojok kanan bawah, auto-dismiss 3 detik, variant success/error/info
Avatar   : inisial 1–2 huruf nama, warna deterministic berdasarkan userId
```

### Ikon

```
Library : Lucide Icons via CDN
URL     : https://unpkg.com/lucide@latest/dist/umd/lucide.min.js
Ukuran  : 14px (inline teks), 16px (default), 20px (button icon), 24px (header)
Warna   : inherit dari parent — tidak hardcode warna ikon
```

### Font

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
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
  avatar: null,                   // null = tampilkan inisial
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
  key: "WR",                      // Prefix task: WR-1, WR-2, dst
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
  activityData: null,             // Diisi jika type = "activity"
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
- CRUD project: buat, edit, arsipkan, hapus
- Project key unik sebagai prefix task ID (WR-1, BE-5, dll)
- Undang member, atur role per-member dalam project
- Project overview: ringkasan task, sprint aktif, milestone

### Task Management
- Task type: Story, Bug, Task, Epic
- Subtask (satu level ke bawah dari task)
- Field lengkap: title, deskripsi, type, status, priority, assignee, label, milestone, story points, estimasi jam, due date
- Auto-generate task key
- Activity log otomatis setiap perubahan field penting

### Kanban Board
- 4 kolom: To Do / In Progress / In Review / Done
- Drag & drop native (mouse + touch, tanpa library)
- Filter: assignee, label, priority, type
- Quick-add task dari footer kolom
- Kartu task: key, title, priority dot, type badge, assignee avatar, due date, story points

### Sprint & Backlog
- Product backlog: task belum di sprint
- Buat sprint dengan nama, goal, tanggal
- Drag task dari backlog ke sprint
- Start sprint (validasi: 1 aktif per project)
- Complete sprint + penanganan task belum done
- Sprint summary otomatis

### Sprint Active View
- Header sprint: nama, goal, tanggal, progress bar, sisa hari
- Task list by status dengan filter
- Mini burndown chart (SVG)

### Gantt Chart
- Timeline task per project (SVG native)
- Zoom: Week / Month / Quarter
- Milestone sebagai diamond marker
- Scroll horizontal

### Laporan & Statistik
- Burndown chart (Canvas)
- Velocity chart (Canvas)
- Task distribution by status, assignee, priority (Canvas)
- Time tracking summary per task dan per member
- Layout siap cetak via browser print

### Time Tracking
- Log waktu manual: jam + deskripsi + tanggal
- Progress bar logged vs estimated di task detail
- Summary waktu per member di laporan

### Notifikasi In-App
- Trigger: task diassign, task dikomentari, due date dekat 2 hari, sprint dimulai/selesai
- Badge counter di topbar
- Panel dropdown notifikasi, mark as read, clear all

### Import / Export
- Export SIMPRO JSON (backup seluruh data)
- Import SIMPRO JSON (mode Replace atau Merge)
- Import Trello JSON (wizard mapping)
- Import Jira CSV (field mapping)
- Export task ke CSV

### Member Management
- Tabel semua user (Admin only)
- Tambah, edit, nonaktifkan user
- Filter by role dan status

### Profile & Settings
- Edit profil, upload avatar, ganti password
- Toggle light/dark theme
- CRUD label per project
- Konfigurasi project (rename, warna, key, hapus)
- Danger zone: reset data (Admin only)

---

## 11. Riwayat Fase

*(diisi seiring pengerjaan)*

---

## 12. Roadmap Fase

### FASE 1 — Core Infrastructure & Design System
**Versi:** v0.1.0

Bangun fondasi teknis dan visual yang dipakai seluruh aplikasi. Tidak ada halaman fungsional di fase ini — murni infrastruktur.

**Deliverable:**
- `index.html` — entry point, cek session, redirect ke login atau dashboard
- `404.html`
- `manifest.json` — PWA (name, icons, theme_color, display standalone)
- `sw.js` — Service Worker, cache shell files untuk offline
- `assets/css/tokens.css` — seluruh design token (lihat Section 7)
- `assets/css/reset.css` — CSS reset
- `assets/css/layout.css` — shell: sidebar 240px kiri + topbar 52px atas + main area
- `assets/css/components.css` — Button, Badge, Input, Textarea, Select, Modal, Dropdown, Toast, Avatar, Tooltip — semua variant dan size
- `assets/js/core/utils.js` — generateId(), formatDate(), timeAgo(), formatRelativeDate(), hashPassword() via SubtleCrypto, truncate(), debounce()
- `assets/js/core/storage.js` — get, set, update, remove, query, clearAll
- `assets/js/core/app.js` — init app, event bus (on/emit/off), theme toggle, Toast API
- `assets/icons/icon-192.png`, `icon-512.png` — placeholder icons (SVG to PNG atau solid color)
- Seed data `storage.js` akan auto-populate saat pertama kali dibuka: 4 user + 2 project contoh + beberapa task + sprint
- Font DM Sans + JetBrains Mono via Google Fonts
- Lucide Icons via CDN
- README diupdate

---

### FASE 2 — Auth: Login, Register & Session
**Versi:** v0.2.0

Sistem autentikasi lengkap dengan role guard dan shell navigasi.

**Deliverable:**
- `pages/login.html` + `assets/js/pages/login.js` — form login dua kolom (brand kiri, form kanan), validasi, redirect setelah login
- `pages/register.html` + `assets/js/pages/register.js` — form register, validasi email duplikat, auto-login setelah register
- `assets/js/core/auth.js` — login(), logout(), getSession(), isLoggedIn(), requireAuth(), requireRole(), getCurrentUser()
- `assets/js/core/router.js` — hash-based router: register route, navigate(), guard halaman yang butuh auth
- Shell layout fully implemented di `layout.css`:
  - Sidebar: logo SIMPRO, navigasi utama (link ke semua halaman), avatar + nama user di bawah, logout button
  - Topbar: judul halaman aktif, bell icon notif (badge), avatar dropdown (profil/logout)
  - Main area: konten halaman di sini
- Sidebar collapse di mobile (toggle hamburger)
- README diupdate

---

### FASE 3 — Dashboard Utama
**Versi:** v0.3.0

Halaman dashboard dengan overview project dan aktivitas terbaru.

**Deliverable:**
- `pages/dashboard.html` + `assets/js/pages/dashboard.js`
- Widget "My Tasks" — task yang diassign ke user yang login, dikelompokkan: Overdue / Due Today / Upcoming
- Widget "Active Projects" — card per project: nama, key, progress bar (done/total task), sprint aktif, jumlah member
- Widget "Recent Activity" — gabungan activity log dari semua project yang user ikuti (maksimal 20 item)
- Widget "Sprint Overview" — sprint aktif dari project yang user ikuti: nama sprint, progress, sisa hari, quick stats
- Tampilan berbeda berdasarkan role:
  - Admin / PM: lihat semua project
  - Developer: lihat project yang diikuti, fokus ke "My Tasks"
  - Viewer: lihat project yang diikuti, tidak ada widget task
- Halaman kosong / welcome state jika belum ada project
- README diupdate

---

### FASE 4 — Project Management
**Versi:** v0.4.0

CRUD project lengkap, manajemen member, dan halaman project overview.

**Deliverable:**
- `pages/projects.html` + `assets/js/pages/projects.js` — grid/list semua project, filter by status (active/archived/all), tombol buat project baru
- `pages/project-detail.html` + `assets/js/pages/project-detail.js` — overview 1 project dengan 3 tab: Overview / Members / Settings
- `assets/js/modules/project.js` — create, getAll, getById, update, archive, delete, addMember, removeMember, getMemberRole
- Modal buat/edit project: nama (validasi unik), key (2–5 huruf kapital, validasi unik), deskripsi, warna (color picker sederhana), priority, tanggal mulai-selesai
- Project card: warna strip kiri, nama, key badge, status badge, progress bar, jumlah member avatar
- Tab Overview: statistik (total task, done, in-progress, backlog), sprint aktif summary, milestone list
- Tab Members: tabel member (avatar, nama, role, email), tombol undang (pilih dari user yang ada) dan hapus member
- Tab Settings (PM/Admin only): edit nama, key, warna, hapus project
- Role guard: Viewer tidak bisa buat/edit project
- README diupdate

---

### FASE 5 — Task Management: CRUD & Task Detail
**Versi:** v0.5.0

Manajemen task lengkap: buat, edit, hapus, subtask, label, activity log.

**Deliverable:**
- `pages/task-detail.html` + `assets/js/pages/task-detail.js`
- `assets/js/modules/task.js` — create, getAll, getById, getByProject, getBySprintId, getBacklog, update, delete, reorder, addSubtask, getSubtasks
- `assets/js/modules/comment.js` — addComment, editComment, deleteComment, getByTask, addActivity, getActivityByTask
- `assets/js/modules/label.js` — create, getByProject, update, delete
- Modal buat task (bisa dipanggil dari mana saja): semua field
- Halaman task detail — layout dua kolom:
  - Kiri (lebar): title (edit inline), deskripsi (edit inline, plain text), subtask list (add/check/delete), comment & activity thread
  - Kanan (narrow): semua metadata (type, status, priority, assignee, label, milestone, sprint, story points, estimasi jam, due date) — semua editable
- Task key ditampilkan di header (WR-5)
- Auto-log activity saat: status berubah, assignee berubah, priority berubah, sprint berubah
- Comment: tambah, edit (dalam 24 jam), hapus — tampilkan "edited" jika sudah diedit
- Breadcrumb: Project → Board/Backlog → Task
- README diupdate

---

### FASE 6 — Kanban Board
**Versi:** v0.6.0

Board Kanban dengan drag & drop native.

**Deliverable:**
- `pages/board.html` + `assets/js/pages/board.js`
- `assets/css/kanban.css`
- `assets/js/modules/kanban.js` — getTasksByStatus, moveTask (update status + order), reorderInColumn
- 4 kolom: To Do / In Progress / In Review / Done
- Drag & drop native: `pointerdown` + `pointermove` + `pointerup` (support mouse dan touch sekaligus)
  - Ghost card saat drag (semi-transparan, shadow)
  - Drop indicator (garis biru) di antara kartu saat hover
  - Animasi snap saat drop
- Task card: key (monospace, muted), title, priority dot (warna), type badge, assignee avatar(s), due date (merah jika overdue), story points
- Header kolom: nama status + jumlah task + total story points kolom tersebut
- Quick-add: klik "+ Add task" di footer kolom → inline form title saja → create & simpan
- Filter bar atas: multi-select assignee (avatar), label, priority, type — filter aktif ditandai
- Tombol "Group by Assignee" untuk swimlane view
- Empty state per kolom jika tidak ada task
- README diupdate

---

### FASE 7 — Sprint Planning & Backlog
**Versi:** v0.7.0

Product backlog, sprint management, drag ke sprint.

**Deliverable:**
- `pages/backlog.html` + `assets/js/pages/backlog.js`
- `assets/css/sprint.css`
- `assets/js/modules/sprint.js` — create, getByProject, getActive, getPlanned, getCompleted, start, complete, update, delete, addTask, removeTask
- Backlog view layout:
  - Panel kiri: daftar sprint (planned + active) dan backlog section, masing-masing collapsible
  - Setiap sprint: header (nama, tanggal, story points, status badge, tombol start/complete/edit/delete)
  - Task row: drag handle, key, title, type icon, priority dot, assignee avatar, story points, due date
- Drag task antar bagian (backlog ↔ sprint) via drag handle
- Tombol "Create Sprint" — modal: nama, goal, tanggal mulai, tanggal selesai
- Start Sprint: validasi hanya 1 sprint aktif per project, konfirmasi
- Complete Sprint: modal pilih nasib task belum done → pindah ke backlog atau ke sprint berikutnya
- Sprint summary card setelah complete: task selesai, task di-carry, velocity (story points done)
- README diupdate

---

### FASE 8 — Sprint Active View
**Versi:** v0.8.0

Tampilan sprint yang berjalan dengan statistik lengkap.

**Deliverable:**
- `pages/sprint.html` + `assets/js/pages/sprint.js`
- Header sprint: nama, goal, tanggal mulai-selesai, progress bar done/total task, badge hari tersisa
- Mini burndown chart di header (SVG, planned vs actual)
- 3 panel tab: Board View (kompak, 4 kolom read-only mini) / List View (tabel task) / Stats
- Tab Stats: total task, done, in-progress, todo; total story points vs done points; breakdown per assignee
- Filter list view: by assignee, by priority
- Quick-navigate ke halaman Board penuh dan Backlog
- State "Sprint Completed" jika sprint sudah selesai: tampilkan summary dan link ke sprint berikutnya atau backlog
- README diupdate

---

### FASE 9 — Gantt Chart & Milestone
**Versi:** v0.9.0

Timeline visual project dengan milestone.

**Deliverable:**
- `pages/gantt.html` + `assets/js/pages/gantt.js`
- `assets/css/gantt.css`
- `assets/js/modules/gantt.js` — calculateLayout, getTasksWithDates, renderToSVG, getZoomConfig
- `assets/js/modules/milestone.js` — create, getByProject, update, delete, checkStatus
- Gantt chart murni SVG:
  - Kolom kiri: daftar task (key + title, klik → task detail)
  - Area kanan: timeline dengan grid tanggal
  - Bar task: warna berdasarkan status, panjang sesuai startDate–dueDate
  - Diamond marker untuk milestone
  - Today marker (garis vertikal merah)
- Zoom toggle: Week / Month / Quarter — ubah densitas grid
- Scroll horizontal smooth di area timeline
- Task tanpa due date tidak ditampilkan di Gantt (ada pesan di sidebar)
- Modal add/edit milestone: nama, deskripsi, due date, status
- README diupdate

---

### FASE 10 — Time Tracking
**Versi:** v0.10.0

Log waktu manual, visualisasi estimasi vs aktual.

**Deliverable:**
- Komponen time tracker di halaman task detail (bawah deskripsi):
  - Progress bar: logged hours vs estimated hours (warna berubah jika over-estimate)
  - Tombol "Log Time" → form: jam (desimal, misal 2.5), deskripsi, tanggal
  - Daftar log waktu: tanggal, user, jam, deskripsi — dengan tombol hapus (hapus milik sendiri, PM bisa hapus semua)
- `assets/js/modules/timelog.js` — add, getByTask, getByUser, getByProject, getTotalByTask, getTotalByUser, delete
- Summary widget di project detail tab Overview: tabel waktu per member (estimated vs logged)
- Role guard: Developer hanya bisa log untuk diri sendiri; PM dan Admin bisa log untuk siapapun
- README diupdate

---

### FASE 11 — Notifikasi In-App
**Versi:** v0.11.0

Sistem notifikasi yang dipicu aksi penting di seluruh aplikasi.

**Deliverable:**
- `assets/js/modules/notification.js` — create, getByUser, getUnreadCount, markRead, markAllRead, clearAll
- Topbar bell icon: badge merah dengan angka notif belum dibaca (tersembunyi jika 0)
- Dropdown panel notifikasi (klik bell):
  - Header: "Notifications" + tombol "Mark all read"
  - List notif: icon type, title, message, waktu relatif, indicator dot jika belum dibaca
  - Klik notif → navigate ke referensi (task / sprint / project) + mark as read otomatis
  - Tombol "Clear all"
  - Empty state jika tidak ada notif
- Auto-create notifikasi:
  - Task diassign → notif ke assignee baru
  - Komentar di task → notif ke semua yang pernah komentar dan ke assignee
  - Due date task kurang 2 hari → notif ke assignee (cek sekali saat login)
  - Sprint dimulai → notif ke semua member project
  - Sprint completed → notif ke semua member project
- README diupdate

---

### FASE 12 — Laporan & Statistik
**Versi:** v0.12.0

Dashboard laporan dengan chart Canvas dan layout siap cetak.

**Deliverable:**
- `pages/reports.html` + `assets/js/pages/reports.js`
- `assets/css/reports.css`
- `assets/css/print.css`
- `assets/js/modules/report.js` — kalkulasi burndown, velocity, distribution, timeStats
- Filter header: pilih project + pilih sprint (atau rentang custom)
- Chart via Canvas API native (tidak ada library):
  - **Burndown chart**: garis planned (diagonal) vs actual (actual story points sisa per hari), area di bawah garis
  - **Velocity chart**: bar per sprint, warna berdasarkan tercapai/tidak
  - **Task by Status**: donut chart (todo/in-progress/review/done)
  - **Task by Assignee**: horizontal bar chart
  - **Task by Priority**: bar chart dengan warna per priority
- Tabel time tracking: per task (estimated vs logged), per member (total jam)
- Tombol Print: buka `window.print()` dengan `print.css` yang menyembunyikan sidebar/topbar/buttons
- README diupdate

---

### FASE 13 — Import / Export
**Versi:** v0.13.0

Backup, restore data SIMPRO, dan migrasi dari Trello/Jira.

**Deliverable:**
- `pages/io.html` + `assets/js/pages/io.js`
- `assets/js/modules/io.js`
- **Halaman io.html** — dua section besar: Export dan Import, masing-masing dengan card per format

**Export SIMPRO JSON:**
- Tombol "Export All Data" → serialize semua `sp_*` localStorage ke satu JSON → download `simpro_backup_YYYY-MM-DD.json`
- Tampilkan ringkasan sebelum download: X projects, Y tasks, Z users

**Import SIMPRO JSON:**
- Upload file JSON → parse → validasi format (cek key wajib ada)
- Preview ringkasan isi file
- Pilih mode: **Replace** (hapus semua data, pakai dari file) atau **Merge** (gabungkan, skip item dengan ID yang sama)
- Mode Replace: user harus ketik "CONFIRM" sebelum tombol aktif
- Setelah import: reload halaman

**Import Trello JSON:**
- Instruksi cara export dari Trello (teks + screenshot path)
- Upload JSON → parse → deteksi boards yang tersedia
- Wizard 3 langkah:
  1. Pilih board mana yang diimport (checkbox)
  2. Mapping kolom Trello (list names) ke status SIMPRO (todo/in-progress/review/done) — dropdown per list
  3. Preview jumlah task yang akan diimport → Konfirmasi
- Mapping: board→project, list→status, card→task, checklist item→subtask, member→user (role: developer)

**Import Jira CSV:**
- Instruksi cara export dari Jira (teks)
- Upload CSV → auto-detect kolom (papaparse via CDN)
- Tabel preview 5 baris pertama dengan mapping kolom otomatis (Summary→title, Issue Type→type, Status→status, Priority→priority, Assignee→assignee)
- User bisa ubah mapping jika auto-detect salah (dropdown per kolom)
- Konfirmasi → import

**Export Task CSV:**
- Pilih project dari dropdown
- Download CSV: Key, Title, Type, Status, Priority, Assignee, Sprint, Story Points, Due Date, Created At

- README diupdate

---

### FASE 14 — Member Management & Admin Panel
**Versi:** v0.14.0

Manajemen user terpusat untuk Admin.

**Deliverable:**
- `pages/members.html` + `assets/js/pages/members.js`
- Halaman members: tabel semua user (avatar, nama, email, role badge, jumlah project, last login, status aktif/nonaktif)
- Filter: by role, by status
- Search: by nama atau email
- Admin actions:
  - Tombol "Add User" → modal: nama, email, password, role
  - Edit user (modal): nama, email, role
  - Toggle aktif/nonaktif (nonaktif = tidak bisa login)
- PM view: hanya lihat member di project yang PM kelola, tidak bisa ubah role global
- Modal detail user (klik nama): info lengkap + daftar project yang diikuti + total task assigned + total jam logged
- README diupdate

---

### FASE 15 — Profile & Settings
**Versi:** v0.15.0

Pengaturan personal dan konfigurasi aplikasi.

**Deliverable:**
- `pages/profile.html` + `assets/js/pages/profile.js`:
  - Edit nama, email (validasi duplikat)
  - Upload avatar → resize ke 128×128 via Canvas → simpan base64
  - Edit bio
  - Form ganti password: password lama (validasi) + password baru + konfirmasi
- `pages/settings.html` + `assets/js/pages/settings.js` dengan 4 tab:
  - **Appearance**: toggle light/dark theme, ukuran font (Normal/Large), preview langsung
  - **Projects**: daftar project yang user kelola — rename, ubah warna, ubah key, hapus (dengan konfirmasi)
  - **Labels**: CRUD label per project — pilih project dari dropdown, list label dengan color picker, add/edit/delete
  - **Danger Zone** (Admin only): "Reset All Data" (hapus seluruh localStorage kecuali session) dengan konfirmasi ketik "RESET"
- README diupdate

---

### FASE 16 — Polish, PWA Penuh & Audit Final
**Versi:** v1.0.0

Penyempurnaan menyeluruh, PWA offline penuh, dan audit final.

**Deliverable:**
- **PWA offline penuh**: sw.js cache semua HTML, CSS, JS, font, icon — app jalan 100% offline; update cache otomatis saat versi baru
- **Empty states**: setiap halaman dan setiap widget punya empty state yang informatif (ilustrasi SVG sederhana + teks + action button)
- **Skeleton screen**: dashboard dan board tampilkan skeleton saat pertama load (50–100ms simulasi)
- **Responsive audit**: perbaiki semua halaman untuk mobile 375px (sidebar jadi drawer) dan tablet 768px
- **Keyboard UX**: semua modal/dropdown close via Esc; semua form submit via Enter; focus management yang benar
- **Error handling**: try-catch di semua operasi storage; Toast error yang informatif; tidak ada white screen of death
- **Performance**: tidak ada layout thrash (batch DOM update); animasi hanya via CSS transform/opacity; debounce pada search/filter
- **Accessibility minimal**: semua button punya label, semua input punya label, kontras warna memenuhi WCAG AA
- **Cross-browser**: test dan perbaiki di Chrome, Firefox, Edge, Safari
- **Link audit**: semua navigasi sidebar berfungsi; tidak ada `href="#"` yang tidak sengaja
- **README final**: update semua section ke kondisi v1.0.0 (struktur folder final, localStorage keys final, semua riwayat fase terisi)
- README diupdate ke v1.0.0

---

## 13. Panduan untuk Claude Selanjutnya

### Cara Menggunakan

```
Fase 1  : Upload MASTER_PROMPT_SIMPRO.md + README_SIMPRO.md
          Tulis: "Kerjakan FASE 1"
          Output: simpro_fase1.zip

Fase 2+ : Upload MASTER_PROMPT_SIMPRO.md + README_SIMPRO.md + simpro_fase[N-1].zip
          Tulis: "Kerjakan FASE [N]"
          Output: simpro_fase[N].zip

Catatan : Jika dalam 1 sesi Claude tidak cukup untuk menyelesaikan fase tersebut,
          fase akan dipecah menjadi sub-fase (misal: 6.1, 6.2).
          Selesaikan setiap sub-fase penuh sebelum lanjut.
```

### Prinsip Wajib

1. **Baca README dulu** — README adalah sumber kebenaran tunggal. Baca sebelum menulis kode apapun.
2. **Satu fase, selesai tuntas** — tidak ada `// TODO`, placeholder, fungsi kosong, atau file setengah jadi.
3. **Kode jalan langsung di browser** — tidak ada build step, npm, server, atau dependency yang perlu di-install.
4. **Ikuti pola kode** yang sudah ada — jangan buat arsitektur baru atau pola berbeda.
5. **Prefix `sp_` wajib** untuk semua localStorage key.
6. **Akses localStorage hanya via storage.js** — tidak boleh langsung di modul lain.
7. **Update README** setiap akhir fase: ubah status, tambah riwayat fase, update log versi.
8. **Output zip** bernama `simpro_fase[N].zip` berisi seluruh folder project.

### Yang Tidak Boleh

```
DILARANG : React, Vue, Angular, Svelte, jQuery, atau framework JS apapun
DILARANG : npm, webpack, vite, parcel, atau build tool apapun
DILARANG : fetch() ke API eksternal (CDN font/icon diperbolehkan)
DILARANG : Emoji sebagai elemen UI fungsional — gunakan Lucide Icons
DILARANG : Akses localStorage langsung di luar storage.js
DILARANG : Chart library eksternal (Chart.js, D3) — gunakan Canvas/SVG native
DILARANG : Drag & drop library (SortableJS, dll) — gunakan pointer events native
DILARANG : Kode Firebase, Supabase, atau backend apapun — ini v1 localStorage only
DILARANG : Meninggalkan fase setengah jadi
```

---

## 14. Log Pengerjaan & Versi

Log ini diupdate **setiap akhir fase** oleh Claude. Mencatat apa yang sudah dikerjakan, file apa yang ditambahkan/diubah, dan catatan penting per fase.

---

### Ringkasan Versi

| Versi | Fase | Tanggal | Status | Highlight |
|-------|------|---------|--------|-----------|
| 0.1.0 | FASE 1 | 2026-02-27 | ✅ Selesai | Core Infrastructure & Design System |
| 0.2.0 | FASE 2 | — | Belum dikerjakan | Auth: Login, Register & Session |
| 0.3.0 | FASE 3 | — | Belum dikerjakan | Dashboard Utama |
| 0.4.0 | FASE 4 | — | Belum dikerjakan | Project Management |
| 0.5.0 | FASE 5 | — | Belum dikerjakan | Task Management: CRUD & Task Detail |
| 0.6.0 | FASE 6 | — | Belum dikerjakan | Kanban Board |
| 0.7.0 | FASE 7 | — | Belum dikerjakan | Sprint Planning & Backlog |
| 0.8.0 | FASE 8 | — | Belum dikerjakan | Sprint Active View |
| 0.9.0 | FASE 9 | — | Belum dikerjakan | Gantt Chart & Milestone |
| 0.10.0 | FASE 10 | — | Belum dikerjakan | Time Tracking |
| 0.11.0 | FASE 11 | — | Belum dikerjakan | Notifikasi In-App |
| 0.12.0 | FASE 12 | — | Belum dikerjakan | Laporan & Statistik |
| 0.13.0 | FASE 13 | — | Belum dikerjakan | Import / Export |
| 0.14.0 | FASE 14 | — | Belum dikerjakan | Member Management & Admin Panel |
| 0.15.0 | FASE 15 | — | Belum dikerjakan | Profile & Settings |
| 1.0.0 | FASE 16 | — | Belum dikerjakan | Polish, PWA Penuh & Audit Final |

---

### Detail Log Per Fase

> **Petunjuk untuk Claude:** Setelah menyelesaikan setiap fase, isi bagian log di bawah ini. Catat: tanggal pengerjaan, file yang ditambahkan, file yang diubah, keputusan teknis penting, dan hal-hal yang perlu diperhatikan di fase berikutnya.

---

#### FASE 1 — Core Infrastructure & Design System
**Versi:** v0.1.0 | **Tanggal:** 2026-02-27 | **Status:** ✅ Selesai

**File Ditambahkan:**
- `index.html` — Entry point, cek session, redirect
- `404.html` — Halaman not found
- `manifest.json` — PWA manifest
- `sw.js` — Service Worker (cache shell)
- `assets/css/tokens.css` — Semua design token (light + dark)
- `assets/css/reset.css` — CSS reset
- `assets/css/layout.css` — Shell layout: sidebar 240px, topbar 52px, responsive
- `assets/css/components.css` — Button, Badge, Input, Modal, Dropdown, Toast, Avatar, Tooltip, Table, Card, Tabs, Breadcrumb, Spinner, Progress, FilterBar, StatCard
- `assets/css/kanban.css`, `sprint.css`, `gantt.css`, `reports.css`, `print.css` — Placeholder
- `assets/js/core/utils.js` — generateId, formatDate, timeAgo, hashPassword, truncate, debounce, getInitials, getAvatarColor, getRoleColor, getPriorityColor, getStatusColor, createAvatarEl, dll
- `assets/js/core/storage.js` — get, set, update, remove, query, clearAll, seed (dengan full seed data)
- `assets/js/core/app.js` — App.init(), EventBus, Toast API, theme toggle, sidebar init, modal helpers
- `assets/js/core/auth.js` — login, logout, getSession, isLoggedIn, requireAuth, requireRole, canEditTask
- `assets/js/core/router.js` — Hash-based router dengan params
- `assets/js/modules/*.js` — 12 file placeholder
- `assets/js/pages/*.js` — 14 file placeholder
- `assets/icons/icon-192.png`, `icon-512.png` — PWA icons
- `pages/login.html` — Login fungsional dengan demo account quick-fill
- `pages/register.html` — Register fungsional
- `pages/dashboard.html` + 12 halaman authenticated placeholder dengan full sidebar shell

**File Diubah:**
- `README_SIMPRO.md` — Update status, versi, log

**localStorage Keys Baru:**
- `sp_users`, `sp_projects`, `sp_sprints`, `sp_tasks`, `sp_milestones`
- `sp_timelogs`, `sp_labels`, `sp_notifications`, `sp_comments`, `sp_settings`
- `sp_session`, `sp_theme`, `sp_seeded`

**Catatan Teknis:**
- Semua modul JS pakai IIFE pattern (no ES modules) agar bisa dibuka tanpa server
- hashPassword menggunakan SubtleCrypto dengan fallback sync untuk environment tanpa HTTPS
- Seed data otomatis dijalankan sekali saat pertama buka (dideteksi via `sp_seeded`)
- Design token mendukung dark mode via `[data-theme="dark"]` CSS attribute
- Anti-FOUC: theme diapply di `<head>` sebelum CSS load

**Yang Perlu Diperhatikan Fase Berikutnya:**
- Fase 2 (Auth) perlu mengimplementasikan sidebar shell yang fungsional penuh
- Auth.login() sudah ada, tinggal dihubungkan ke halaman login yang lebih polished
- Seed data sudah lengkap — Fase 2+ tinggal membaca data yang ada

---

#### FASE 2 — Auth: Login, Register & Session
**Versi:** v0.2.0 | **Tanggal:** — | **Status:** Belum dikerjakan

**File Ditambahkan:**
*(diisi setelah fase selesai)*

**File Diubah:**
*(diisi setelah fase selesai)*

**localStorage Keys Baru:**
*(diisi setelah fase selesai)*

**Catatan Teknis:**
*(diisi setelah fase selesai)*

**Yang Perlu Diperhatikan Fase Berikutnya:**
*(diisi setelah fase selesai)*

---

#### FASE 3 — Dashboard Utama
**Versi:** v0.3.0 | **Tanggal:** — | **Status:** Belum dikerjakan

**File Ditambahkan:**
*(diisi setelah fase selesai)*

**File Diubah:**
*(diisi setelah fase selesai)*

**Catatan Teknis:**
*(diisi setelah fase selesai)*

---

#### FASE 4 — Project Management
**Versi:** v0.4.0 | **Tanggal:** — | **Status:** Belum dikerjakan

**File Ditambahkan:**
*(diisi setelah fase selesai)*

**File Diubah:**
*(diisi setelah fase selesai)*

**Catatan Teknis:**
*(diisi setelah fase selesai)*

---

#### FASE 5 — Task Management: CRUD & Task Detail
**Versi:** v0.5.0 | **Tanggal:** — | **Status:** Belum dikerjakan

**File Ditambahkan:**
*(diisi setelah fase selesai)*

**File Diubah:**
*(diisi setelah fase selesai)*

**Catatan Teknis:**
*(diisi setelah fase selesai)*

---

#### FASE 6 — Kanban Board
**Versi:** v0.6.0 | **Tanggal:** — | **Status:** Belum dikerjakan

**File Ditambahkan:**
*(diisi setelah fase selesai)*

**File Diubah:**
*(diisi setelah fase selesai)*

**Catatan Teknis:**
*(diisi setelah fase selesai)*

---

#### FASE 7 — Sprint Planning & Backlog
**Versi:** v0.7.0 | **Tanggal:** — | **Status:** Belum dikerjakan

**File Ditambahkan:**
*(diisi setelah fase selesai)*

**File Diubah:**
*(diisi setelah fase selesai)*

**Catatan Teknis:**
*(diisi setelah fase selesai)*

---

#### FASE 8 — Sprint Active View
**Versi:** v0.8.0 | **Tanggal:** — | **Status:** Belum dikerjakan

**File Ditambahkan:**
*(diisi setelah fase selesai)*

**File Diubah:**
*(diisi setelah fase selesai)*

**Catatan Teknis:**
*(diisi setelah fase selesai)*

---

#### FASE 9 — Gantt Chart & Milestone
**Versi:** v0.9.0 | **Tanggal:** — | **Status:** Belum dikerjakan

**File Ditambahkan:**
*(diisi setelah fase selesai)*

**File Diubah:**
*(diisi setelah fase selesai)*

**Catatan Teknis:**
*(diisi setelah fase selesai)*

---

#### FASE 10 — Time Tracking
**Versi:** v0.10.0 | **Tanggal:** — | **Status:** Belum dikerjakan

**File Ditambahkan:**
*(diisi setelah fase selesai)*

**File Diubah:**
*(diisi setelah fase selesai)*

**Catatan Teknis:**
*(diisi setelah fase selesai)*

---

#### FASE 11 — Notifikasi In-App
**Versi:** v0.11.0 | **Tanggal:** — | **Status:** Belum dikerjakan

**File Ditambahkan:**
*(diisi setelah fase selesai)*

**File Diubah:**
*(diisi setelah fase selesai)*

**Catatan Teknis:**
*(diisi setelah fase selesai)*

---

#### FASE 12 — Laporan & Statistik
**Versi:** v0.12.0 | **Tanggal:** — | **Status:** Belum dikerjakan

**File Ditambahkan:**
*(diisi setelah fase selesai)*

**File Diubah:**
*(diisi setelah fase selesai)*

**Catatan Teknis:**
*(diisi setelah fase selesai)*

---

#### FASE 13 — Import / Export
**Versi:** v0.13.0 | **Tanggal:** — | **Status:** Belum dikerjakan

**File Ditambahkan:**
*(diisi setelah fase selesai)*

**File Diubah:**
*(diisi setelah fase selesai)*

**Catatan Teknis:**
*(diisi setelah fase selesai)*

---

#### FASE 14 — Member Management & Admin Panel
**Versi:** v0.14.0 | **Tanggal:** — | **Status:** Belum dikerjakan

**File Ditambahkan:**
*(diisi setelah fase selesai)*

**File Diubah:**
*(diisi setelah fase selesai)*

**Catatan Teknis:**
*(diisi setelah fase selesai)*

---

#### FASE 15 — Profile & Settings
**Versi:** v0.15.0 | **Tanggal:** — | **Status:** Belum dikerjakan

**File Ditambahkan:**
*(diisi setelah fase selesai)*

**File Diubah:**
*(diisi setelah fase selesai)*

**Catatan Teknis:**
*(diisi setelah fase selesai)*

---

#### FASE 16 — Polish, PWA Penuh & Audit Final
**Versi:** v1.0.0 | **Tanggal:** — | **Status:** Belum dikerjakan

**File Ditambahkan:**
*(diisi setelah fase selesai)*

**File Diubah:**
*(diisi setelah fase selesai)*

**Catatan Teknis:**
*(diisi setelah fase selesai)*

**Audit Checklist Final:**
- [ ] PWA offline penuh berfungsi
- [ ] Empty states semua halaman
- [ ] Skeleton screen dashboard & board
- [ ] Responsive 375px & 768px
- [ ] Keyboard UX (Esc, Enter, focus)
- [ ] Error handling + Toast
- [ ] Tidak ada layout thrash
- [ ] Aksesibilitas WCAG AA
- [ ] Cross-browser: Chrome, Firefox, Edge, Safari
- [ ] Semua link sidebar berfungsi
- [ ] README final lengkap

---

*SIMPRO v1 — Offline-first. Zero server. Pure localStorage.*  
*Untuk migrasi ke cloud database, lihat README_SIMPRO_V2.md*
