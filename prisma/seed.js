// Auto-seed data demo BKI. Idempotent: dilewati jika data sudah ada.
const { PrismaClient } = require('@prisma/client');
const { recomputeProyek, recomputePegawai } = require('../src/lib/sync.js');

const prisma = new PrismaClient();
const d = (s) => new Date(s + 'T00:00:00Z');
const M = 1_000_000n;

const SEKTOR = [
  'Air (Maritim & Perkapalan)', 'Udara', 'Darat', 'Kesehatan', 'Energi & Migas',
  'Pertambangan', 'Manufaktur', 'Konstruksi', 'Kelautan & Perikanan', 'Transportasi & Logistik',
  'Ketenagalistrikan', 'Petrokimia', 'Pertanian & Perkebunan', 'Kehutanan', 'Telekomunikasi',
  'Pariwisata & Perhotelan', 'Pemerintahan & BUMN', 'Keuangan & Perbankan', 'Pendidikan', 'Lingkungan Hidup',
];
const LAYANAN = [
  'Non-Destructive Testing (NDT)', 'Inspeksi Bejana Tekan', 'Sertifikasi Laik Operasi (SLO)', 'Audit Sistem Manajemen',
  'Kalibrasi Alat Ukur', 'Inspeksi Crane & Alat Angkat', 'Konsultansi Energi Terbarukan', 'Survei Logistik Maritim',
  'Pengujian Laboratorium Lingkungan', 'Sertifikasi Hijau/ESG',
];

