# README_BUG_SIMPRO — Bug Fix Roadmap

> **File ini adalah panduan pengerjaan sesi Bug Fix SIMPRO v1.0.0.**
> Baca `MASTER_PROMPT_SIMPRO.md` + `README_SIMPRO.md` + file ini sebelum mulai fase apapun.
> Setiap fase bug diselesaikan TUNTAS sebelum lanjut ke fase berikutnya.
> Output setiap fase: `simpro_bugfix_fase[N].zip`

---

## Status Bug Fix

| Info | Detail |
|------|--------|
| **Versi Base** | v1.0.0 (simpro_fase16.zip) |
| **Fase Bug Saat Ini** | BUG-3 |
| **Total Fase Bug** | 7 Fase |
| **Prioritas** | Kritis — aplikasi tidak bisa digunakan |

---

## Ringkasan Masalah

Setelah audit menyeluruh terhadap codebase `simpro_fase16.zip`, ditemukan bahwa:

- **Tampilan plain / tidak ada styling** — CSS tidak aktif di semua halaman
- **Login tidak bisa** — JS tidak jalan karena dependency gagal load
- **Register tidak bisa** — sama
- **Dashboard kosong** — `Page.init()` tidak terpanggil
- **Semua halaman lain kosong / tidak bisa diakses** — sama root cause

Root cause utama: **semua path aset menggunakan absolute path** (`/assets/css/...`, `/assets/js/...`) yang hanya berfungsi bila aplikasi diakses via web server (GitHub Pages, Live Server, dll). Ketika dibuka langsung via `file://` di browser, path absolut gagal resolve ke filesystem lokal — semua CSS dan JS tidak termuat secara silent.

---

## Analisis Root Cause

### Bug #1 — Absolute Path (KRITIS)

Semua file HTML di `pages/` menggunakan path seperti:

```html
<link rel="stylesheet" href="/assets/css/tokens.css">
<script src="/assets/js/core/utils.js"></script>
```

Ketika dibuka via `file:///C:/Users/.../simpro/pages/login.html`, browser mencoba resolve `/assets/css/tokens.css` ke **root drive** (`C:\assets\css\tokens.css`) — file tidak ditemukan, CSS dan JS silent fail. Dampak: **100% tampilan rusak, 100% fitur mati** saat dibuka via double-klik.

**Solusi:** Ubah semua path menjadi relative berdasarkan posisi file HTML.

- `pages/*.html` (satu level di bawah root) → `../assets/css/tokens.css`
- `index.html` (di root) → `assets/css/tokens.css` (cek, biasanya sudah benar)

### Bug #2 — Lucide Icons Tidak Muncul

Di banyak halaman, `lucide.createIcons()` dipanggil sebelum `Page.init()` selesai menginjeksikan HTML konten — akibatnya icon tidak diproses.

Urutan yang salah:
```javascript
App.init('page-id').then(() => {
  lucide.createIcons(); // ← terlalu awal
  Page.init();          // ← baru inject HTML di sini
});
```

Urutan yang benar:
```javascript
Auth.requireAuth();
Shell.applyTo('page-id', 'Judul');
App.init('page-id').then(() => {
  Page.init();          // inject semua HTML dulu
  lucide.createIcons(); // baru scan icons
});
```

### Bug #3 — Link Navigasi di Shell Masih Absolute

`shell.js` mendefinisikan `href` navigasi dengan `/pages/...` — perlu disesuaikan agar berfungsi via `file://`.

### Bug #4 — README Cara Menjalankan Menyesatkan

README menulis "Double klik index.html" — kontradiksi dengan arsitektur path absolut. Perlu diperbarui setelah fix selesai.

---

## Struktur 7 Fase Bug Fix

Dibagi berdasarkan kelompok fungsional agar tiap fase tidak terlalu panjang dan scope-nya jelas.

