// Logika sinkronisasi SIKOM -> AP. CommonJS agar dipakai bersama oleh app (Next.js) dan prisma/seed.js.

// Progres proyek = total bobot tugas berstatus Selesai (maks 100). Sisa potensi = nilai_kontrak * (100 - progres) / 100.
async function recomputeProyek(prisma, proyekId) {
  const p = await prisma.proyek.findUniqueOrThrow({ where: { id: proyekId }, include: { tugas: true } });
  const progres = Math.min(100, p.tugas.filter((t) => t.status === 'Selesai').reduce((s, t) => s + t.bobot_progres, 0));
  const sisa = (p.nilai_kontrak * BigInt(100 - progres)) / 100n;
  await prisma.proyek.update({ where: { id: proyekId }, data: { persentase_progres: progres, potensi_pendapatan_sisa: sisa } });
  return { sebelum: p.persentase_progres, progres, sisa, proyek: p };
}

// Total nilai proyek ditangani = jumlah nilai kontrak proyek unik di mana pegawai menjadi PM atau inspektor.
async function recomputePegawai(prisma) {
  const list = await prisma.pegawai.findMany({ include: { proyek_pm: true, tugas: { include: { proyek: true } } } });
  for (const g of list) {
    const m = new Map();
    g.proyek_pm.forEach((p) => m.set(p.id, p.nilai_kontrak));
    g.tugas.forEach((t) => m.set(t.proyek.id, t.proyek.nilai_kontrak));
    const total = [...m.values()].reduce((a, b) => a + b, 0n);
    await prisma.pegawai.update({ where: { id: g.id }, data: { total_nilai_proyek_ditangani: total } });
  }
}

// Format: BKI-TIC/L{layanan}/S{sektor}/{tahun}/{urut}
async function nomorSertifikat(prisma, layananId, sektorId, tanggal) {
  const urut = (await prisma.tugasOperasional.count({ where: { nomor_sertifikat_tic: { not: null } } })) + 1;
  const pad = (n, w) => String(n).padStart(w, '0');
  return `BKI-TIC/L${pad(layananId, 2)}/S${pad(sektorId, 2)}/${tanggal.getFullYear()}/${pad(urut, 4)}`;
}

module.exports = { recomputeProyek, recomputePegawai, nomorSertifikat };
