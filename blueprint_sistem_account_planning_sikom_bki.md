# Project Blueprint: Sistem Terintegrasi Account Planning (AP) & SIKOM — PT Biro Klasifikasi Indonesia (BKI)

> **Instruksi untuk AI Agent:**
> Dokumen ini adalah spesifikasi lengkap (*Product & System Requirements*) untuk membangun aplikasi prototipe web bagi lini **Operasi Bisnis Komersial PT Biro Klasifikasi Indonesia (BKI)**. Bangun aplikasi ini secara bertahap, bersih, modular, dan siap dijalankan menggunakan **Docker**. Pastikan seluruh *dummy data* terisi otomatis (*auto-seeded*) saat aplikasi pertama kali dijalankan agar langsung siap didemonstrasikan.

---

## 1. Konteks Bisnis & Tujuan Sistem

PT Biro Klasifikasi Indonesia (BKI) merupakan BUMN jasa klasifikasi dan non-klasifikasi/komersial (*Testing, Inspection, and Certification* / TIC) di bawah *holding* **IDSurvey** (dan **Danantara**).

Saat ini terdapat dua kebutuhan utama pada lini **Operasi Bisnis Komersial**:
1. **Account Planning (AP) — Fase 2:** Mengelola seluruh aspek yang memiliki **nilai finansial/uang** (target pendapatan cabang, potensi proyek, kontrak, RAB, *dropping*, BDD, PAD, *invoice*, dan pembagian hasil antar-cabang / *Statement of Share*).
2. **SIKOM (Sistem Informasi Operasi Komersial):** Mengelola seluruh aspek **operasional eksekusi proyek tanpa input nominal uang** (*timeline*, penugasan inspektor/personel, penjadwalan alat agar tidak bentrok, penerbitan sertifikat TIC, dan rekap beban kerja pegawai untuk penilaian ke *Human Capital* / HC).

### Prinsip Desain Utama (Wajib Diterapkan)
* **Single Source of Truth & Anti Double-Input:** Data yang diinput di AP otomatis mengalir ke SIKOM (saat potensi menjadi proyek) dan disimulasikan tersinkronisasi ke sistem ERP perusahaan (**SAP / Oracle**). Progres pekerjaan di SIKOM otomatis memperbarui sisa potensi pendapatan di AP.
* **Empati terhadap User Lapangan (Field-User First):** Aplikasi tidak hanya menyajikan laporan untuk manajemen pusat, tetapi memberikan *benefit* langsung bagi inspektor/PM lapangan berupa **"Portofolio Kinerja & Beban Kerja Otomatis"** sebagai bukti rekam jejak proyek untuk pengajuan jenjang karier/pengangkatan karyawan ke HC.
* **Tanpa Login Rumit (Mode Prototipe):** Gunakan **Role & Unit Switcher** di *top navigation bar* agar penguji dapat berpindah peran secara instan tanpa perlu halaman *login*.

---

## 2. Arsitektur Teknologi & Infrastruktur (Docker)

Gunakan *tech stack* modern yang ringan dan wajib dibungkus dalam kontainer **Docker** agar mudah dijalankan di berbagai perangkat tanpa bentrok versi *environment*:

* **Frontend:** Next.js (App Router) atau React + TypeScript + Tailwind CSS + Lucide Icons (UI bersih, profesional, bernuansa korporat maritim/energi biru tua & emas).
* **Backend & ORM:** Next.js API Routes / Node.js (Express/Fastify) + Prisma ORM.
* **Database:** MySQL 8.0 (berjalan di dalam kontainer Docker terpisah).
* **Containerization:** Wajib menyertakan `Dockerfile` dan `docker-compose.yml` (berisi *service* `app` dan `db` dengan *auto-migration* serta *auto-seeding*).

---

## 3. Aktor & Struktur Unit Organisasi (Role Switcher)

Sediakan *dropdown* **Simulasi Peran Pengguna** di *header* aplikasi dengan pilihan berikut:
1. **Manajemen Pusat (Direktur / VP Komersial):** Melihat *dashboard* konsolidasi seluruh unit, rasio target RKAP vs realisasi, dan *approval* tingkat akhir.
2. **Unit CoE (CoE Energy & CoE Transport & Logistic):** Fokus pada riset, inisiasi potensi layanan baru, dan *review* RAB.
3. **Unit Operasional Penghasil Pendapatan (Cabang Komersial Jakarta, Cabang Surabaya, & Operasi Digital TIC):** Mengelola *Account Planning*, pengajuan RAB/Dropping, penawaran/tender, dan *Statement of Share* (SOS).
4. **User Lapangan (Project Manager & Inspektor/Surveyor):** Mengakses modul SIKOM untuk *update* progres *timeline*, penggunaan alat, penerbitan sertifikat, dan melihat rekap KPI pribadi.

