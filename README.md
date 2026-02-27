# SIMPRO — Simple Project Management Office

> **Dokumen Tunggal & Tersentralisasi** — Ini adalah satu-satunya README yang perlu dibaca.  
> Menggabungkan semua informasi dari `README_SIMPRO.md` dan `README_BUG_SIMPRO.md`.  
> Update terakhir: **2026-02-27** | Versi saat ini: **v1.1.5** (Bug Fix Release — BUG-21 SELESAI)

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
| **Versi App** | v1.1.7 (Bug Fix Release — BUG-23) |
| **Fase Pembangunan Selesai** | FASE 16 — Polish, PWA Penuh & Audit Final ✅ |
| **Fase Bug Fix Saat Ini** | BUG-23 ✅ — Project Detail: (1) Fix button Undang Member — guard `memberIds` undefined di `project.js addMember()` + Storage.update callback + ganti inline style ke classList.hidden pattern; (2) Redesign status badge project (Aktif/Arsip/On Hold/Selesai) — tambah border, font-weight lebih tebal, warna lebih kontras dan berbeda tiap status |
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
| BUG-9 | Route Fix: Absolute Path → Relative Path (index.html, 404.html, manifest.json, sw.js) | ✅ Selesai | 2026-02-27 |
| BUG-10 | Navbar Dropdown Fix (position:fixed) + Dashboard My Tasks Overhaul | ✅ Selesai | 2026-02-27 |
| BUG-11 | Backlog: Filter Bar, Status Badge, Due Date, Drag Reorder Fix, Order on Add | ✅ Selesai | 2026-02-27 |
| BUG-12 | Backlog Deep Fix: Collapse State, Drag→Backlog Reorder, Task.reorder() Status Bug, _nextOrder Fix, addTask Batch | ✅ Selesai | 2026-02-27 |
| BUG-13 | Projects: Create Project Fix (null check, try-catch, memberIds guard), Card Dropdown Menu Fix (position:fixed, no duplicate listener) | ✅ Selesai | 2026-02-27 |
| BUG-14 | Members: async Storage.update fix (hash password dulu, lalu sync callback), null/undefined guard, try-catch, TimeLog guard | ✅ Selesai | 2026-02-27 |
| BUG-15 | Members: Filter bar redesign (label, pill, clear button), _openModal full reset, input-error state, pw-hint | ✅ Selesai | 2026-02-27 |
| BUG-16 | Members: Fix _renderRow missing function def (data tidak tampil), toolbar UI overhaul (card container, divider, search label, alignment fix) | ✅ Selesai | 2026-02-27 |
| BUG-17 | Members: Fix modal tambah/edit user tidak muncul — struktur HTML modal salah (`.modal` sebagai container outer), diganti ke `.modal-overlay.hidden` pattern konsisten dengan modul lain | ✅ Selesai | 2026-02-27 |
| BUG-18 | Backlog: (1) Enhanced modal tambah task — layout & styling diperbaiki; (2) Assignee field diganti jadi custom dropdown multi-select; (3) Fix scrollbar backlog page dan per-sprint section | ✅ Selesai | 2026-02-27 |
| BUG-19 | Backlog: (1) Fix button Mulai Sprint & Selesaikan tidak merespons (stopPropagation bug); (2) Fix assignee dropdown hanya tampilkan project members — tampilkan semua user aktif | ✅ Selesai | 2026-02-27 |
| BUG-20 | Project Detail: (1) Tab Members & Settings tidak tampil (CSS active vs hidden pattern mismatch); (2) Placeholder judul task terlalu besar; (3) Tombol close modal task tidak di pojok kanan | ✅ Selesai | 2026-02-27 |
| BUG-21 | Project Detail: Fix Undang Member + Enhance Settings UI (cards + centering) | ✅ Selesai | 2026-02-27 |
| BUG-22 | Project Detail: Fix CSS .input alias + Fix Invite memberIds guard + Settings UI Premium Redesign | ✅ Selesai | 2026-02-27 |
| BUG-23 | Project Detail: Fix Undang Member (memberIds guard di project.js + classList pattern) + Redesign Status Badge Project (warna kontras, border, font-weight) | ✅ Selesai | 2026-02-27 |

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

---

### BUG-9 — Route Fix: Absolute Path → Relative Path
**2026-02-27** | ✅

**Root Cause: `index.html` menggunakan absolute path saat redirect, sehingga gagal di `file://` dan GitHub Pages subdirectory**

Saat user mengakses `simpro/index.html`, redirect diarahkan ke `/pages/dashboard.html` atau `/pages/login.html` (absolute). Di lingkungan `file://`, path ini resolve ke root drive. Di GitHub Pages di subdirectory (misal `/simpro/`), path ini salah karena menghilangkan base path repo.

**Fix 1 — `index.html`:**
- `window.location.replace('/pages/dashboard.html')` → `window.location.replace('./pages/dashboard.html')`
- `window.location.replace('/pages/login.html')` → `window.location.replace('./pages/login.html')`
- `href="/manifest.json"` → `href="manifest.json"` (relative)

**Fix 2 — `404.html`:**
- `href="/assets/css/tokens.css"` → `href="assets/css/tokens.css"` (relative)
- `href="/assets/css/reset.css"` → `href="assets/css/reset.css"` (relative)
- `href="/index.html"` → `href="index.html"` (relative)

**Fix 3 — `manifest.json`:**
- `"start_url": "/index.html"` → `"./index.html"`
- `"scope": "/"` → `"./"`
- Semua icon src dan shortcut url: dari `/assets/...` dan `/pages/...` → `./assets/...` dan `./pages/...`

**Fix 4 — `sw.js`:**
- Cache list berisi hard-coded absolute paths (`/index.html`, `/assets/...`, `/pages/...`)
- Diganti dengan dynamic BASE path: `const BASE = self.location.pathname.replace(/\/sw\.js$/, '')`
- Semua file di-cache via template literal: `` `${BASE}/index.html` ``
- Ini membuat SW bekerja baik di root domain maupun GitHub Pages subdirectory (misal `/simpro/`)

