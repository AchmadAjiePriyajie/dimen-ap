# Prototipe Sistem Terintegrasi AP & SIKOM — BKI

Next.js 14 (App Router) + TypeScript + Tailwind + Prisma + MySQL 8, dibungkus Docker.

## Menjalankan

```bash
docker compose up --build
```

Buka http://localhost:3000. Saat start, container `app` menjalankan `prisma db push` (auto-migration) lalu `prisma/seed.js` (auto-seed, dilewati jika data sudah ada).

Reset data demo ke kondisi awal:

```bash
docker compose down -v && docker compose up --build
```

Mode dev lokal: `docker compose up db`, lalu `npm install && npx prisma db push && npm run db:seed && npm run dev` (pakai `.env`, MySQL di port 3307).

## Skenario demo

| Alur | Peran (header) | Langkah |
|---|---|---|
| Approval potensi Surat Penawaran | Unit Operasional · Cab. Surabaya | AP → POT-2026-004 → Setujui Kacab |
| Konversi potensi → proyek | Unit Operasional | AP → POT-2026-003 → Konversi Menjadi Proyek → proyek muncul di SIKOM + log ERP |
| Approval RAB berjenjang | CoE → Operasional → Manajemen Pusat | AP → PRJ-2026-002 → tab RAB → Setujui per jenjang |
| Statement of Share | Operasional · Cab. Jakarta (undang), Operasional · Cab. Surabaya (setujui) | Detail proyek → tab Statement of Share |
| Deteksi bentrok alat | User Lapangan | SIKOM → proyek → form penugasan, pilih NDT-01 tanggal 20–25 Nov 2026 |
| Progres SIKOM → AP | User Lapangan | SIKOM → Mulai / Selesai tugas → sisa potensi pendapatan di AP berkurang, sertifikat TIC terbit |
| Rekap kinerja HC | Semua | Portofolio & Beban Kerja → Export Rekap HC → Cetak / Simpan PDF |

## Catatan desain

- Progres proyek = total bobot tugas berstatus Selesai; sisa potensi = nilai kontrak × (100 − progres) / 100 (`src/lib/sync.js`).
- Status approval dokumen menambah `Review Direksi` agar 4 jenjang (Kacab → VP CoE → Cabang Komersial → Direksi) punya tahap masing-masing.
- Tabel tambahan `ErpLog` menyimpan payload simulasi integrasi.
- Modul SIKOM tidak punya input uang; RAB hanya bisa dilihat read-only.