---

## 4. Skema Database & Entitas Utama

Rancang skema database relasional dengan tabel-tabel berikut:

1. **`UnitKerja`**: `id`, `nama_unit` (CoE Energy, CoE Transport & Logistic, Operasi Digital TIC, Cabang Komersial Jakarta, Cabang Komersial Surabaya), `tipe` (`COE` | `OPERASIONAL`), `target_rkap` (BigInt).
2. **`Sektor`**: `id`, `nama_sektor` (20 sektor BKI, misal: Air, Udara, Darat, Kesehatan, Energi & Migas, Pertambangan, Manufaktur, Konstruksi, Kelautan, dll.).
3. **`Layanan`**: `id`, `nama_layanan` (10 layanan komersial TIC, misal: *Non-Destructive Testing (NDT)*, Inspeksi Bejana Tekan, Sertifikasi Laik Operasi (SLO), Audit Sistem Manajemen, Kalibrasi Alat Ukur, Inspeksi Crane & Alat Angkat, Konsultansi Energi Terbarukan, Survei Logistik Maritim, Pengujian Laboratorium Lingkungan, Sertifikasi Hijau/ESG).
4. **`Pegawai`**: `id`, `nama`, `jabatan` (`PM` | `Inspektor` | `Kepala Cabang` | `VP CoE`), `unit_id`, `status_kepegawaian` (`Kontrak/PKWT` | `Tetap`), `total_nilai_proyek_ditangani` (kalkulasi otomatis dari SIKOM).
5. **`AlatKerja`**: `id`, `nama_alat`, `kode_aset`, `status` (`Tersedia` | `Digunakan` | `Kalibrasi`).
6. **`PotensiProyek`**:
   * `id`, `kode_potensi`, `nama_potensi`, `klien`, `unit_id`, `sektor_id`, `layanan_id`
   * `estimasi_nilai` (Rupiah), `estimasi_biaya_operasi` (Rupiah)
   * `jalur_akuisisi` (`Tender` | `Surat Penawaran`)
   * `status` (`Draft` | `Menunggu Approval Kacab` | `Disetujui / Siap Tender` | `Menang / Jadi Proyek` | `Gugur`)
7. **`Proyek`**:
   * `id`, `kode_proyek`, `potensi_id` (relasi dari Potensi yang menang), `nama_proyek`, `klien`, `unit_utama_id`, `pm_id`
   * `jenis_kontrak` (`Lump Sum` | `Blanket`)
   * `nilai_kontrak` (Rupiah), `persentase_progres` (0 - 100%)
   * `potensi_pendapatan_sisa` (otomatis: `nilai_kontrak * (100 - persentase_progres) / 100`)
   * `status_erp` (`Synced to SAP` | `Synced to Oracle`)
   * `tanggal_mulai`, `tanggal_selesai`
8. **`StatementOfShare` (SOS - Bagi Hasil Antar-Cabang)**:
   * `id`, `proyek_id` (atau `potensi_id`), `unit_utama_id`, `unit_mitra_id`
   * `porsi_utama_persen` (misal: 50 atau 70), `porsi_mitra_persen` (misal: 50 atau 30)
   * `tahap_kesepakatan` (`Awal Potensi` | `Tengah Proyek`), `status_persetujuan` (`Pending` | `Disetujui Mitra` | `Revisi`)
9. **`DokumenKeuangan` (Modul AP)**:
   * `id`, `proyek_id`, `jenis_dokumen` (`RAB` | `Dropping` | `BDD` | `PAD` | `Invoice`)
   * `nomor_dokumen`, `nominal` (Rupiah), `keterangan`
   * `status_approval` (`Draft` | `Review Kacab` | `Review VP CoE` | `Review Cabang Komersial` | `Approved Direksi` | `Ditolak`)
   * `status_lpj` (`Belum LPJ` | `Sudah LPJ` — khusus untuk *Dropping*)
   * `synced_to_erp` (Boolean)