**Fix 5 — `assets/js/core/app.js`:**
- `navigator.serviceWorker.register('../sw.js')` → ditambah `{ scope: '../' }`
- Tanpa scope eksplisit, SW di-register dari `pages/` sehingga scope defaultnya hanya `pages/`, bukan seluruh app

**Fix 6 — `assets/js/pages/backlog.js`:**
- `window.location.href = \`task-detail.html?id=...\`` → ditambah `./` prefix (konsistensi)

---

### BUG-10 — Navbar Dropdown Fix + Dashboard My Tasks Overhaul
**2026-02-27** | ✅

**Root Cause 1: Dropdown terpotong karena `overflow: hidden` pada ancestor**

`.main-area` (wrapper konten utama) memiliki `overflow: hidden` yang menyebabkan dropdown notifikasi dan avatar di topbar terpotong karena menggunakan `position: absolute`. Dropdown hanya terlihat di dalam bounding box `.main-area`, sisanya terpotong.

**Fix 1 — `assets/js/core/shell.js` — Dropdown pakai `position: fixed`:**
- Tambah CSS rule: `#notif-dropdown, #avatar-dropdown { position: fixed !important; z-index: 1600 !important; }`
- Update `_setupNotifDropdown()`: saat tombol diklik, hitung posisi via `getBoundingClientRect()` lalu set `style.top`, `style.right` secara dinamis sebelum tampilkan dropdown
- Update `_setupAvatarDropdown()`: sama — hitung posisi fix saat tombol diklik
- Pendekatan ini memastikan dropdown selalu tampil di luar semua `overflow: hidden` container karena posisinya relatif terhadap viewport

**Fix 2 — `assets/css/components.css` — z-index dropdown dinaikkan:**
- `.dropdown-menu` z-index dari `500` → `1500` (agar konsisten dan tidak tertutup elemen lain)
- Topbar dropdowns `#notif-dropdown` & `#avatar-dropdown` mendapat override `z-index: 1600` via shell styles

**Root Cause 2: Dashboard My Tasks kurang informatif dan styling jelek**

Widget My Tasks hanya menampilkan project dot (bukan label), badge type, dan due date. Tidak ada indikasi status task, dan tampilan terlalu sempit/tidak readable.

**Fix 3 — `assets/js/pages/dashboard.js` — My Tasks widget overhaul:**
- Task row sekarang menampilkan: project key (color-coded pill), status icon+label (To Do / In Progress / Review), dan due date
- Project key ditampilkan sebagai pill dengan warna project (lebih jelas dari dot)
- Status ditampilkan dengan ikon SVG dan warna: abu-abu (todo), biru (in-progress), oranye (review)
- Due date "Tanpa deadline" ditampilkan italic untuk task tanpa deadline (sebelumnya kosong)
- Link "+N task lainnya" sekarang navigasi ke Board (sebelumnya plain text)
- Widget header My Tasks ditambah link ganda: "Board" dan "Backlog"

**Fix 4 — `assets/js/pages/dashboard.js` — Stat bar lebih informatif:**
- Tambah stat "Due Hari Ini" (task yang due-date-nya hari ini) dengan warna warning jika > 0
- Total stat bar sekarang: Project Aktif / Task Saya / Due Hari Ini / Terlambat / Sprint Aktif

**Fix 5 — `assets/css/dashboard.css` — My Tasks CSS baru:**
- `.task-row-project` — project key pill dengan border tipis warna project
- `.task-row-status` — flex row dengan ikon SVG + label status
- `.task-row-due.no-due` — styling italic untuk task tanpa deadline
- `.task-group-more-link` — link styled untuk "+N task lainnya"
- `.dash-stat-warning` — warna warning untuk stat "Due Hari Ini"

---


---

### BUG-11 — Backlog Module Overhaul
**2026-02-27** | ✅

**Bug yang Diperbaiki:**

**1. Filter Bar baru di Backlog:**
- Sebelum: tidak ada cara untuk filter task di backlog/sprint view — semua task tampil sekaligus
- Sesudah: ditambah filter bar dengan 4 filter: Status, Tipe Task, Prioritas, Assignee
- Filter bersifat kumulatif (kombinasi semua aktif)
- Tombol "Reset" muncul otomatis saat ada filter aktif
- Counter "(N dari M ditampilkan)" tampil di header sprint/backlog saat filter aktif
- Filter state disimpan di `_filters` object, reset saat ganti project

**2. Status Badge di setiap Task Row:**
- Sebelum: task row tidak menampilkan status — user tidak bisa lihat apakah task todo/in-progress/review/done dari view backlog
- Sesudah: ditambah `.backlog-status-badge` dengan dot berwarna + label status untuk setiap task row
- Warna: abu-abu (todo), biru (in-progress), oranye (review), hijau (done)

**3. Due Date di Task Row:**
- Sebelum: due date tidak tampil di backlog view sama sekali
- Sesudah: due date tampil di task row dengan format pendek (e.g. "27 Feb")
- Task overdue (due date < hari ini) ditampilkan merah + bold

**4. Drag & Drop Reorder dalam Sprint (FIX KRITIS):**
- Sebelum: drag & drop HANYA memindahkan task antar sprint/backlog — reorder dalam sprint yang sama tidak berfungsi (kode `if (sourceSprintId !== targetSprintId)` selalu skip jika sama sprint)
- Sesudah: ditambah branch `else` yang memanggil `Task.reorder()` untuk reorder dalam sprint/backlog yang sama
- `Task.reorder()` sudah ada di `task.js` tapi tidak pernah dipanggil dari backlog.js

**5. Order saat Sprint.addTask (FIX):**
- Sebelum: `Sprint.addTask()` tidak mengatur order task yang baru ditambahkan → task selalu muncul di urutan acak atau awal list
- Sesudah: saat menambah task via modal "Tambah Task dari Backlog", dihitung `nextOrder` berdasarkan task terakhir di sprint, lalu di-set via `Storage.update` setelah `Sprint.addTask()`

