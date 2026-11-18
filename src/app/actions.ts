'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import { DOC_STEPS, DOC_APPROVED, type Role } from '@/lib/flow';
import { erpLog, erpName } from '@/lib/erp';
import { recomputeProyek, recomputePegawai, nomorSertifikat } from '@/lib/sync';

function need(...roles: Role[]) {
  const { role } = getSession();
  if (!roles.includes(role)) throw new Error(`Aksi ini memerlukan peran: ${roles.join(' / ')}`);
}

const money = (v: FormDataEntryValue | null) => {
  const n = BigInt(String(v ?? '0').replace(/[^\d]/g, '') || '0');
  if (n <= 0n) throw new Error('Nominal harus lebih dari 0');
  return n;
};

const refresh = () => revalidatePath('/', 'layout');

// ---------- Role & Unit switcher ----------
export async function setSession(role: string, unitId: number) {
  const c = cookies();
  c.set('role', role, { path: '/' });
  c.set('unit', String(unitId), { path: '/' });
  refresh();
}

// ---------- AP: Potensi Proyek ----------
export async function createPotensi(fd: FormData) {
  need('OPERASIONAL', 'COE', 'PUSAT');
  const n = (await prisma.potensiProyek.count()) + 1;
  const nama = String(fd.get('nama_potensi') || '').trim();
  const klien = String(fd.get('klien') || '').trim();
  if (!nama || !klien) throw new Error('Nama potensi & klien wajib diisi');
  await prisma.potensiProyek.create({
    data: {
      kode_potensi: `POT-${new Date().getFullYear()}-${String(n).padStart(3, '0')}`,
      nama_potensi: nama,
      klien,
      unit_id: Number(fd.get('unit_id')),
      layanan_id: Number(fd.get('layanan_id')),
      sektor_id: Number(fd.get('sektor_id')),
      estimasi_nilai: money(fd.get('estimasi_nilai')),
      estimasi_biaya_operasi: money(fd.get('estimasi_biaya_operasi')),
      jalur_akuisisi: fd.get('jalur_akuisisi') === 'Tender' ? 'Tender' : 'Surat Penawaran',
      status: 'Draft',
    },
  });
  refresh();
}

export async function ajukanPotensi(id: number) {
  need('OPERASIONAL', 'COE');
  const p = await prisma.potensiProyek.findUniqueOrThrow({ where: { id } });
  if (p.status !== 'Draft') return;
  // Surat Penawaran wajib approval Kacab; Tender langsung siap tender.
  const status = p.jalur_akuisisi === 'Surat Penawaran' ? 'Menunggu Approval Kacab' : 'Disetujui / Siap Tender';
  await prisma.potensiProyek.update({ where: { id }, data: { status } });
  refresh();
}

export async function approvePotensi(id: number) {
  need('OPERASIONAL');
  await prisma.potensiProyek.updateMany({ where: { id, status: 'Menunggu Approval Kacab' }, data: { status: 'Disetujui / Siap Tender' } });
  refresh();
}

export async function gugurPotensi(id: number) {
  need('OPERASIONAL', 'PUSAT');
  await prisma.potensiProyek.updateMany({ where: { id, status: { not: 'Menang / Jadi Proyek' } }, data: { status: 'Gugur' } });
  refresh();
}

