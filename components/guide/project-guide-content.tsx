import Link from 'next/link';

import { GuideArticle } from '@/components/guide/guide-article';

export function ProjectGuideContent() {
  return (
    <GuideArticle
      title="Panduan proyek"
      description="Untuk Project Manager dan administrator: struktur modul per proyek, laporan, dan koordinasi tim."
    >
      <p>
        Dokumen ini melengkapi{' '}
        <Link href="/guide">Panduan pengguna</Link> dengan fokus{' '}
        <strong>pengelolaan proyek</strong> dan modul yang sering dipakai PM
        serta admin.
      </p>

      <h2>Sub-navigasi proyek</h2>
      <p>
        Dari <Link href="/projects">daftar proyek</Link>, buka sebuah proyek.
        Tab horizontal menghubungkan modul berikut:
      </p>
      <ul>
        <li>
          <strong>Ringkasan</strong> — metadata, progres, anggota proyek,
          taut cepat.
        </li>
        <li>
          <strong>Backlog</strong> — sumber kebenaran tugas: epic, sprint,
          dependensi, penerima tugas.
        </li>
        <li>
          <strong>Board</strong> — Kanban; seret kartu untuk mengubah status.
        </li>
        <li>
          <strong>Sprint</strong> — definisi sprint, status, retro; melepas
          sprint dari tugas saat sprint dihapus.
        </li>
        <li>
          <strong>Gantt</strong> — linimasa (baca saja) untuk perencanaan
          visual.
        </li>
        <li>
          <strong>Maintenance</strong> — tiket operasional / support terkait
          proyek.
        </li>
        <li>
          <strong>Laporan maint.</strong> — daftar tiket maintenance dalam
          bentuk tabel siap cetak; untuk grafik gabungan gunakan{' '}
          <strong>Laporan</strong>.
        </li>
        <li>
          <strong>Laporan</strong> — hanya admin/PM: agregat tugas, sprint,
          maintenance, aset terkait proyek, filter tanggal, cetak dari browser.
        </li>
        <li>
          <strong>Diskusi</strong> — komunikasi thread; sematkan utas
          penting (admin/PM).
        </li>
        <li>
          <strong>Log</strong> — jejak aktivitas tercatat di server (buat /
          ubah tugas, board, sprint, maintenance, diskusi, meeting terkait
          proyek, dll.).
        </li>
      </ul>

      <h2>Anggota &amp; peran proyek</h2>
      <p>
        Di ringkasan proyek, kelola anggota dan peran per proyek. Developer
        yang bukan anggota tidak akan melihat proyek tersebut (kecuali admin
        / PM melihat semua).
      </p>

      <h2>Notifikasi tim</h2>
      <p>
        Saat ini notifikasi otomatis antara lain: penugasan / penambahan
        penerima tugas, thread diskusi baru, balasan diskusi (kepada pemilik
        utas dan peserta balasan lain). Perluas pemicu dapat ditambahkan
        bertahap tanpa mengubah stack (tetap server actions + Prisma).
      </p>

      <h2>Meeting &amp; aset</h2>
      <p>
        <Link href="/meetings">Meetings</Link> dan{' '}
        <Link href="/assets">Aset</Link> bersifat <strong>global</strong>{' '}
        organisasi; meeting bisa menaut ke beberapa proyek. Aktivitas
        terkait proyek dapat muncul di log proyek ketika ada konteks
        proyek.
      </p>

      <h2>Pengaturan organisasi</h2>
      <p>
        <Link href="/settings">Pengaturan</Link> menyimpan preferensi
        (nama aplikasi di judul, zona waktu, format tanggal, mata uang
        default). Nilai ini menjadi dasar tampilan; integrasi penuh ke
        semua angka di laporan bisa dilanjutkan secara bertahap.
      </p>

      <h2>Praktik yang disarankan</h2>
      <ol>
        <li>
          Jaga backlog tetap rapi: status konsisten dengan board, sprint
          relevan untuk iterasi aktif.
        </li>
        <li>
          Gunakan diskusi untuk keputusan yang perlu jejak; ringkas di log
          tercatat otomatis.
        </li>
        <li>
          Arsipkan atau selesaikan tiket maintenance agar laporan maint. dan
          laporan proyek tetap bermakna.
        </li>
      </ol>
    </GuideArticle>
  );
}