**6. Drag & Drop Pointer Event Cleanup (FIX BUG MEMORY LEAK):**
- Sebelum: `handle.addEventListener('pointermove', _onMove)` tidak pernah di-remove setelah pointerup — event listener terakumulasi setiap kali user drag
- Sesudah: `_drag._handle` dan `_drag._moveHandler` disimpan, lalu `removeEventListener` dipanggil di `_onUp()`

**7. Error Handling Sprint.removeTask dan Sprint.remove:**
- Sebelum: hasil return dari `Sprint.removeTask()` dan `Sprint.remove()` tidak dicek — error permission denied diam-diam
- Sesudah: cek `result.error` dan tampilkan toast yang sesuai

**8. CSS Baru di `sprint.css`:**
- `.backlog-filter-bar` — filter bar di bawah toolbar
- `.backlog-filter-select` — select filter compact
- `.backlog-filter-clear` — tombol reset filter
- `.backlog-filter-note` — counter task terfilter
- `.backlog-status-badge` + `.backlog-status-dot` — status indicator per task row
- `.backlog-due` + `.backlog-due.overdue` — due date styling

---

### BUG-12 — Backlog Deep Fix: Order, Collapse & Drag

**2026-02-27** | ✅

**Bug yang Diperbaiki:**

**1. Task.reorder() memfilter berdasarkan status (BUG KRITIS):**
- Sebelum: `reorder()` di `task.js` memfilter sibling tasks berdasarkan `status` — artinya task dengan status berbeda tidak ikut di-reorder bersama. Di backlog/sprint view yang menampilkan semua task lintas status, ini menyebabkan order visual ≠ order actual di storage
- Sesudah: ditambahkan parameter `filterByStatus` internal. Saat dipanggil dari backlog drag-drop (dengan `targetStatus = null`), reorder dilakukan lintas semua status dalam sprint/backlog — konsisten dengan tampilan visual

**2. `_nextOrder()` memfilter berdasarkan status (BUG):**
- Sebelum: task baru dibuat dengan `order = jumlah task berstatus sama` — bisa bentrok dengan task lain yang punya status berbeda
- Sesudah: `_nextOrder()` tidak lagi menerima parameter `status`, menghitung max order dari SEMUA task dalam sprint/backlog, lalu +1

**3. Drag sprint → backlog tidak mengatur posisi drop (BUG KRITIS):**
- Sebelum: saat task dari sprint di-drag ke backlog, hanya `Sprint.removeTask()` yang dipanggil — task muncul di posisi random di backlog bukan di titik drop yang dituju
- Sesudah: menggunakan `Task.reorder()` dengan `targetSprintId = null` dan `insertIdx` berdasarkan posisi drop visual di backlog

**4. Collapse state sprint direset setiap `_render()` (BUG UX):**
- Sebelum: setiap kali filter berubah atau ada aksi yang memanggil `_render()`, semua sprint kembali ke posisi expanded — user tidak bisa collapse sprint lalu filter
- Sesudah: ditambah `_collapseState` object yang menyimpan state `{ sprintId: boolean }`. State disimpan saat toggle, diterapkan kembali saat render. Reset hanya saat ganti project

**5. `_showAddTaskModal` multiple Storage.update menyebabkan partial re-render (BUG):**
- Sebelum: `Sprint.addTask()` dipanggil per task (yang emit `task:updated` → `_render()`), kemudian `Storage.update` order dipanggil lagi — menyebabkan render antara, task muncul di order tidak benar sebelum di-update
- Sesudah: semua task diproses dalam satu `Storage.update` batch, tidak ada intermediate emit. `_render()` hanya dipanggil sekali di akhir

**6. `memberIds` crash di `_getVisibleProjects` dan `_renderFilterBar` (BUG):**
- Sebelum: `p.memberIds.includes()` crash jika `memberIds` tidak ada (undefined)
- Sesudah: tambah `Array.isArray(p.memberIds)` guard di kedua tempat

**7. `pointercancel` tidak ditangani di drag-drop (BUG):**
- Sebelum: jika browser mengambil kendali pointer (e.g. scroll pada mobile, modal popup), `pointercancel` fired tapi drag state tidak dibersihkan — ghost tetap di layar
- Sesudah: tambah `addEventListener('pointercancel', _onUp, { once: true })` dan cleanup di `_onUp`

**8. `close()` dipanggil setelah `_render()` di `_confirmStartSprint` (BUG MINOR):**
- Sebelum: `close()` setelah `_render()` — modal element sudah hilang dari DOM (karena render ulang) tapi close masih dipanggil
- Sesudah: urutan diperbaiki: `close()` dipanggil sebelum `_render()`

**File yang Dimodifikasi:**
- `assets/js/pages/backlog.js` (v0.8.1)
- `assets/js/modules/task.js` (v0.8.1)

---

### BUG-14 — Members Module: Full Fix

**2026-02-27** | ✅

**Bug yang Diperbaiki:**

**1. `Storage.update` dipanggil dengan async callback — BUG KRITIS (data korup):**
- Root cause: `Storage.update` adalah fungsi **synchronous**. Saat `_saveUser()` menggunakan `Storage.update('sp_users', async arr => [...])`, callback mengembalikan sebuah **Promise** (bukan array). `JSON.stringify(Promise)` menghasilkan `{}` — artinya localStorage menyimpan object kosong, **bukan** array users. Ini menyebabkan seluruh data user terhapus saat tambah/edit user.
- Solusi: Hash password dilakukan dengan `await Utils.hashPassword(password)` **di luar** `Storage.update`, sebelum memanggil `Storage.update`. Callback yang dikirim ke `Storage.update` kini bersifat **synchronous murni** — tidak ada `async/await` di dalamnya.
- Pattern yang benar: `const hash = await Utils.hashPassword(pw); Storage.update('sp_users', arr => arr.map(...));`

