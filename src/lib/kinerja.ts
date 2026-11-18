import { prisma } from './db';

// Rekap kinerja pegawai lapangan, dihitung dari data SIKOM.
export async function rekapKinerja(where: { id?: number } = {}) {
  const list = await prisma.pegawai.findMany({
    where: { ...where, jabatan: { in: ['PM', 'Inspektor'] } },
    include: {
      unit: true,
      proyek_pm: { include: { tugas: true, potensi: { include: { layanan: true, sektor: true } } } },
      tugas: { include: { proyek: { include: { potensi: { include: { layanan: true, sektor: true } } } } }, orderBy: { tanggal_mulai: 'asc' } },
    },
    orderBy: { id: 'asc' },
  });
  return list.map((g) => {
    const selesai = g.tugas.filter((t) => t.status === 'Selesai');
    const proyekTerlibat = new Map<number, (typeof g.proyek_pm)[number] | (typeof g.tugas)[number]['proyek']>();
    g.proyek_pm.forEach((p) => proyekTerlibat.set(p.id, p));
    g.tugas.forEach((t) => proyekTerlibat.set(t.proyek.id, t.proyek));
    // Proyek "delivered" = proyek dengan minimal satu tahap selesai yang ditangani pegawai (sebagai inspektor atau PM)
    const delivered = new Set<number>([
      ...selesai.map((t) => t.proyek_id),
      ...g.proyek_pm.filter((p) => p.tugas.some((t) => t.status === 'Selesai')).map((p) => p.id),
    ]);
    const aktif = g.tugas.filter((t) => t.status !== 'Selesai').length + g.proyek_pm.filter((p) => p.persentase_progres < 100).length;
    return {
      ...g,
      selesai,
      proyekTerlibat: [...proyekTerlibat.values()],
      delivered: delivered.size,
      sertifikat: selesai.filter((t) => t.nomor_sertifikat_tic).length + g.proyek_pm.reduce((s, p) => s + p.tugas.filter((t) => t.nomor_sertifikat_tic).length, 0),
      bebanAktif: aktif,
    };
  });
}