```
BUG-1  ← Foundation   : fix semua path HTML, shell.js nav links, sw.js
BUG-2  ← Auth         : login + register + logout flow
BUG-3  ← Shell & Dashboard : sidebar, topbar, semua widget dashboard
BUG-4  ← Project & Task    : projects list, project detail, task detail
BUG-5  ← Board & Sprint    : kanban board, backlog, sprint active view
BUG-6  ← Data & Laporan    : gantt chart, reports, import/export
BUG-7  ← User & Setting    : members, settings, profile + README final
```

---

## Detail Setiap Fase

---

### FASE BUG-1 — Foundation: Fix Semua Path & Navigation Links

**Prioritas:** Kritis. Tidak ada fase lain yang bisa dikerjakan atau ditest sebelum ini selesai.

**Scope:** Perubahan murni pada path dan href — tidak ada logika bisnis yang disentuh.

**Deliverable:**

**1. Semua `pages/*.html` — ubah path aset (15 file):**
- `href="/assets/css/..."` → `href="../assets/css/..."`
- `src="/assets/js/..."` → `src="../assets/js/..."`
- URL CDN (`https://...`) → biarkan, tidak diubah
- File: login, register, dashboard, projects, project-detail, board, backlog, sprint, task-detail, gantt, reports, members, settings, profile, io

**2. `index.html` — cek path:**
- Sudah menggunakan `assets/...` tanpa leading slash → tetap, tidak diubah

**3. `assets/js/core/shell.js` — fix navigation href:**
- Array `NAV_ITEMS` mendefinisikan `href: '/pages/...'` → ubah ke `./namahalaman.html`
- Karena shell.js diload dari halaman di `pages/`, relative path `./dashboard.html` akan resolve ke `pages/dashboard.html` — benar

**4. `sw.js` — cek cache list:**
- Pastikan path di cache list konsisten dan tidak menyebabkan error

**5. Verifikasi akhir:**
- Buka `pages/login.html` via `file://` → halaman tampil styled (bukan plain HTML)
- Buka `index.html` via `file://` → tidak crash

**README diupdate:** tambah log BUG-1

---

### FASE BUG-2 — Auth: Login, Register & Logout

**Prioritas:** Kritis. Pintu masuk utama aplikasi.

**Prasyarat:** BUG-1 selesai.

**Scope:** Seluruh auth flow dari buka app sampai berhasil masuk dan keluar.

**Deliverable:**

**Login (`pages/login.html` + `assets/js/pages/login.js`):**
1. Form submit dengan akun seed → proses → redirect ke dashboard
2. Tombol demo quick-fill berfungsi (4 tombol: Admin, PM, Developer, Viewer)
3. Error banner muncul saat credential salah
4. Password toggle (show/hide) berfungsi
5. Link "Belum punya akun?" → menuju register

**Register (`pages/register.html` + `assets/js/pages/register.js`):**
1. Form submit dengan data valid → buat user baru → auto-login → redirect dashboard
2. Validasi: field kosong, email sudah terdaftar, password < 6 karakter, konfirmasi tidak cocok
3. Link "Sudah punya akun?" → menuju login

**Auth core (`assets/js/core/auth.js` + `assets/js/core/storage.js`):**
1. Cek potensi mismatch hash: `Auth.login()` pakai async `Utils.hashPassword`, seed data juga harus di-hash dengan cara yang sama — jika beda, login selalu gagal walau password benar
2. `Storage.seed()` harus selesai sebelum login dicoba
3. Logout → clear session → redirect login → tidak bisa kembali tanpa login ulang

**Verifikasi akhir:**
- Flow: buka `index.html` → login admin → dashboard → logout → login ulang → berhasil
- Register user baru → auto-login → masuk sebagai user baru

**README diupdate:** tambah log BUG-2

---

### FASE BUG-3 — Shell & Dashboard

**Prioritas:** Tinggi. Shell adalah template yang dipakai semua halaman authenticated.

**Prasyarat:** BUG-2 selesai.

**Scope:** Sidebar, topbar, dan semua widget di dashboard.