export async function konversiPotensi(id: number, fd: FormData) {
  need('OPERASIONAL', 'PUSAT');
  const p = await prisma.potensiProyek.findUniqueOrThrow({ where: { id }, include: { unit: true } });
  if (p.status !== 'Disetujui / Siap Tender') throw new Error('Potensi belum disetujui / siap tender');
  const nilai = money(fd.get('nilai_kontrak'));
  const mulai = new Date(String(fd.get('tanggal_mulai')) + 'T00:00:00Z');
  const selesai = new Date(String(fd.get('tanggal_selesai')) + 'T00:00:00Z');
  if (!(selesai > mulai)) throw new Error('Tanggal selesai harus setelah tanggal mulai');
  const n = (await prisma.proyek.count()) + 1;
  const kode = `PRJ-${mulai.getUTCFullYear()}-${String(n).padStart(3, '0')}`;
  const statusErp = fd.get('erp') === 'Oracle' ? 'Synced to Oracle' : 'Synced to SAP';

  const proyek = await prisma.$transaction(async (tx) => {
    await tx.potensiProyek.update({ where: { id }, data: { status: 'Menang / Jadi Proyek' } });
    return tx.proyek.create({
      data: {
        kode_proyek: kode,
        potensi_id: id,
        nama_proyek: p.nama_potensi,
        klien: p.klien,
        unit_utama_id: p.unit_id,
        pm_id: Number(fd.get('pm_id')),
        jenis_kontrak: fd.get('jenis_kontrak') === 'Blanket' ? 'Blanket' : 'Lump Sum',
        nilai_kontrak: nilai,
        potensi_pendapatan_sisa: nilai,
        status_erp: statusErp,
        tanggal_mulai: mulai,
        tanggal_selesai: selesai,
      },
      include: { pm: true },
    });
  });

  await erpLog('AP', 'SIKOM', 'Project Created', {
    kode_proyek: kode, kode_potensi: p.kode_potensi, nama_proyek: p.nama_potensi, jenis_kontrak: proyek.jenis_kontrak,
    pm: proyek.pm.nama, tanggal_mulai: fd.get('tanggal_mulai'), tanggal_selesai: fd.get('tanggal_selesai'),
  });
  await erpLog('AP', erpName(statusErp), 'Project / WBS Created', {
    project_number: kode, customer: p.klien, contract_value: nilai, profit_center: p.unit.nama_unit,
  });
  await recomputePegawai(prisma);
  refresh();
}

// ---------- AP: Dokumen Keuangan ----------
export async function createDokumen(proyekId: number, jenis: string, fd: FormData) {
  need('OPERASIONAL', 'COE');
  const proyek = await prisma.proyek.findUniqueOrThrow({ where: { id: proyekId } });
  const n = (await prisma.dokumenKeuangan.count({ where: { proyek_id: proyekId, jenis_dokumen: jenis } })) + 1;
  await prisma.dokumenKeuangan.create({
    data: {
      proyek_id: proyekId,
      jenis_dokumen: jenis,
      nomor_dokumen: `${jenis}/${proyek.kode_proyek}/${String(n).padStart(2, '0')}`,
      nominal: money(fd.get('nominal')),
      keterangan: String(fd.get('keterangan') || '-'),
      status_lpj: jenis === 'Dropping' ? 'Belum LPJ' : null,
    },
  });
  refresh();
}

export async function advanceDokumen(id: number) {
  const doc = await prisma.dokumenKeuangan.findUniqueOrThrow({ where: { id }, include: { proyek: true } });
  const idx = DOC_STEPS.findIndex((s) => s.status === doc.status_approval);
  let next: string;
  if (doc.status_approval === 'Draft' || doc.status_approval === 'Ditolak') {
    need('OPERASIONAL', 'COE');
    next = DOC_STEPS[0].status;
  } else if (idx >= 0) {
    need(DOC_STEPS[idx].role as Role);
    next = DOC_STEPS[idx + 1]?.status ?? DOC_APPROVED;
  } else return;

  await prisma.dokumenKeuangan.update({ where: { id }, data: { status_approval: next, synced_to_erp: next === DOC_APPROVED } });
  if (next === DOC_APPROVED) {
    await erpLog('AP', erpName(doc.proyek.status_erp), `${doc.jenis_dokumen} Approved`, {
      nomor_dokumen: doc.nomor_dokumen, kode_proyek: doc.proyek.kode_proyek, jenis: doc.jenis_dokumen, nominal: doc.nominal,
      gl_posting: doc.jenis_dokumen === 'Invoice' ? 'Piutang Usaha' : doc.jenis_dokumen === 'PAD' ? 'Pendapatan Akan Diterima' : doc.jenis_dokumen === 'BDD' ? 'Biaya Dibayar di Muka' : 'Budget / Uang Muka Kerja',
    });
  }
  refresh();
}

export async function rejectDokumen(id: number) {
  const doc = await prisma.dokumenKeuangan.findUniqueOrThrow({ where: { id } });
  const step = DOC_STEPS.find((s) => s.status === doc.status_approval);
  if (!step) return;
  need(step.role as Role);
  await prisma.dokumenKeuangan.update({ where: { id }, data: { status_approval: 'Ditolak' } });
  refresh();
}