10. **`TugasOperasional` (Modul SIKOM — Tanpa Input Uang)**:
    * `id`, `proyek_id`, `nama_tugas` (untuk kontrak *Blanket*, tiap tugas bertindak sebagai *Call Out*), `inspektor_id`, `alat_id`
    * `tanggal_mulai`, `tanggal_selesai`, `bobot_progres` (%), `status` (`To Do` | `In Progress` | `Selesai`)
    * `nomor_sertifikat_tic` (terbit otomatis saat tugas selesai)

---

## 5. Spesifikasi Fitur & Alur Antarmuka (UI/UX)

Aplikasi memiliki navigasi *sidebar* utama yang terbagi menjadi **4 Area Kerja**:

### A. Dashboard Eksekutif & Ringkasan Bisnis
* **Kartu KPI Utama:**
  * Target RKAP Komersial vs. Realisasi Kontrak.
  * Total **Potensi Proyek** (peluang sebelum kontrak).
  * Total **Potensi Pendapatan** (nilai proyek terkontrak yang belum selesai dikerjakan).
  * Status Integrasi ERP (*Badge* hijau: `Terhubung dengan SAP / Oracle ERP`).
* **Grafik Visual:** Perbandingan kontribusi pendapatan per Unit (CoE Energy, CoE TL, Operasi Digital TIC, Cabang Komersial) dan sebaran proyek per Sektor.

### B. Modul 1: Account Planning (AP) — Fokus Finansial & Kontrak
1. **Manajemen Potensi Proyek:**
   * Form **Create Potensi** (Nama Potensi, Klien, Unit, Pilih Layanan [10 *dummy*], Pilih Sektor [20 *dummy*], Estimasi Nilai, Estimasi Biaya Operasi, Jalur Akuisisi: *Tender* / *Surat Penawaran*).
   * Alur *Approval* Kepala Cabang untuk jalur *Surat Penawaran*.
   * Tombol aksi **"Konversi Menjadi Proyek (Menang Kontrak)"**: Saat diklik, status berubah menjadi proyek aktif, memilih jenis kontrak (**Lump Sum** atau **Blanket**), dan otomatis memicu pembuatan data proyek di modul **SIKOM** serta log sinkronisasi ERP.
2. **Manajemen Keuangan Proyek (Detail per Proyek):**
   * Tab terstruktur untuk membuat dan memantau 5 dokumen administrasi keuangan:
     * **RAB:** Dilengkapi simulasi **Approval Berjenjang** (`Kacab` $\rightarrow$ `VP CoE` $\rightarrow$ `Cabang Komersial` $\rightarrow$ `Direksi`) dengan indikator progres persetujuan.
     * **Dropping (Modal Awal):** Pengajuan dana modal sebelum kerja dimulai + *toggle* status **LPJ** (*Laporan Pertanggungjawaban*).
     * **BDD (Biaya Dibayar di Muka):** Pencatatan biaya operasional yang diturunkan lebih awal.
     * **PAD (Pendapatan Akan Diterima):** Pencatatan hak pendapatan yang pembayarannya masih ditangguhkan.
     * **Invoice:** Penerbitan tagihan resmi (piutang) saat termin/tahap pekerjaan selesai.
3. **Fitur Statement of Share (SOS / Bagi Hasil Cabang):**
   * Memungkinkan cabang utama mengundang cabang mitra (misal: Cabang Jakarta membagi pekerjaan dengan Cabang Surabaya) baik di tahap awal maupun di tengah proyek.
   * Menampilkan kalkulasi otomatis pembagian **Nilai Pendapatan** dan **Batas Budget RAB** sesuai persentase (misal 50:50 atau 70:30), lengkap dengan tombol *Approval* dari cabang mitra agar tidak terjadi sengketa sepihak.

### C. Modul 2: SIKOM — Fokus Operasional & Lapangan (Zero Money Input)
* **Catatan Penting:** Halaman ini **tidak memiliki form input uang** untuk menjaga fokus tim operasi. Jika user perlu melihat pagu anggaran, hanya tersedia tombol *read-only* **"Lihat Ringkasan RAB (dari AP)"**.
* **1. Penjadwalan & Call-Out Proyek:**
  * Menampilkan daftar proyek yang sudah terkontrak dari AP.
  * Untuk kontrak **Blanket**, PM dapat memecah pekerjaan menjadi beberapa sub-tugas (*Call Out*).
  * Menampilkan *timeline* pengerjaan dan status progres (%). Ketika progres di-update di SIKOM, nilai **Potensi Pendapatan Sisa** di modul AP otomatis berkurang secara *real-time*.