**2. `p.memberIds.includes()` crash jika `memberIds` undefined:**
- Sebelum: `_getVisibleUsers`, `_getUserProjectCount`, `_getUserProjects` — semua mengakses `p.memberIds.includes()` tanpa guard → crash jika project tidak punya `memberIds`
- Sesudah: tambah `Array.isArray(p.memberIds) &&` guard di semua tiga fungsi

**3. `t.assigneeIds.includes()` crash jika `assigneeIds` undefined:**
- Sebelum: `_getUserTaskCount` dan `_openDetail` mengakses `t.assigneeIds.includes()` tanpa guard
- Sesudah: tambah `Array.isArray(t.assigneeIds) &&` guard

**4. `TimeLog.getTotalByUser` crash jika `timelog.js` belum loaded:**
- Sebelum: `TimeLog.getTotalByUser(userId)` dipanggil langsung — jika `timelog.js` tidak ada di halaman atau belum loaded, crash dengan ReferenceError
- Sesudah: tambah guard `typeof TimeLog !== 'undefined' && TimeLog.getTotalByUser ? TimeLog.getTotalByUser(userId) : 0`

**5. `document.getElementById()` tanpa null check:**
- Sebelum: semua akses DOM di `init()`, `_bindEvents()`, `_openModal()` dilakukan tanpa null check → jika HTML berubah, terjadi crash TypeError
- Sesudah: setiap `getElementById()` ditambah null guard sebelum diakses

**6. Tidak ada try-catch di `_saveUser()`:**
- Sebelum: jika terjadi error runtime di `_saveUser()` (misal DOM element null, `Utils.hashPassword` gagal), error diam-diam — user tidak dapat feedback
- Sesudah: seluruh body `_saveUser()` dibungkus try-catch-finally. Error ditampilkan via `App.Toast.error()`. `finally` memastikan save button selalu di-enable kembali.

**7. Save button tidak disabled saat proses simpan:**
- Sebelum: user bisa klik "Simpan" berkali-kali saat `hashPassword` (async) berjalan → multiple write ke localStorage
- Sesudah: `saveBtn.disabled = true` saat proses, `saveBtn.disabled = false` di `finally`

**File yang Dimodifikasi:**
- `assets/js/pages/members.js` (v0.14.1)
- `README.md` (v1.0.8)

---

*SIMPRO v1.1.0 — Offline-first. Zero server. Pure localStorage.*  
*README ini adalah sumber kebenaran tunggal. Tidak ada file dokumentasi lain yang diperlukan.*

---

### BUG-15 — Members: Filter Bar Redesign & Add User Fix

**2026-02-27** | ✅

**Bug yang Diperbaiki:**

**1. Filter bar terlalu sederhana dan tidak informatif (BUG UX):**
- Sebelum: hanya 2 `<select>` polos tanpa label, tanpa indikator filter aktif, tanpa clear button — user tidak tahu filter apa yang aktif dan tidak bisa mereset dengan cepat
- Sesudah: Redesign penuh filter toolbar:
  - Setiap select memiliki label (`Role` / `Status`) di atas dengan font uppercase kecil
  - Select yang aktif berubah warna (border biru, background accent-light) untuk visual feedback
  - Muncul **active filter pills** di bawah toolbar saat filter aktif — menampilkan nilai filter yang dipilih + tombol X per-pill untuk hapus filter individual
  - Tombol **"Reset Filter"** muncul otomatis saat ada filter aktif, dengan hover danger-color
  - **Member count badge** berganti menjadi "N dari M user" saat filter aktif (sebelumnya hanya "N user")
  - Semua pill menggunakan warna accent (biru) dengan border, konsisten dengan design system

**2. `_openModal` tidak reset state form secara penuh (BUG):**
- Sebelum: jika admin edit user lalu buka modal tambah user baru, beberapa state bisa bocor (misal `saveBtn.disabled` jika ada error sebelumnya tidak ter-reset)
- Sesudah: reset eksplisit `saveBtn.disabled = false` + hapus `input-error` class dari semua field saat modal dibuka

**3. Password hint tidak ada (UX):**
- Sebelum: tidak ada hint teks di bawah password field — user tidak tahu apakah password opsional saat edit
- Sesudah: ditambah elemen `<span id="pw-hint" class="form-hint">` yang berubah teks:
  - Mode tambah: "Wajib diisi, minimal 6 karakter"
  - Mode edit: "Kosongkan jika tidak ingin mengubah password"

**File yang Dimodifikasi:**
- `assets/js/pages/members.js` (v0.14.2)
- `assets/css/members.css` (v0.15.1)
- `pages/members.html` (v0.14.2)
- `README.md` (v1.0.9)


---

### BUG-16 — Members: Fix Data Tidak Tampil & Toolbar UI Overhaul

**2026-02-27** | ✅

**Bug yang Diperbaiki:**

**1. `_renderRow` tidak terdefinisi sebagai fungsi — BUG KRITIS (data tidak tampil):**
- Root cause: Fungsi `_renderRow(u)` dipanggil di `_loadAndRender()` (`_allUsers.map(u => _renderRow(u))`), namun **tidak pernah dideklarasikan** sebagai fungsi. Kode body `_renderRow` ada di file tapi tanpa `function _renderRow(u) {` di awalnya — orphaned code yang menyebabkan `ReferenceError: _renderRow is not defined` saat runtime. Seluruh tabel member kosong / tidak ter-render.
- Solusi: Tambahkan deklarasi `function _renderRow(u) {` tepat sebelum kode body fungsi tersebut.

**2. Toolbar search & filter tidak aligned dengan benar (BUG UX):**
- Sebelum: Search input dan filter select tidak punya label yang konsisten — search tidak punya label tapi filter sudah punya label. Toolbar `align-items: center` menyebabkan elemen tinggi berbeda tidak aligned secara visual ke baseline yang sama.
- Sesudah: Toolbar diubah ke `align-items: flex-end` agar semua elemen (yang sudah punya label di atas) aligned ke bagian bawah. Search juga ditambah label "Cari" agar konsisten.