export async function toggleLpj(id: number) {
  need('OPERASIONAL', 'LAPANGAN');
  const doc = await prisma.dokumenKeuangan.findUniqueOrThrow({ where: { id }, include: { proyek: true } });
  if (doc.jenis_dokumen !== 'Dropping') return;
  const lpj = doc.status_lpj === 'Sudah LPJ' ? 'Belum LPJ' : 'Sudah LPJ';
  await prisma.dokumenKeuangan.update({ where: { id }, data: { status_lpj: lpj } });
  await erpLog('AP', erpName(doc.proyek.status_erp), `Dropping LPJ: ${lpj}`, { nomor_dokumen: doc.nomor_dokumen, nominal: doc.nominal, status_lpj: lpj });
  refresh();
}

// ---------- AP: Statement of Share ----------
export async function createSos(proyekId: number, fd: FormData) {
  need('OPERASIONAL');
  const proyek = await prisma.proyek.findUniqueOrThrow({ where: { id: proyekId } });
  const utama = Math.round(Number(fd.get('porsi_utama_persen')));
  const mitraId = Number(fd.get('unit_mitra_id'));
  if (!(utama > 0 && utama < 100)) throw new Error('Porsi utama harus antara 1-99%');
  if (mitraId === proyek.unit_utama_id) throw new Error('Unit mitra harus berbeda dari unit utama');
  await prisma.statementOfShare.create({
    data: {
      proyek_id: proyekId, unit_utama_id: proyek.unit_utama_id, unit_mitra_id: mitraId,
      porsi_utama_persen: utama, porsi_mitra_persen: 100 - utama,
      tahap_kesepakatan: fd.get('tahap_kesepakatan') === 'Tengah Proyek' ? 'Tengah Proyek' : 'Awal Potensi',
    },
  });
  refresh();
}

export async function respondSos(id: number, setuju: boolean) {
  need('OPERASIONAL');
  const { unitId } = getSession();
  const sos = await prisma.statementOfShare.findUniqueOrThrow({ where: { id }, include: { proyek: true, unit_utama: true, unit_mitra: true } });
  if (sos.unit_mitra_id !== unitId) throw new Error('Hanya cabang mitra yang dapat merespons SOS ini');
  const status = setuju ? 'Disetujui Mitra' : 'Revisi';
  await prisma.statementOfShare.update({ where: { id }, data: { status_persetujuan: status } });
  if (setuju) {
    await erpLog('AP', erpName(sos.proyek.status_erp), 'Statement of Share Approved', {
      kode_proyek: sos.proyek.kode_proyek,
      unit_utama: { unit: sos.unit_utama.nama_unit, porsi: sos.porsi_utama_persen, pendapatan: (sos.proyek.nilai_kontrak * BigInt(sos.porsi_utama_persen)) / 100n },
      unit_mitra: { unit: sos.unit_mitra.nama_unit, porsi: sos.porsi_mitra_persen, pendapatan: (sos.proyek.nilai_kontrak * BigInt(sos.porsi_mitra_persen)) / 100n },
    });
  }
  refresh();
}

// ---------- SIKOM: Penugasan & deteksi bentrok ----------
export async function cekBentrok(input: { mulai: string; selesai: string; alatId?: number | null; inspektorId?: number | null; excludeId?: number }) {
  const warnings: string[] = [];
  if (!input.mulai || !input.selesai) return warnings;
  const start = new Date(input.mulai + 'T00:00:00Z');
  const end = new Date(input.selesai + 'T00:00:00Z');
  if (input.alatId) {
    const alat = await prisma.alatKerja.findUnique({ where: { id: input.alatId } });
    if (alat?.status === 'Kalibrasi') warnings.push(`Peringatan: Alat ${alat.kode_aset} sedang dalam status Kalibrasi dan belum dapat digunakan.`);
  }
  const or = [input.alatId ? { alat_id: input.alatId } : null, input.inspektorId ? { inspektor_id: input.inspektorId } : null].filter(Boolean);
  if (!or.length) return warnings;
  const hits = await prisma.tugasOperasional.findMany({
    where: { id: input.excludeId ? { not: input.excludeId } : undefined, status: { not: 'Selesai' }, tanggal_mulai: { lte: end }, tanggal_selesai: { gte: start }, OR: or },
    include: { alat: true, inspektor: true, proyek: { include: { unit_utama: true } } },
  });
  const f = (d: Date) => d.toISOString().slice(0, 10);
  for (const t of hits) {
    const where = `di Proyek ${t.proyek.kode_proyek} (${t.proyek.unit_utama.nama_unit}) pada ${f(t.tanggal_mulai)} s/d ${f(t.tanggal_selesai)}`;
    if (input.alatId && t.alat_id === input.alatId) warnings.push(`Peringatan: Alat ${t.alat!.kode_aset} sedang digunakan ${where}.`);
    if (input.inspektorId && t.inspektor_id === input.inspektorId) warnings.push(`Peringatan: Inspektor ${t.inspektor.nama} sudah terjadwal ${where}.`);
  }
  return warnings;
}

