import Link from 'next/link';
import { Award, Filter } from 'lucide-react';
import { prisma } from '@/lib/db';
import { tgl } from '@/lib/fmt';
import { PageHeader, Badge, Empty } from '@/components/ui';

// Konsolidasi penerbitan sertifikat TIC untuk seluruh 10 layanan & 20 sektor dalam satu tampilan.
export default async function SertifikatPage({ searchParams }: { searchParams: { layanan?: string; sektor?: string } }) {
  const layananId = Number(searchParams.layanan) || undefined;
  const sektorId = Number(searchParams.sektor) || undefined;
  const [certs, layanan, sektor] = await Promise.all([
    prisma.tugasOperasional.findMany({
      where: { nomor_sertifikat_tic: { not: null }, proyek: { potensi: { layanan_id: layananId, sektor_id: sektorId } } },
      include: { inspektor: true, proyek: { include: { unit_utama: true, potensi: { include: { layanan: true, sektor: true } } } } },
      orderBy: { nomor_sertifikat_tic: 'desc' },
    }),
    prisma.layanan.findMany({ orderBy: { id: 'asc' } }),
    prisma.sektor.findMany({ orderBy: { id: 'asc' } }),
  ]);

  return (
    <>
      <PageHeader title="Konsolidasi Sertifikat TIC" sub="Sertifikat terbit otomatis saat tugas/call out di SIKOM berstatus Selesai — satu tampilan untuk 10 layanan × 20 sektor." />
      <form className="card mb-5 flex flex-wrap items-end gap-3 p-4">
        <div><label className="label">Layanan</label><select name="layanan" defaultValue={searchParams.layanan ?? ''} className="input w-64"><option value="">Semua layanan</option>{layanan.map((l) => <option key={l.id} value={l.id}>{l.nama_layanan}</option>)}</select></div>
        <div><label className="label">Sektor</label><select name="sektor" defaultValue={searchParams.sektor ?? ''} className="input w-64"><option value="">Semua sektor</option>{sektor.map((s) => <option key={s.id} value={s.id}>{s.nama_sektor}</option>)}</select></div>
        <button className="btn-primary"><Filter size={14} /> Terapkan</button>
        <Link href="/sikom/sertifikat" className="btn">Reset</Link>
        <span className="ml-auto text-sm text-slate-500">{certs.length} sertifikat</span>
      </form>
      {certs.length === 0 ? <Empty>Tidak ada sertifikat untuk filter ini.</Empty> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {certs.map((c) => (
            <div key={c.id} className="card overflow-hidden">
              <div className="flex items-center gap-2 bg-navy px-4 py-2.5 text-white"><Award size={16} className="text-gold" /><span className="font-mono text-xs">{c.nomor_sertifikat_tic}</span></div>
              <div className="space-y-1.5 p-4 text-sm">
                <div className="font-semibold text-navy">{c.nama_tugas}</div>
                <div className="flex flex-wrap gap-1.5"><Badge tone="gold">{c.proyek.potensi.layanan.nama_layanan}</Badge><Badge tone="slate">{c.proyek.potensi.sektor.nama_sektor}</Badge></div>
                <div className="text-xs text-slate-500">Klien: {c.proyek.klien}</div>
                <div className="text-xs text-slate-500">Proyek: {c.proyek.kode_proyek} · {c.proyek.unit_utama.nama_unit}</div>
                <div className="text-xs text-slate-500">Inspektor: {c.inspektor.nama} · Pelaksanaan s/d {tgl(c.tanggal_selesai)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