**3. Toolbar tidak punya container visual (UX):**
- Sebelum: Toolbar mengambang tanpa batas — sulit membedakan area filter dari area konten
- Sesudah: Toolbar diberi `background`, `border`, `border-radius`, dan `padding` — tampil sebagai card terpisah yang rapi

**4. Tidak ada pemisah antara search dan filter (UX):**
- Sebelum: Search dan filter berdekatan tanpa pemisah — tampak satu kelompok padahal dua area berbeda
- Sesudah: Ditambah `.toolbar-divider` (garis vertikal tipis) antara search dan filter untuk pemisahan visual yang jelas

**5. Search icon position salah setelah penambahan label (BUG):**
- Sebelum: Search icon diposisikan `top: 50%; transform: translateY(-50%)` — ini relatif terhadap container. Setelah label ditambah, icon ikut naik dan tidak lagi aligned dengan input field.
- Sesudah: Icon diposisikan dengan `bottom: 9px` (fixed dari bawah) — selalu aligned dengan input field terlepas dari ada/tidaknya label di atas.

**File yang Dimodifikasi:**
- `assets/js/pages/members.js` (v0.14.3) — tambah `function _renderRow(u) {`
- `assets/css/members.css` (v0.15.2) — toolbar card, label search, divider, alignment fix
- `pages/members.html` (v0.14.3) — tambah label "Cari" dan toolbar divider
- `README.md` (v1.1.0)

---

### BUG-17 — Members: Fix Modal Tambah/Edit User Tidak Muncul

**2026-02-27** | ✅

**Bug yang Diperbaiki:**

**1. Modal tambah user tidak tampil / tampil rusak — BUG KRITIS:**
- Root cause: Struktur HTML modal di `members.html` **terbalik** dibanding pattern yang benar. Di `members.html`, `#modal-user` menggunakan class `.modal` (panel konten) sebagai container luar — saat JS men-set `style.display = 'flex'`, elemen ini tampil sebagai panel kecil (max-width:520px), bukan sebagai overlay fullscreen.
- Pattern yang benar (seperti di `projects.html`, `board.html`, dll): container luar adalah `.modal-overlay` yang `position:fixed; inset:0; display:flex; align-items:center; justify-content:center` — tampil penuh sebagai backdrop — dan di dalamnya baru `.modal` sebagai panel konten.
- Akibat bug ini: modal tambah user dan modal detail user tidak pernah tampil sebagai overlay — modal muncul di posisi inline pada halaman, tanpa backdrop gelap, tanpa centering, atau bahkan tidak terlihat sama sekali tergantung scroll position.

**2. Pattern toggle modal tidak konsisten — BUG UX:**
- Sebelum: `members.js` menggunakan `element.style.display = 'flex'` / `element.style.display = 'none'` untuk buka/tutup modal — berbeda dengan semua modul lain yang menggunakan `classList.remove('hidden')` / `classList.add('hidden')`.
- Sesudah: Diganti ke pattern `classList` yang konsisten. Modal-overlay dimulai dengan class `hidden` (memanfaatkan `.hidden { display:none !important }` yang sudah ada di `components.css`).

**3. Click-outside dan Escape key handler disesuaikan:**
- Sebelum: `e.target.classList.contains('modal-overlay')` — tidak akurat dengan struktur baru karena elemen yang diklik saat klik di luar panel adalah `#modal-user.modal-overlay` itu sendiri
- Sesudah: `e.target === modalUser` — lebih presisi, cek apakah klik langsung pada overlay container (bukan pada panel di dalamnya)
- Escape key: `mu.style.display !== 'none'` → `!mu.classList.contains('hidden')` — konsisten dengan pattern baru

**File yang Dimodifikasi:**
- `pages/members.html` (v0.14.4) — struktur modal-user & modal-user-detail diubah: `.modal-overlay.hidden` sebagai container luar, `.modal` sebagai panel dalam
- `assets/js/pages/members.js` (v0.14.4) — `_openModal`, `_closeModal`, `_openDetail`, `_closeDetail`, event listener click-outside & Escape diupdate ke classList pattern
- `README.md` (v1.1.1)

---

*SIMPRO v1.1.1 — Offline-first. Zero server. Pure localStorage.*
- Sebelum: `_save()` hanya cek `result && result.error` — jika `Project.create()` return `null` (session tidak valid atau error internal), kondisi ini false → `_closeModal()` dan toast success dijalankan tapi project tidak tersimpan. User tidak mendapat feedback error.
- Sesudah: tambah check `if (!result)` sebelum `result.error` check → tampilkan pesan error "Gagal menyimpan project. Pastikan kamu sudah login."
- Tambah try-catch di seluruh `_save()` → error runtime (field tidak ditemukan, dsb) tidak lagi silent fail
- Tambah `memberIds` guard di `_buildCard` dan `_buildListTable`: `Array.isArray(p.memberIds) ? p.memberIds : []` → tidak crash jika project baru tidak punya `memberIds`

**2. Card Dropdown Menu tampil di dalam card (BUG VISUAL KRITIS):**
- Root cause: `.project-card` memiliki `overflow: hidden` (untuk color bar + border radius), menyebabkan `.card-menu-dropdown` dengan `position: absolute` terpotong di dalam bounding box card — dropdown items tidak terlihat / terpotong
- Solusi: Gunakan `position: fixed` dengan kalkulasi koordinat dari `btn.getBoundingClientRect()` (sama dengan fix BUG-10 untuk navbar dropdown)
- Saat tombol ⋯ diklik, hitung `rect.bottom` dan `window.innerWidth - rect.right` lalu set ke style dropdown secara dinamis
- CSS `.card-menu-dropdown` diupdate: `position: fixed; z-index: 1600` sebagai default
- Saat dropdown ditutup (outside click atau toggle), reset style `top/left/right` ke string kosong

