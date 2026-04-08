import Link from 'next/link';

import { GuideArticle } from '@/components/guide/guide-article';

export function UserGuideContent() {
  return (
    <GuideArticle
      title="Panduan pengguna"
      description="Ringkasan modul SIMPRO dan perilaku umum. Stack: Next.js, Prisma, Better Auth — tanpa backend Nest terpisah."
    >
      <p>
        SIMPRO membantu tim mengelola proyek, tugas, diskusi, dan operasional
        terkait. Akses Anda bergantung pada <strong>peran</strong> (admin,
        PM, developer, viewer, klien) dan keanggotaan proyek.
      </p>

      <h2>Peran singkat</h2>
      <ul>
        <li>
          <strong>Administrator</strong> — mengelola anggota, melihat semua
          proyek, modul manajemen (klien, aset, meeting, pengaturan).
        </li>
        <li>
          <strong>PM</strong> — seperti admin untuk urusan proyek; mengelola
          klien, aset, meeting, pengaturan organisasi.
        </li>
        <li>
          <strong>Developer</strong> — bekerja pada proyek yang diikuti:
          backlog, board, tugas, diskusi (jika diizinkan).
        </li>
        <li>
          <strong>Viewer</strong> — biasanya hanya melihat proyek yang
          ditugaskan (board, gantt, ringkasan).
        </li>
        <li>
          <strong>Klien</strong> — akses terbatas sesuai kebijakan organisasi
          Anda.
        </li>
      </ul>

      <h2>Navigasi utama</h2>
      <ul>
        <li>
          <Link href="/dashboard">Dashboard</Link> — ringkasan proyek yang
          Anda akses, tugas terbuka untuk Anda, dan pintasan.
        </li>
        <li>
          <Link href="/projects">Projects</Link> — daftar proyek; buka detail
          untuk sub-modul (backlog, board, sprint, gantt, maintenance, dll.).
        </li>
        <li>
          <Link href="/notifications">Notifikasi</Link> — bell di pojok kanan
          atas; beberapa peristiwa (mis. penugasan tugas, diskusi) membuat
          notifikasi. Bukan real-time: segarkan halaman untuk memperbarui.
        </li>
        <li>
          <Link href="/notes">Catatan pribadi</Link> — catatan milik Anda;
          bisa dibagikan ke anggota lain (lihat / ubah).
        </li>
      </ul>

      <h2>Di dalam proyek</h2>
      <h3>Backlog &amp; Board</h3>
      <p>
        Tugas dibuat dan diedit di backlog; board Kanban menyinkronkan kolom
        dengan status. Pindah kartu di board memperbarui status tugas.
      </p>
      <h3>Sprint &amp; Gantt</h3>
      <p>
        Sprint mengelompokkan tugas per periode; Gantt menampilkan linimasa
        berdasarkan tanggal mulai/jatuh tempo (tampilan baca).
      </p>
      <h3>Maintenance</h3>
      <p>
        Tiket maintenance per proyek (tipe, prioritas, PIC, biaya/waktu).
        Sub-nav <strong>Laporan maint.</strong> menampilkan ringkasan tabel
        untuk cetak; agregat lebih lengkap ada di{' '}
        <strong>Laporan</strong> (admin/PM).
      </p>
      <h3>Diskusi &amp; log</h3>
      <p>
        Diskusi ber-thread; admin/PM dapat menyematkan utas. Log aktivitas
        mencatat perubahan penting di proyek.
      </p>

      <h2>Modul manajemen (admin / PM)</h2>
      <ul>
        <li>
          <Link href="/clients">Klien</Link> — data perusahaan klien dan
          proyek terhubung.
        </li>
        <li>
          <Link href="/meetings">Meetings</Link> — jadwal meeting, agenda,
          peserta, taut proyek.
        </li>
        <li>
          <Link href="/assets">Aset</Link> — inventaris, penugasan, garansi.
        </li>
        <li>
          <Link href="/settings">Pengaturan</Link> — nama sistem, zona waktu,
          format tanggal, mata uang default.
        </li>
      </ul>
      <p>
        Hanya <strong>admin</strong> yang mengelola{' '}
        <Link href="/members">Anggota</Link> (pengguna sistem).
      </p>

      <h2>Panduan khusus PM / admin</h2>
      <p>
        Untuk alur modul proyek dari sisi manajemen (laporan, anggota,
        izin), buka{' '}
        <Link href="/project-guide">Panduan proyek</Link> (hanya tampil di menu
        jika Anda PM atau admin).
      </p>

      <h2>Tips</h2>
      <ul>
        <li>
          Gunakan <strong>pencarian</strong> di bilah atas (desktop) atau
          halaman <Link href="/search">Pencarian</Link> untuk proyek dan tugas
          sesuai hak akses Anda (bukan catatan).
        </li>
        <li>
          Data sensitif hanya untuk peran yang berhak — jangan membagikan
          akun.
        </li>
        <li>
          Upload file besar belum menjadi fitur inti; lampiran di beberapa
          model schema bisa diisi URL jika organisasi Anda memakai penyimpanan
          eksternal.
        </li>
      </ul>
    </GuideArticle>
  );
}