async function main() {
  if (await prisma.unitKerja.count()) {
    console.log('[seed] Data sudah ada, seeding dilewati.');
    return;
  }

  await prisma.unitKerja.createMany({
    data: [
      { id: 1, nama_unit: 'CoE Energy', tipe: 'COE', target_rkap: 45_000n * M },
      { id: 2, nama_unit: 'CoE Transport & Logistic', tipe: 'COE', target_rkap: 35_000n * M },
      { id: 3, nama_unit: 'Operasi Digital TIC', tipe: 'OPERASIONAL', target_rkap: 25_000n * M },
      { id: 4, nama_unit: 'Cabang Komersial Jakarta', tipe: 'OPERASIONAL', target_rkap: 60_000n * M },
      { id: 5, nama_unit: 'Cabang Komersial Surabaya', tipe: 'OPERASIONAL', target_rkap: 40_000n * M },
    ],
  });
  await prisma.sektor.createMany({ data: SEKTOR.map((n, i) => ({ id: i + 1, nama_sektor: n })) });
  await prisma.layanan.createMany({ data: LAYANAN.map((n, i) => ({ id: i + 1, nama_layanan: n })) });

  await prisma.pegawai.createMany({
    data: [
      { id: 1, nama: 'Budi Santoso', jabatan: 'Kepala Cabang', unit_id: 4, status_kepegawaian: 'Tetap' },
      { id: 2, nama: 'Rina Wulandari', jabatan: 'VP CoE', unit_id: 1, status_kepegawaian: 'Tetap' },
      { id: 3, nama: 'Andi Pratama', jabatan: 'PM', unit_id: 4, status_kepegawaian: 'Kontrak/PKWT' },
      { id: 4, nama: 'Dewi Lestari', jabatan: 'PM', unit_id: 5, status_kepegawaian: 'Tetap' },
      { id: 5, nama: 'Fajar Nugroho', jabatan: 'Inspektor', unit_id: 4, status_kepegawaian: 'Kontrak/PKWT' },
      { id: 6, nama: 'Sari Puspitasari', jabatan: 'Inspektor', unit_id: 5, status_kepegawaian: 'Kontrak/PKWT' },
    ],
  });

  await prisma.alatKerja.createMany({
    data: [
      { id: 1, nama_alat: 'Ultrasonic Flaw Detector', kode_aset: 'NDT-01', status: 'Digunakan' },
      { id: 2, nama_alat: 'Magnetic Particle Yoke', kode_aset: 'NDT-02', status: 'Tersedia' },
      { id: 3, nama_alat: 'Ultrasonic Thickness Gauge', kode_aset: 'UTG-01', status: 'Digunakan' },
      { id: 4, nama_alat: 'Pressure Calibrator', kode_aset: 'CAL-01', status: 'Kalibrasi' },
      { id: 5, nama_alat: 'Load Test Cell 50T', kode_aset: 'LDT-01', status: 'Tersedia' },
    ],
  });

  await prisma.potensiProyek.createMany({
    data: [
      { id: 1, kode_potensi: 'POT-2026-001', nama_potensi: 'Inspeksi NDT & Bejana Tekan Kilang Balikpapan', klien: 'PT Kilang Pertamina Internasional', unit_id: 4, sektor_id: 5, layanan_id: 1, estimasi_nilai: 5_200n * M, estimasi_biaya_operasi: 3_400n * M, jalur_akuisisi: 'Tender', status: 'Menang / Jadi Proyek' },
      { id: 2, kode_potensi: 'POT-2026-002', nama_potensi: 'Inspeksi Crane & Armada Pelabuhan (Blanket)', klien: 'PT Pelabuhan Indonesia (Persero)', unit_id: 4, sektor_id: 10, layanan_id: 6, estimasi_nilai: 3_600n * M, estimasi_biaya_operasi: 2_300n * M, jalur_akuisisi: 'Surat Penawaran', status: 'Menang / Jadi Proyek' },
      { id: 3, kode_potensi: 'POT-2026-003', nama_potensi: 'Sertifikasi Laik Operasi PLTS Atap Kawasan Industri', klien: 'PT Jababeka Infrastruktur', unit_id: 1, sektor_id: 11, layanan_id: 3, estimasi_nilai: 2_750n * M, estimasi_biaya_operasi: 1_600n * M, jalur_akuisisi: 'Tender', status: 'Disetujui / Siap Tender' },
      { id: 4, kode_potensi: 'POT-2026-004', nama_potensi: 'Kalibrasi Alat Ukur Laboratorium Rumah Sakit', klien: 'RSUD dr. Soetomo', unit_id: 5, sektor_id: 4, layanan_id: 5, estimasi_nilai: 850n * M, estimasi_biaya_operasi: 480n * M, jalur_akuisisi: 'Surat Penawaran', status: 'Menunggu Approval Kacab' },
    ],
  });

  await prisma.proyek.createMany({
    data: [
      { id: 1, kode_proyek: 'PRJ-2026-001', potensi_id: 1, nama_proyek: 'Inspeksi NDT & Bejana Tekan Kilang Balikpapan', klien: 'PT Kilang Pertamina Internasional', unit_utama_id: 4, pm_id: 3, jenis_kontrak: 'Lump Sum', nilai_kontrak: 4_850n * M, potensi_pendapatan_sisa: 4_850n * M, status_erp: 'Synced to SAP', tanggal_mulai: d('2026-09-01'), tanggal_selesai: d('2026-12-31') },
      { id: 2, kode_proyek: 'PRJ-2026-002', potensi_id: 2, nama_proyek: 'Inspeksi Crane & Armada Pelabuhan (Blanket)', klien: 'PT Pelabuhan Indonesia (Persero)', unit_utama_id: 4, pm_id: 4, jenis_kontrak: 'Blanket', nilai_kontrak: 3_450n * M, potensi_pendapatan_sisa: 3_450n * M, status_erp: 'Synced to Oracle', tanggal_mulai: d('2026-10-01'), tanggal_selesai: d('2027-03-31') },
    ],
  });

  await prisma.tugasOperasional.createMany({
    data: [
      { proyek_id: 1, nama_tugas: 'Mobilisasi & Inspeksi Visual Unit CDU', inspektor_id: 5, alat_id: 2, tanggal_mulai: d('2026-09-01'), tanggal_selesai: d('2026-09-30'), bobot_progres: 40, status: 'Selesai', nomor_sertifikat_tic: 'BKI-TIC/L01/S05/2026/0001' },
      { proyek_id: 1, nama_tugas: 'Ultrasonic Testing Pipa Header & Bejana Tekan', inspektor_id: 5, alat_id: 1, tanggal_mulai: d('2026-11-03'), tanggal_selesai: d('2026-11-28'), bobot_progres: 35, status: 'In Progress' },
      { proyek_id: 1, nama_tugas: 'Uji Hidrostatik & Laporan Akhir', inspektor_id: 5, alat_id: null, tanggal_mulai: d('2026-12-01'), tanggal_selesai: d('2026-12-20'), bobot_progres: 25, status: 'To Do' },
      { proyek_id: 2, nama_tugas: 'Call Out #1 — Inspeksi Crane Terminal Petikemas Tanjung Priok', inspektor_id: 6, alat_id: 5, tanggal_mulai: d('2026-10-05'), tanggal_selesai: d('2026-10-25'), bobot_progres: 30, status: 'Selesai', nomor_sertifikat_tic: 'BKI-TIC/L06/S10/2026/0002' },
      { proyek_id: 2, nama_tugas: 'Call Out #2 — Inspeksi Reach Stacker Tanjung Perak', inspektor_id: 6, alat_id: 3, tanggal_mulai: d('2026-11-10'), tanggal_selesai: d('2026-11-30'), bobot_progres: 40, status: 'In Progress' },
      { proyek_id: 2, nama_tugas: 'Call Out #3 — Survei Alat Angkat Pelabuhan Makassar', inspektor_id: 6, alat_id: null, tanggal_mulai: d('2027-01-11'), tanggal_selesai: d('2027-01-29'), bobot_progres: 30, status: 'To Do' },
    ],
  });

  await prisma.dokumenKeuangan.createMany({
    data: [
      { proyek_id: 1, jenis_dokumen: 'RAB', nomor_dokumen: 'RAB/PRJ-2026-001/01', nominal: 3_250n * M, keterangan: 'RAB pelaksanaan inspeksi NDT & bejana tekan (personel, alat, akomodasi)', status_approval: 'Approved Direksi', synced_to_erp: true },
      { proyek_id: 1, jenis_dokumen: 'Dropping', nomor_dokumen: 'Dropping/PRJ-2026-001/01', nominal: 750n * M, keterangan: 'Modal awal mobilisasi tim & alat ke Balikpapan', status_approval: 'Approved Direksi', status_lpj: 'Sudah LPJ', synced_to_erp: true },
      { proyek_id: 1, jenis_dokumen: 'BDD', nomor_dokumen: 'BDD/PRJ-2026-001/01', nominal: 180n * M, keterangan: 'Sewa mess & kendaraan operasional 4 bulan dibayar di muka', status_approval: 'Approved Direksi', synced_to_erp: true },
      { proyek_id: 1, jenis_dokumen: 'PAD', nomor_dokumen: 'PAD/PRJ-2026-001/01', nominal: 1_940n * M, keterangan: 'Hak pendapatan termin 1 (progres 40%), BAPP terbit, pembayaran ditangguhkan', status_approval: 'Approved Direksi', synced_to_erp: true },
      { proyek_id: 2, jenis_dokumen: 'RAB', nomor_dokumen: 'RAB/PRJ-2026-002/01', nominal: 2_200n * M, keterangan: 'RAB kontrak payung (blanket) inspeksi crane & armada pelabuhan', status_approval: 'Review VP CoE' },
      { proyek_id: 2, jenis_dokumen: 'Dropping', nomor_dokumen: 'Dropping/PRJ-2026-002/01', nominal: 400n * M, keterangan: 'Modal awal Call Out #1 & #2', status_approval: 'Approved Direksi', status_lpj: 'Belum LPJ', synced_to_erp: true },
      { proyek_id: 2, jenis_dokumen: 'Invoice', nomor_dokumen: 'Invoice/PRJ-2026-002/01', nominal: 1_035n * M, keterangan: 'Tagihan Call Out #1 Tanjung Priok (30%)', status_approval: 'Approved Direksi', synced_to_erp: true },
    ],
  });

  await prisma.statementOfShare.create({
    data: { proyek_id: 2, unit_utama_id: 4, unit_mitra_id: 5, porsi_utama_persen: 50, porsi_mitra_persen: 50, tahap_kesepakatan: 'Awal Potensi', status_persetujuan: 'Disetujui Mitra' },
  });

  await prisma.erpLog.createMany({
    data: [
      { sumber: 'AP', tujuan: 'SIKOM', event: 'Project Created', payload: { kode_proyek: 'PRJ-2026-001', jenis_kontrak: 'Lump Sum', pm: 'Andi Pratama' }, created_at: d('2026-08-28') },
      { sumber: 'AP', tujuan: 'SAP ERP', event: 'WBS Element Created', payload: { wbs: 'PRJ-2026-001', nilai_kontrak: 4850000000, profit_center: 'CAB-JKT' }, created_at: d('2026-08-28') },
      { sumber: 'AP', tujuan: 'SAP ERP', event: 'RAB Approved', payload: { nomor: 'RAB/PRJ-2026-001/01', nominal: 3250000000 }, created_at: d('2026-08-31') },
      { sumber: 'AP', tujuan: 'SIKOM', event: 'Project Created', payload: { kode_proyek: 'PRJ-2026-002', jenis_kontrak: 'Blanket', pm: 'Dewi Lestari' }, created_at: d('2026-09-29') },
      { sumber: 'AP', tujuan: 'Oracle ERP', event: 'Project Created', payload: { project_number: 'PRJ-2026-002', contract_value: 3450000000 }, created_at: d('2026-09-29') },
      { sumber: 'SIKOM', tujuan: 'AP', event: 'Progress Updated to 40%', payload: { kode_proyek: 'PRJ-2026-001', progres: 40, potensi_pendapatan_sisa: 2910000000 }, created_at: d('2026-09-30') },
      { sumber: 'SIKOM', tujuan: 'AP', event: 'Progress Updated to 30%', payload: { kode_proyek: 'PRJ-2026-002', progres: 30, potensi_pendapatan_sisa: 2415000000 }, created_at: d('2026-10-25') },
    ],
  });

  await recomputeProyek(prisma, 1);
  await recomputeProyek(prisma, 2);
  await recomputePegawai(prisma);
  console.log('[seed] Data demo BKI berhasil diisi.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