**3. Duplicate event listener `document.addEventListener('click')` (BUG MEMORY LEAK):**
- Sebelum: `_bindCardEvents()` dipanggil setiap `_render()` — setiap render menambahkan satu global click listener untuk menutup dropdown. Setelah 10 render, ada 10 listener aktif.
- Sesudah: tambah flag `_cardClickListenerAttached` — listener hanya didaftarkan sekali. Reset style di close handler juga ditambahkan.

**File yang Dimodifikasi:**
- `assets/js/pages/projects.js` (v0.13.1)
- `assets/css/projects.css` (v0.13.1)
- `README.md` (v1.0.7)

---

### BUG-18 — Backlog: Modal Tambah Task Enhanced + Assignee Dropdown + Scrollbar Fix

**2026-02-27** | ✅

**Bug yang Diperbaiki:**

**1. Modal tambah task tampilannya kurang rapi (BUG UX):**
- Sebelum: Form menggunakan satu grid datar dengan semua field berukuran sama — tidak ada hierarki visual, tidak ada pemisah antara field utama (judul/deskripsi) dan field metadata (tipe/prioritas/dll)
- Sesudah: Layout diubah ke struktur berseksi: Judul full-width (font besar), deskripsi full-width, divider, lalu metadata dalam baris 2- dan 3-kolom (Project/Sprint, Tipe/Status/Prioritas, Assignee/Due Date, SP/Jam)
- Modal header ditambah subtitle + tombol "Buat Task" dengan checkmark icon

**2. Assignee field bukan dropdown (BUG):**
- Sebelum: `<select multiple style="height:80px">` — HTML native multi-select yang jelek, UX buruk
- Sesudah: Custom dropdown dengan search bar, avatar member, nama, role label, checkmark visual terpilih, background accent saat selected, reset saat project berganti

**3. Scrollbar halaman backlog tidak muncul (BUG KRITIS):**
- Root cause: `backlog.html` punya inline style `overflow:hidden` pada `main-content` yang mengoverride `overflow-y:auto` dari `layout.css`; dan `.backlog-page` menggunakan `height:100%; overflow:hidden` yang tidak kompatibel dengan parent chain yang tidak semua punya height eksplisit
- Fix: Ganti ke `class="main-content no-pad"` tanpa override; `.backlog-page` pakai `min-height:100%`; `.backlog-body` tidak perlu `overflow-y:auto` sendiri — scroll halaman sudah cukup

**File yang Dimodifikasi:**
- `assets/js/modules/task-modal.js` (v1.1.0) — full rewrite layout + custom assignee dropdown
- `assets/css/components.css` (v1.1.0) — tambah task modal styles + assignee dropdown styles
- `pages/backlog.html` (v0.8.2) — fix inline style main-content
- `assets/css/sprint.css` (v0.7.1) — fix .backlog-page dan .backlog-body layout
- `README.md` (v1.1.2)

---

### BUG-19 — Backlog: Fix Button Sprint Tidak Merespons + Assignee Tampilkan Semua User

**2026-02-27** | ✅

**Bug yang Diperbaiki:**

**1. Button "Mulai Sprint" dan "Selesaikan" tidak merespons saat diklik (BUG KRITIS):**
- Root cause: Elemen `.sprint-actions` memiliki `onclick="event.stopPropagation()"` — ini memblokir event click dari button di dalamnya agar tidak bubbling ke parent `#backlog-body` yang memiliki event delegation handler
- Karena `backlog.js` menggunakan event delegation (`document.getElementById('backlog-body').addEventListener('click', ...)`) untuk menangkap `data-sprint-action`, saat `event.stopPropagation()` dipanggil lebih dulu, event tidak pernah sampai ke handler — semua button sprint (Mulai, Selesaikan, Edit, Hapus, Tambah Task) menjadi tidak berfungsi sama sekali
- Fix: Hapus `onclick="event.stopPropagation()"` dari `.sprint-actions` container — event delegation di `_bindEvents()` sudah benar menangani semua kasus termasuk `return` early setelah aksi diproses, sehingga collapse sprint tidak ikut terpicu

**2. Assignee dropdown hanya menampilkan project members (BUG):**
- Sebelum: `_onProjectChange()` di `task-modal.js` memfilter users berdasarkan `project.memberIds` — user yang baru dibuat via halaman Members tetapi belum ditambahkan ke project tidak akan muncul di dropdown assignee, meskipun mereka adalah user aktif di sistem
- Sesudah: Dropdown assignee sekarang menampilkan **semua user aktif** di sistem, bukan hanya project members. User yang merupakan project member muncul di urutan atas. User yang bukan member diberi label visual "non-member" berwarna abu-abu di samping role label mereka, sehingga PM tetap bisa membedakan member vs non-member saat assign

**File yang Dimodifikasi:**
- `assets/js/pages/backlog.js` (v0.8.2) — hapus `onclick="event.stopPropagation()"` dari `.sprint-actions`
- `assets/js/modules/task-modal.js` (v1.2.0) — `_onProjectChange`: tampilkan semua user aktif, sort member dulu, tambah label non-member; `_renderAssigneeList`: render badge non-member
- `README.md` (v1.1.3)

---

### BUG-20 — Project Detail: Fix Tab Members & Settings + Modal Task UX

**2026-02-27** | ✅

**Bug yang Diperbaiki:**

**1. Tab Members dan Settings tidak tampil saat diklik (BUG KRITIS):**
- Root cause: `_bindTabs()` di `project-detail.js` menggunakan pattern `classList.add('hidden')` / `classList.remove('hidden')` untuk toggle tab panel. Namun CSS di `components.css` mendefinisikan `.tab-panel { display: none }` dan `.tab-panel.active { display: block }` — bukan menggunakan class `.hidden`. Saat tab diklik, panel mendapat `classList.remove('hidden')` tapi tidak mendapat class `active`, sehingga CSS `.tab-panel { display: none }` masih berlaku dan panel tetap tersembunyi.
- Fix: `_bindTabs()` diubah untuk menggunakan pattern class `active` — `classList.remove('active')` untuk semua panel, lalu `classList.add('active')` pada panel yang diklik. HTML `project-detail.html` juga diupdate: class `hidden` dihapus dari `panel-members` dan `panel-settings` (cukup tidak punya class `active` saja, karena default CSS sudah `display: none`).