export type TugasState = { error?: string; warnings?: string[]; ok?: boolean };

export async function createTugas(proyekId: number, _prev: TugasState, fd: FormData): Promise<TugasState> {
  try {
    need('LAPANGAN', 'OPERASIONAL');
  } catch (e) {
    return { error: (e as Error).message };
  }
  const nama = String(fd.get('nama_tugas') || '').trim();
  const mulai = String(fd.get('tanggal_mulai') || '');
  const selesai = String(fd.get('tanggal_selesai') || '');
  const bobot = Number(fd.get('bobot_progres'));
  const inspektorId = Number(fd.get('inspektor_id'));
  const alatId = Number(fd.get('alat_id')) || null;
  if (!nama || !mulai || !selesai || !inspektorId) return { error: 'Nama tugas, inspektor, dan tanggal wajib diisi.' };
  if (selesai < mulai) return { error: 'Tanggal selesai harus setelah tanggal mulai.' };
  const sisaBobot = 100 - (await prisma.tugasOperasional.aggregate({ where: { proyek_id: proyekId }, _sum: { bobot_progres: true } }))._sum.bobot_progres!;
  if (!(bobot > 0 && bobot <= sisaBobot)) return { error: `Bobot progres harus 1-${sisaBobot}% (sisa bobot proyek).` };

  const warnings = await cekBentrok({ mulai, selesai, alatId, inspektorId });
  if (warnings.length && fd.get('override') !== 'on') return { warnings, error: 'Jadwal bentrok. Centang "Tetap jadwalkan" untuk melanjutkan.' };

  await prisma.tugasOperasional.create({
    data: { proyek_id: proyekId, nama_tugas: nama, inspektor_id: inspektorId, alat_id: alatId, tanggal_mulai: new Date(mulai + 'T00:00:00Z'), tanggal_selesai: new Date(selesai + 'T00:00:00Z'), bobot_progres: bobot },
  });
  await recomputePegawai(prisma);
  refresh();
  return { ok: true };
}

export async function setStatusTugas(id: number, status: 'To Do' | 'In Progress' | 'Selesai') {
  need('LAPANGAN', 'OPERASIONAL');
  const t = await prisma.tugasOperasional.findUniqueOrThrow({ where: { id }, include: { proyek: { include: { potensi: true } } } });
  if (t.status === status) return;
  const cert = status === 'Selesai' && !t.nomor_sertifikat_tic
    ? await nomorSertifikat(prisma, t.proyek.potensi.layanan_id, t.proyek.potensi.sektor_id, new Date())
    : t.nomor_sertifikat_tic;
  await prisma.tugasOperasional.update({ where: { id }, data: { status, nomor_sertifikat_tic: status === 'Selesai' ? cert : t.nomor_sertifikat_tic } });
  if (t.alat_id) await prisma.alatKerja.update({ where: { id: t.alat_id }, data: { status: status === 'In Progress' ? 'Digunakan' : 'Tersedia' } });

  const r = await recomputeProyek(prisma, t.proyek_id);
  if (r.progres !== r.sebelum) {
    await erpLog('SIKOM', 'AP', `Progress Updated to ${r.progres}%`, {
      kode_proyek: t.proyek.kode_proyek, tugas: t.nama_tugas, status_tugas: status, progres_sebelum: r.sebelum, progres: r.progres, potensi_pendapatan_sisa: r.sisa,
    });
  }
  if (status === 'Selesai') await erpLog('SIKOM', 'AP', 'Sertifikat TIC Issued', { nomor_sertifikat: cert, kode_proyek: t.proyek.kode_proyek, tugas: t.nama_tugas });
  refresh();
}