**Deliverable:**

**Shell (`assets/js/core/shell.js`):**
1. Sidebar HTML terinjeksikan ke `#sidebar` dengan benar
2. Topbar HTML terinjeksikan ke `.topbar` dengan benar
3. Logo + nama user muncul di sidebar
4. Link navigasi aktif sesuai `pageId`
5. Mobile: hamburger toggle sidebar drawer berfungsi
6. Topbar: avatar user, dropdown profil, notifikasi bell, badge unread

**Dashboard (`pages/dashboard.html` + `assets/js/pages/dashboard.js`):**
1. Urutan init difix: `Shell.applyTo` → `App.init` → `Page.init()` → `lucide.createIcons()`
2. Stat bar (jumlah project, task aktif, sprint berjalan) terrender dengan angka dari seed data
3. Widget "My Tasks" terrender (atau empty state yang benar jika tidak ada task)
4. Widget "Active Sprints" terrender
5. Widget "Recent Activity" terrender
6. Widget "Active Projects" terrender
7. Skeleton screen muncul sebentar lalu konten menggantikan

**App (`assets/js/core/app.js`):**
1. Theme toggle berfungsi (light/dark)
2. Toast notification bisa dipanggil

**Verifikasi akhir:**
- Login → dashboard terlihat lengkap dengan semua widget berisi data seed
- Sidebar aktif di link "Dashboard", semua link bisa diklik
- Dark mode toggle berfungsi dan persist setelah refresh

**README diupdate:** tambah log BUG-3

---

### FASE BUG-4 — Project & Task: Projects, Project Detail, Task Detail

**Prioritas:** Tinggi. Inti navigasi dan data manajemen proyek.

**Prasyarat:** BUG-3 selesai (shell berfungsi).

**Scope:** 3 halaman — projects list, project detail, task detail.

**Deliverable:**

**Projects (`pages/projects.html` + `assets/js/pages/projects.js`):**
1. Shell + sidebar muncul, link "Projects" aktif
2. Daftar project dari seed data terrender
3. Filter/search berfungsi
4. Tombol "Buat Project" → modal → isi → simpan → muncul di list
5. Klik project card → navigasi ke project-detail dengan `?id=...`

**Project Detail (`pages/project-detail.html` + `assets/js/pages/project-detail.js`):**
1. Load project berdasarkan `?id=` dari URL
2. Header: nama, key, deskripsi, progress bar, tombol aksi
3. Tab-tab berfungsi: Overview, Board (preview), Backlog, Members, Settings
4. Tab Overview: statistik task per status, sprint aktif
5. Klik task → navigasi ke task-detail

**Task Detail (`pages/task-detail.html` + `assets/js/pages/task-detail.js`):**
1. Load task berdasarkan `?id=` dari URL
2. Header: key, title, status badge, priority
3. Sidebar kanan: assignee, reporter, sprint, story points, due date
4. Deskripsi task terrender
5. Komentar: list komentar + form tambah komentar berfungsi
6. Time log section: estimasi vs logged, list log waktu
7. Update status task berfungsi

**Verifikasi akhir:**
- Dashboard → Projects → klik project → Project Detail → klik task → Task Detail — semua mulus
- Tidak ada halaman yang blank atau JS error fatal

**README diupdate:** tambah log BUG-4

---

### FASE BUG-5 — Board & Sprint: Kanban Board, Backlog, Sprint View

**Prioritas:** Tinggi. Fitur utama workflow tim sehari-hari.

**Prasyarat:** BUG-4 selesai.

**Scope:** 3 halaman — kanban board, backlog/sprint planning, sprint active view.

**Deliverable:**

**Board (`pages/board.html` + `assets/js/pages/board.js`):**
1. Shell muncul, link "Board" aktif
2. Project selector di header berfungsi
3. 4 kolom kanban terrender: To Do / In Progress / In Review / Done
4. Task card muncul di kolom yang sesuai status
5. Drag & drop task antar kolom berfungsi (native pointer events)
6. Quick-add task di footer kolom berfungsi
7. Filter bar: assignee, label, priority berfungsi