**2. Placeholder judul task di modal terlalu besar (BUG UX):**
- Sebelum: `.task-title-input { font-size: var(--text-md) }` (15px) — font placeholder terasa besar karena menggunakan ukuran di atas teks body default
- Sesudah: `.task-title-input { font-size: var(--text-base) }` (14px) — ukuran sama dengan input field standar lainnya, konsisten dan tidak dominan

**3. Tombol close modal task tidak di pojok kanan (BUG UX):**
- Root cause: Struktur HTML `modal-header` berisi `div.modal-header-content` (dengan title + subtitle) dan `button.modal-close`. CSS `.modal-title { flex: 1 }` ditujukan agar title mengisi ruang sehingga close button terdorong ke kanan — tapi `modal-title` ada di dalam `modal-header-content`, bukan langsung di `modal-header`. Akibatnya, `flex: 1` pada title tidak berpengaruh terhadap posisi close button di parent flex container.
- Fix: Tambah `.modal-header-content { flex: 1; min-width: 0 }` di CSS — sekarang `modal-header-content` sebagai flex child langsung mengisi ruang tersisa di `modal-header`, mendorong `modal-close` ke pojok kanan sesuai best practice.

**File yang Dimodifikasi:**
- `assets/js/pages/project-detail.js` (v0.4.1) — `_bindTabs`: ganti pattern `hidden` class ke `active` class
- `pages/project-detail.html` (v0.4.1) — hapus class `hidden` dari `panel-members` dan `panel-settings`
- `assets/css/components.css` (v1.1.1) — `task-title-input` font-size dikecilkan; tambah `.modal-header-content { flex: 1 }`
- `README.md` (v1.1.4)

---

*SIMPRO v1.1.4 — Offline-first. Zero server. Pure localStorage.*
*README ini adalah sumber kebenaran tunggal. Tidak ada file dokumentasi lain yang diperlukan.*

---

### BUG-21 — Project Detail: Fix Undang Member + Enhance Settings UI/UX

**2026-02-27** | ✅

**Bug yang Diperbaiki:**

**1. Tombol "Undang Member" tidak berfungsi (BUG KRITIS):**
- Root cause: `_renderMembers()` memanggil `inviteBtn.onclick = _openInviteModal` di bagian bawah fungsi, setelah kondisi `if (members.length === 0) return` — artinya jika project belum punya member, binding onclick tidak pernah dieksekusi. Tombol "Undang Member" di card header menjadi tidak responsif.
- Fix: Pindahkan `inviteBtn.onclick = _openInviteModal` ke atas, sebelum pengecekan `members.length === 0`, agar binding selalu terjadi.
- Bonus: Empty state members diperbarui — tampilan lebih informatif, dilengkapi button "Undang Member" inline di empty state agar user bisa langsung undang tanpa harus cari tombol di header.

**2. Settings UI/UX jelek dan menempel di kiri (BUG UX):**
- Root cause: Settings hanya menggunakan satu `.card` flat dengan `max-width:560px` tanpa centering. Tidak ada `margin: 0 auto`, sehingga card menempel di kiri mengikuti padding main-content.
- Fix 1 (Centering): Tambah `.settings-container` dengan `max-width:640px; margin:0 auto; display:flex; flex-direction:column; gap:var(--sp-4)` — settings sekarang selalu centered di area konten.
- Fix 2 (UI Enhancement): Layout dipisah jadi 4 card berseksi dengan icon header:
  - **Informasi Project** (icon: folder-edit) — Nama, Key, Priority, Deskripsi
  - **Warna & Tampilan** (icon: palette) — Color picker
  - **Jadwal Project** (icon: calendar) — Tanggal mulai & selesai
  - **Danger Zone** (icon: alert-triangle, warna merah) — Arsip & Hapus
- Save button dipindah ke save bar tersendiri di antara form cards dan danger zone — lebih jelas dan tidak membingungkan.
- Tambah `card-subtitle` di setiap card header sebagai deskripsi singkat.
- Tambah `form-hint` pada field Key sebagai petunjuk format.
- Danger zone: tambah `.danger-divider` sebagai pemisah antara aksi Arsip dan Hapus.

**File yang Dimodifikasi:**
- `assets/js/pages/project-detail.js` (v0.4.2) — pindah `inviteBtn.onclick` sebelum early return; update empty state members
- `pages/project-detail.html` (v0.4.2) — restruktur settings panel ke 4 card berseksi dengan `.settings-container`
- `assets/css/projects.css` (v0.13.2) — tambah `.settings-container`, `.settings-section-header`, `.settings-card-icon`, `.card-subtitle`, `.form-hint`, `.settings-save-bar`, `.danger-divider`
- `README.md` (v1.1.5)


---

### BUG-22 — Project Detail: Fix CSS .input Alias + Fix Invite Member + Settings UI Premium Redesign

**2026-02-27** | ✅

**Bug yang Diperbaiki:**

**1. `.input`, `.select`, `.textarea` class tidak terdefinisi di CSS — BUG KRITIS (form tidak ter-styled):**
- Root cause: Semua form HTML di `members.html`, `project-detail.html`, dan halaman lain menggunakan class `class="input"` dan `class="input select"` — tapi CSS hanya mendefinisikan `.form-input`, `.form-select`, `.form-textarea`. Class `.input`, `.select`, `.textarea` tidak pernah dideklarasikan. Akibatnya, semua field di settings, modal invite, dan form lainnya tampil tanpa border, tanpa background, tanpa focus ring — menggunakan style browser default yang sangat jelek.
- Fix: Tambah alias `.input`, `.select`, `.textarea` di `components.css` dengan style yang sama persis dengan `.form-input`, `.form-select`, `.form-textarea`. Juga tambah `.input-mono` untuk field yang butuh monospace font (project key, dll).

