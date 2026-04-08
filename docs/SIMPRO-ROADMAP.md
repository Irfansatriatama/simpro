# SIMPRO — roadmap & stack (sumber kebenaran)

Dokumen ini menggabungkan **arah produk** (feature parity dengan Trackly di `_reference/`) dengan **implementasi nyata** di repo ini.  
**Jangan** menganggap `_reference/implementation_plan.md` sebagai rencana aktif — file itu ditulis untuk **Next.js + NestJS + Turborepo**; basis kode saat ini **tanpa Nest**.

---

## 1. Jawaban singkat: abaikan `implementation_plan.md` saja?

| Pendekatan | Risiko |
|------------|--------|
| Hanya Trackly + kode yang jalan | Kode bisa tetap rapi **jika** aturan jelas; yang mudah berantakan adalah **prioritas phase**, **nama modul**, dan **keputusan arsitektur** — mudah tercampur dengan ingatan “plan lama”. |
| **Satu dokumen ini + Trackly `_reference`** | Satu tempat untuk stack, phase SIMPRO, dan “ke mana lihat untuk UX/logic”. Lebih mudah dilanjutkan manusia maupun AI. |

**Kesimpulan:** Merumuskan ulang dalam **satu MD yang selaras kode** (dokumen ini) **lebih baik** daripada mengandalkan `implementation_plan.md` yang sudah tidak sesuai stack.

---

## 2. Tech stack aktual (sesuai basis kode)

| Lapisan | Teknologi |
|---------|-----------|
| Framework | **Next.js 14** (App Router), React 18 |
| UI | **Tailwind CSS**, komponen pola **shadcn/ui** (Radix + `cn`), **lucide-react** |
| Data | **Prisma** → **PostgreSQL** (biasanya **Supabase** sebagai host DB — *database only*, bukan Supabase Auth sebagai sumber utama sesi) |
| Auth | **Better Auth** (email/username + password, adapter Prisma, cookie) |
| Mutasi bisnis | **Server Actions** + `revalidatePath`; **bukan** REST Nest |
| Route API | Minimal — mis. **`/api/auth/[...all]`** untuk Better Auth |
| Middleware | Proteksi rute (cookie / sesi); penyempurnaan bisa iteratif |
| Deploy | **Vercel** (tipikal untuk Next) |
| Upload file | **Belum wajib terpasang**; rencana bisa **signed upload** (mis. Cloudinary) via **Route Handler** atau action — **tanpa Nest** |

Yang **sengaja tidak dipakai** di jalur ini: **NestJS**, **monorepo Turborepo** seperti `apps/web` + `apps/api`, **JWT custom terpisah** (peran serupa ditanggung Better Auth).

---

## 3. Sumber referensi fitur (bukan rencana arsitektur)

| Sumber | Peran |
|--------|--------|
| `_reference/README.md` | Dokumentasi fitur, role, alur, dan model konseptual Trackly (vanilla + Firestore). **Feature parity**. |
| `_reference/js/**` | Perilaku UI, edge case, permission di app lama. **Rujukan perilaku**, bukan copy-paste. |
| `_reference/implementation_plan.md` | **Arsip / sejarah** rencana Nest + monorepo. Baca hanya untuk ide urutan kerja atau mitigasi — **abaikan struktur API & fase bernomor di sana**. |

---

## 4. Phase SIMPRO (penomoran repo ini)

Angka phase di bawah **khusus untuk SIMPRO**; tidak sama dengan “Fase 1–6” di `implementation_plan.md`.

| Phase | Status | Isi |
|-------|--------|-----|
| **1** | Selesai | Satu app Next di root, Prisma, schema mengikuti domain SIMPRO |
| **2** | Selesai | Auth: Better Auth, login, bootstrap/setup admin, proteksi rute |
| **3** | Selesai | App shell: sidebar, topbar, navigasi peran, pola UI |
| **4** | Selesai | **Anggota** (`/members`): CRUD admin, password reset, kebijakan admin terakhir |
| **5** | Selesai | **Klien** (`/clients`, `/clients/[id]`): CRUD admin/PM, daftar proyek terhubung |
| **6** | Selesai | **Proyek** (`/projects`, `/projects/[id]`): daftar + filter, detail ringkasan, CRUD (admin/PM), anggota + peran, sub-nav ke modul proyek |
| **7** | Selesai | **Backlog** (`/projects/[id]/backlog`): CRUD tugas, filter, epic/sprint, penerima tugas, dependensi, grup per epic |
| **8** | Berikutnya | **Board** (Kanban) dan modul proyek lain — urutan mengikuti `_reference/README.md` |
| **9+** | Direncanakan | Sprint, gantt, maintenance, reports, discussion, log, meetings, assets, notifikasi, notes, settings |
| **N** | Akhir | Polish, aksesibilitas, performa, PDF/export jika perlu, hardening production, dokumentasi handoff |

Sesuaikan isi phase 7+ dengan prioritas bisnis; dokumen ini bisa dipecah jadi checklist per phase saat mulai mengerjakan.

---

## 5. Aturan agar tidak “berantakan”

1. **Keputusan arsitektur baru** → tulis di dokumen ini (atau PR yang mengupdate bagian terkait).  
2. **Fitur baru** → cocokkan dengan `_reference/README.md`; jika menyimpang, catat **alasan** di PR/commit.  
3. **Jangan** mengembalikan pola Nest/Turborepo kecuali ada keputusan eksplisit mengubah stack.  
4. **Secrets** hanya di `.env` / Vercel env — jangan di-commit; rotate jika pernah bocor.

---

## 6. Riwayat dokumen

- Dibuat untuk menyatukan Trackly + realitas SIMPRO **full-stack Next tanpa Nest**.  
- `implementation_plan.md` tetap di `_reference/` sebagai arsip; roadmap aktif = **file ini**.