**Backlog (`pages/backlog.html` + `assets/js/pages/backlog.js`):**
1. Shell muncul, link "Backlog" aktif
2. Sprint panel: daftar sprint (planned + active) collapsible
3. Backlog section: daftar task backlog terrender
4. Drag task dari backlog ke sprint berfungsi
5. Tombol "Start Sprint" → validasi + modal konfirmasi
6. Tombol "Complete Sprint" → modal pilih nasib task belum done

**Sprint (`pages/sprint.html` + `assets/js/pages/sprint.js`):**
1. Shell muncul, link "Sprint" aktif
2. Header sprint aktif: nama, goal, tanggal, progress bar
3. Mini burndown chart (SVG) di header terrender
4. 3 tab berfungsi: Board View / List View / Stats
5. Tab Stats: angka task, story points, breakdown per assignee

**Verifikasi akhir:**
- Board → task cards di kolom yang benar, drag berfungsi
- Backlog → sprint dan backlog muncul
- Sprint → konten sprint aktif muncul

**README diupdate:** tambah log BUG-5

---

### FASE BUG-6 — Data & Laporan: Gantt, Reports, Import/Export

**Prioritas:** Medium. Fitur lanjutan untuk PM dan stakeholder.

**Prasyarat:** BUG-5 selesai.

**Scope:** 3 halaman — gantt chart, laporan statistik, import/export.

**Deliverable:**

**Gantt (`pages/gantt.html` + `assets/js/pages/gantt.js`):**
1. Shell muncul, link "Gantt" aktif
2. Project selector berfungsi
3. SVG gantt chart terrender: baris task, bar timeline, today marker (garis merah)
4. Task tanpa due date tidak ditampilkan, ada info message
5. Diamond marker milestone muncul
6. Zoom toggle: Week / Month / Quarter berfungsi
7. Scroll horizontal gantt berfungsi

**Reports (`pages/reports.html` + `assets/js/pages/reports.js`):**
1. Shell muncul, link "Laporan" aktif
2. Filter header: pilih project + sprint berfungsi
3. Burndown chart (Canvas API) terrender
4. Velocity chart terrender
5. Donut chart task by status terrender
6. Horizontal bar chart task by assignee terrender
7. Tabel time tracking terrender
8. Tombol Print berfungsi (`window.print()`)

**IO (`pages/io.html` + `assets/js/pages/io.js`):**
1. Shell muncul, link "Import/Export" aktif
2. Export SIMPRO JSON → download file berhasil
3. Import SIMPRO JSON: upload → parse → preview → konfirmasi berfungsi
4. Export Task CSV: pilih project → download CSV berhasil
5. Import Trello JSON: wizard 3 langkah terrender
6. Import Jira CSV: upload → preview → mapping → import berfungsi

**Verifikasi akhir:**
- Gantt → chart SVG muncul dengan data seed
- Reports → semua 4 chart terrender
- IO → export JSON menghasilkan file yang bisa didownload

**README diupdate:** tambah log BUG-6

---

### FASE BUG-7 — User & Setting: Members, Settings, Profile + Finalisasi

**Prioritas:** Medium. Fitur manajemen user dan konfigurasi personal.

**Prasyarat:** BUG-6 selesai.

**Scope:** 3 halaman terakhir — members, settings, profile — plus finalisasi semua dokumentasi.

**Deliverable:**

**Members (`pages/members.html` + `assets/js/pages/members.js`):**
1. Shell muncul, link "Member" aktif
2. Tabel semua user dari seed data terrender: avatar, nama, email, role badge
3. Filter by role + search by nama/email berfungsi
4. Admin: tombol Add User → modal → isi → user baru muncul di tabel
5. Klik nama user → modal detail: info lengkap + project list
6. Toggle aktif/nonaktif user berfungsi