* **2. Penugasan Inspektor & Deteksi Bentrok Alat (Anti-Conflict):**
  * Form penugasan inspektor dan pemilihan `AlatKerja` pada rentang tanggal tertentu.
  * **Validasi Cerdas:** Jika alat atau inspektor sudah terjadwal di proyek lain pada tanggal yang beririsan, sistem menampilkan peringatan otomatis (*"Peringatan: Alat NDT-01 sedang digunakan di Proyek Cabang Surabaya pada tanggal tersebut"*).
* **3. Konsolidasi Penerbitan Sertifikat TIC:**
  * Menyatukan penerbitan sertifikat untuk seluruh 10 layanan dan 20 sektor dalam satu tampilan (menggantikan sistem lama yang terpisah-pisah per sertifikat).

### D. Modul 3: Portofolio & Beban Kerja Pegawai (Benefit User Lapangan & HC)
* Halaman khusus yang menjawab masalah pegawai lapangan yang sulit mengajukan pengangkatan status ke **Human Capital (HC)** karena tidak punya bukti data kinerja:
  * Menampilkan daftar seluruh PM dan Inspektor beserta jumlah proyek yang berhasil di-*deliver*, jumlah sertifikat yang diterbitkan, dan akumulasi nilai proyek yang didukung.
  * Tombol **"Export Rekap Kinerja untuk HC (PDF/Print View)"** yang menampilkan laporan resmi kontribusi pegawai lapangan.

### E. Log Integrasi ERP (Simulasi SAP / Oracle)
* *Drawer* atau halaman log teknis yang memperlihatkan *payload JSON* simulasi setiap kali terjadi transaksi lintas sistem (misal: `AP -> SIKOM: Project Created`, `AP -> Oracle ERP: RAB Approved`, `SIKOM -> AP: Progress Updated to 60%`). Sangat berguna untuk bahan diskusi dengan vendor IT.

---

## 6. Kebutuhan Data Awal (Database Seeding)

Pastikan file `seed` mengisi database dengan data realistis BKI:
* **5 Unit Kerja:** CoE Energy, CoE Transport & Logistic, Operasi Digital TIC, Cabang Komersial Jakarta, Cabang Komersial Surabaya.
* **10 Layanan & 20 Sektor** sesuai daftar pada Bagian 4.
* **6 Pegawai Dummy** (termasuk profil PM dan Inspektor lapangan dengan status PKWT/Kontrak yang memiliki riwayat proyek).
* **5 Alat Kerja TIC** (beberapa diset sedang terpakai untuk mendemonstrasikan fitur deteksi bentrok alat).
* **4 Contoh Potensi & Proyek Aktif:**
  1. Proyek *Lump Sum* di sektor Energi (sudah berjalan 40%, memiliki RAB approved, Dropping sudah LPJ, dan PAD).
  2. Proyek *Blanket* di sektor Transportasi & Logistik dengan 3 tahapan *Call Out* dan skema **SOS 50:50** antara Cabang Jakarta dan Cabang Surabaya.
  3. Dua Potensi Proyek baru (satu lewat *Tender*, satu lewat *Surat Penawaran* yang menunggu *approval* Kacab).

---

## 7. Urutan Eksekusi untuk AI Agent

1. Inisialisasi struktur proyek dan buat `docker-compose.yml` serta `Dockerfile` agar aplikasi dan database MySQL dapat berjalan dengan satu perintah (`docker-compose up --build`).
2. Buat skema database (Prisma) beserta *script* `seed` untuk seluruh master data BKI (Unit, 10 Layanan, 20 Sektor, Pegawai, Alat, Proyek, Dokumen Keuangan, SOS).
3. Bangun *Layout* utama dengan **Role Switcher** di *header* dan *Sidebar* navigasi.
4. Implementasikan **Dashboard Eksekutif**, **Modul Account Planning (AP)**, **Modul SIKOM**, **Modul Rekap Kinerja HC**, dan **Log Simulasi Integrasi ERP**.
5. Verifikasi seluruh alur interaktif (konversi potensi ke proyek, approval RAB berjenjang, simulasi SOS bagi hasil, validasi bentrok alat di SIKOM, dan sinkronisasi otomatis persentase progres SIKOM ke sisa potensi pendapatan di AP).