**2. Invite member crash jika `memberIds` undefined — BUG:**
- Root cause: `_project.memberIds.map(...)` dan `_project.memberIds.includes(...)` dipanggil langsung tanpa guard. Jika project baru belum punya `memberIds` (schema lama atau edge case), ini crash dengan `TypeError: Cannot read properties of undefined (reading 'map')`
- Fix: Tambah `const memberIds = Array.isArray(_project.memberIds) ? _project.memberIds : []` di `_renderMembers()` dan `_openInviteModal()`.
- Bonus enhance: Dropdown invite sekarang menampilkan role user (`Budi Santoso · Developer`), diurutkan alphabetically, dan menampilkan pesan disabled jika semua user sudah jadi member.

**3. Settings UI/UX premium redesign:**
- Section header: layout flex dengan `.settings-section-icon` (rounded, accent bg) — lebih terasa seperti produk modern
- Card layout: setiap card punya `.settings-card-body` dengan gap konsisten, layout sistem `.settings-field-full` dan `.settings-field-row` (2-kolom) yang proper — tidak lagi pakai `form-row` ad-hoc
- Color picker: diganti dari `<div class="color-swatch">` ke `<button class="color-swatch-btn">` dengan CSS custom property `--swatch-color` — hover scale, active ring dengan double box-shadow, checkmark overlay. Ditambah hex code display realtime
- Duration calculator: saat tanggal mulai dan selesai keduanya diisi, muncul info "Durasi project: 12 minggu 3 hari (87 hari)" — membantu PM merencanakan jadwal tanpa harus hitung manual
- Save bar: ditambah `.settings-save-status` untuk feedback teks "Tersimpan" setelah save
- Danger card: `.settings-danger-card` dengan border danger subtle + danger-bg header, `.danger-action-info/.danger-action-title/.danger-action-desc` untuk layout yang lebih jelas

**File yang Dimodifikasi:**
- `assets/css/components.css` (v1.1.2) — tambah alias `.input`, `.select`, `.textarea`, `.input-mono`
- `assets/js/pages/project-detail.js` (v0.4.3) — fix `memberIds` guard, enhanced `_openInviteModal`, full `_renderSettings` rewrite dengan swatch-btn pattern + duration info + hex display
- `pages/project-detail.html` (v0.4.3) — restruktur settings: `settings-card-header-text`, `settings-field-row/full`, `color-swatch-btn`, `color-hex-display`, `settings-duration-info`, `settings-danger-card`
- `assets/css/projects.css` (v0.13.3) — full settings CSS overhaul: section icon, card body system, swatch btn, color custom row, duration info, save bar, danger card
- `README.md` (v1.1.6)

---

---

### BUG-23 — Project Detail: Fix Undang Member + Redesign Status Badge Project

**2026-02-27** | ✅

**Bug yang Diperbaiki:**

**1. Button "Undang Member" tidak berfungsi — BUG KRITIS:**
- Root cause utama: `addMember()` di `project.js` memanggil `project.memberIds.includes(userId)` tanpa guard — jika `memberIds` undefined (project lama / edge case schema), crash `TypeError: Cannot read properties of undefined (reading 'includes')` terjadi diam-diam, mengakibatkan modal tidak tertutup dan member tidak berhasil diundang.
- Fix 1 — `project.js addMember()`: tambah guard `const existingIds = Array.isArray(project.memberIds) ? project.memberIds : []` sebelum `.includes()` check.
- Fix 2 — `project.js Storage.update callback`: spread `[...(Array.isArray(p.memberIds) ? p.memberIds : []), userId]` dan `{ ...(p.memberRoles || {}) }` — guard dalam callback Storage.update agar tidak crash pada data lama.
- Fix 3 — Visibility pattern: ganti `inviteBtn.style.display = '' / 'none'` → `inviteBtn.classList.remove('hidden') / classList.add('hidden')`. Konsisten dengan pattern `.hidden { display: none !important }` yang digunakan seluruh app. Inline style `style="display:none"` di HTML diubah ke class `hidden`.

**2. Flag status Aktif/Arsip di sebelah nama project tidak ada warna yang jelas — BUG UX:**
- Sebelum: `badge-active` = hijau polos tanpa border; `badge-on-hold` = orange polos; `badge-completed` = abu-abu muda (hampir tidak terlihat); `badge-archived` = abu-abu sangat pudar — tidak ada perbedaan visual yang signifikan antar status.
- Sesudah: Setiap status badge mendapat **border berwarna sesuai status** + **font-weight lebih tebal**:
  - `badge-active` — hijau (success), border `rgba(47,158,68,0.25)`, font-weight 600
  - `badge-on-hold` — orange (warning), border `rgba(230,119,0,0.25)`, font-weight 600
  - `badge-completed` — biru (info) — warna sebelumnya abu-abu diganti biru agar lebih distinctive, border `rgba(25,113,194,0.25)`, font-weight 600
  - `badge-archived` — abu-abu medium `#5C6070`, background `#F1F3F5`, border `#CED4DA`, font-weight 500 — cukup terlihat tapi tidak mencolok karena status tidak aktif

**File yang Dimodifikasi:**
- `assets/js/modules/project.js` — fix `addMember`: memberIds guard di cek awal + guard dalam Storage.update callback + memberRoles fallback `|| {}`
- `assets/js/pages/project-detail.js` — ganti `style.display` → `classList` untuk `inviteBtn`
- `pages/project-detail.html` — ganti `style="display:none"` → `class="hidden"` di `btn-invite-member`
- `assets/css/components.css` — redesign 4 badge project status: border + font-weight + warna `badge-completed` dari grey ke info-blue
- `README.md` (v1.1.7)

---

*SIMPRO v1.1.7 — Offline-first. Zero server. Pure localStorage.*
*README ini adalah sumber kebenaran tunggal. Tidak ada file dokumentasi lain yang diperlukan.*