**Settings (`pages/settings.html` + `assets/js/pages/settings.js`):**
1. Shell muncul, link "Settings" aktif
2. 4 tab berfungsi: Appearance / Projects / Labels / Danger Zone
3. Tab Appearance: toggle light/dark + ukuran font + preview langsung
4. Tab Projects: daftar project yang dikelola, rename/ubah warna/key
5. Tab Labels: CRUD label per project + color picker
6. Tab Danger Zone (Admin only): reset data dengan ketik "RESET"

**Profile (`pages/profile.html` + `assets/js/pages/profile.js`):**
1. Shell muncul
2. Data profil user saat ini terisi: nama, email, bio, avatar
3. Edit nama, email, bio → simpan → tersimpan ke localStorage
4. Upload avatar (resize 128×128 via Canvas → base64) berfungsi
5. Ganti password: form validasi → simpan hash baru → berhasil

**Finalisasi dokumentasi:**
- `README_SIMPRO.md`: update status versi ke `v1.0.1 (Bug Fix Release)`, tambah log semua fase bug
- `README_BUG_SIMPRO.md`: update semua fase ke ✅, status "SELESAI"

**End-to-end test final:**
- Login Admin → cek semua 15 halaman bisa dibuka dan tidak blank
- Login Developer → cek role restriction (tidak bisa akses admin-only)
- Dark mode → refresh → tetap dark mode
- Logout → tidak bisa akses halaman authenticated tanpa login ulang

**README diupdate:** semua dokumentasi final

---

## Log Fase Bug

| Fase | Nama | Status | Tanggal | Catatan |
|------|------|--------|---------|---------|
| BUG-1 | Foundation: Fix Semua Path & Nav Links | ✅ Selesai | 2026-02-27 | Semua path HTML, shell.js, auth.js, dan semua JS pages diperbaiki ke relative path |
| BUG-2 | Auth: Login, Register & Logout | ✅ Selesai | 2026-02-27 | Fix link navigasi login↔register, fix redirect file:// aman di auth.js & login.js |
| BUG-3 | Shell & Dashboard | ⏳ Belum dimulai | — | — |
| BUG-4 | Project & Task | ⏳ Belum dimulai | — | — |
| BUG-5 | Board & Sprint | ⏳ Belum dimulai | — | — |
| BUG-6 | Data & Laporan | ⏳ Belum dimulai | — | — |
| BUG-7 | User & Setting + README Final | ⏳ Belum dimulai | — | — |

---

## Cara Memulai Fase Bug

**Untuk FASE BUG-1:**
Upload ke Claude:
- `MASTER_PROMPT_SIMPRO.md`
- `README_SIMPRO.md`
- `README_BUG_SIMPRO.md` ← file ini
- `simpro_fase16.zip`

Lalu tulis: `"Kerjakan FASE BUG-1"`

**Untuk FASE BUG-2 dst:**
Ganti zip dengan output fase sebelumnya: `simpro_bugfix_fase[N-1].zip`

---

## Catatan Teknis untuk Claude

1. **Jangan buat ulang logika bisnis** — kode fungsional sudah benar, hanya path, urutan init, dan bug struktural yang perlu diperbaiki
2. **Test path**: file di `pages/X.html` butuh `../assets/` untuk akses aset
3. **Seed data sudah lengkap** di `storage.js` — login dengan `admin@simpro.id / admin123`
4. **Jangan ubah** nama file, struktur folder, atau arsitektur JS
5. **Output zip**: `simpro_bugfix_fase[N].zip` berisi seluruh folder `simpro/`
6. **Urutan init yang benar** di setiap halaman authenticated:
   ```javascript
   Auth.requireAuth();
   Shell.applyTo('page-id', 'Judul Halaman');
   App.init('page-id').then(() => {
     Page.init();
     if (window.lucide) lucide.createIcons();
   });
   ```

---

*SIMPRO Bug Fix — 7 fase, satu per satu, tuntas sebelum lanjut.*
