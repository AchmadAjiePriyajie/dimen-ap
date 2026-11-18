import Link from 'next/link';
import { Target, TrendingUp, Wallet, PlugZap, ArrowRight } from 'lucide-react';
import { prisma } from '@/lib/db';
import { rpShort, tgl } from '@/lib/fmt';
import { PageHeader, Stat, Badge } from '@/components/ui';

const OPEN = ['Draft', 'Menunggu Approval Kacab', 'Disetujui / Siap Tender'];

export default async function Dashboard() {
  const [units, proyek, potensi, logs] = await Promise.all([
    prisma.unitKerja.findMany({ orderBy: { id: 'asc' } }),
    prisma.proyek.findMany({ include: { sos: true, potensi: { include: { sektor: true } } } }),
    prisma.potensiProyek.findMany({ include: { sektor: true } }),
    prisma.erpLog.findMany({ orderBy: { id: 'desc' }, take: 5 }),
  ]);

  const target = units.reduce((s, u) => s + u.target_rkap, 0n);
  const realisasi = proyek.reduce((s, p) => s + p.nilai_kontrak, 0n);
  const openPot = potensi.filter((p) => OPEN.includes(p.status));
  const totalPotensi = openPot.reduce((s, p) => s + p.estimasi_nilai, 0n);
  const sisa = proyek.reduce((s, p) => s + p.potensi_pendapatan_sisa, 0n);
  const pct = (a: bigint, b: bigint) => (b ? Number((a * 1000n) / b) / 10 : 0);

  // Kontribusi per unit memperhitungkan Statement of Share yang sudah disetujui mitra
  const kontrib = new Map<number, bigint>(units.map((u) => [u.id, 0n]));
  for (const p of proyek) {
    const sos = p.sos.find((s) => s.status_persetujuan === 'Disetujui Mitra');
    if (sos) {
      kontrib.set(sos.unit_utama_id, kontrib.get(sos.unit_utama_id)! + (p.nilai_kontrak * BigInt(sos.porsi_utama_persen)) / 100n);
      kontrib.set(sos.unit_mitra_id, kontrib.get(sos.unit_mitra_id)! + (p.nilai_kontrak * BigInt(sos.porsi_mitra_persen)) / 100n);
    } else kontrib.set(p.unit_utama_id, kontrib.get(p.unit_utama_id)! + p.nilai_kontrak);
  }
  const pipeline = new Map<number, bigint>(units.map((u) => [u.id, 0n]));
  openPot.forEach((p) => pipeline.set(p.unit_id, pipeline.get(p.unit_id)! + p.estimasi_nilai));
  const maxUnit = Number(units.reduce((m, u) => (u.target_rkap > m ? u.target_rkap : m), 0n));

  // Sebaran per sektor (proyek + potensi aktif)
  const sektor = new Map<string, { proyek: number; potensi: number }>();
  potensi.filter((p) => p.status !== 'Gugur').forEach((p) => {
    const e = sektor.get(p.sektor.nama_sektor) ?? { proyek: 0, potensi: 0 };
    p.status === 'Menang / Jadi Proyek' ? e.proyek++ : e.potensi++;
    sektor.set(p.sektor.nama_sektor, e);
  });
  const maxSektor = Math.max(1, ...[...sektor.values()].map((e) => e.proyek + e.potensi));

  return (
    <>
      <PageHeader title="Dashboard Eksekutif" sub="Konsolidasi seluruh unit — Target RKAP Komersial vs realisasi kontrak, potensi & integrasi ERP." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Target RKAP vs Realisasi"
          icon={<Target size={18} />}
          value={rpShort(realisasi)}
          sub={
            <>
              dari target {rpShort(target)} · <b className="text-navy">{pct(realisasi, target)}%</b>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full bg-gold" style={{ width: `${Math.min(100, pct(realisasi, target))}%` }} />
              </div>
            </>
          }
        />
        <Stat label="Total Potensi Proyek" icon={<TrendingUp size={18} />} value={rpShort(totalPotensi)} sub={`${openPot.length} peluang sebelum kontrak`} />
        <Stat label="Potensi Pendapatan" icon={<Wallet size={18} />} value={rpShort(sisa)} sub={`Sisa nilai ${proyek.length} proyek terkontrak yang belum dikerjakan`} />
        <Stat
          label="Status Integrasi ERP"
          icon={<PlugZap size={18} />}
          value={<Badge tone="green">● Terhubung SAP / Oracle ERP</Badge>}
          sub={logs[0] ? `Transaksi terakhir: ${logs[0].sumber} → ${logs[0].tujuan} · ${logs[0].event}` : 'Belum ada transaksi'}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-5">
        <div className="card p-5 xl:col-span-3">
          <h2 className="font-semibold text-navy">Kontribusi Pendapatan per Unit</h2>
          <p className="mb-4 text-xs text-slate-500">Nilai kontrak (setelah bagi hasil SOS) dan pipeline potensi terhadap target RKAP unit.</p>
          <div className="space-y-4">
            {units.map((u) => {
              const k = Number(kontrib.get(u.id));
              const pl = Number(pipeline.get(u.id));
              return (
                <div key={u.id}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium">
                      {u.nama_unit} <span className="text-xs text-slate-400">({u.tipe})</span>
                    </span>
                    <span className="tabular-nums text-slate-600">
                      {rpShort(k)} / {rpShort(u.target_rkap)}
                    </span>
                  </div>
                  <div className="relative h-5 overflow-hidden rounded bg-slate-100" style={{ width: `${(Number(u.target_rkap) / maxUnit) * 100}%` }}>
                    <div className="absolute inset-y-0 left-0 bg-navy" style={{ width: `${(k / Number(u.target_rkap)) * 100}%` }} />
                    <div
                      className="absolute inset-y-0 bg-gold/60"
                      style={{ left: `${(k / Number(u.target_rkap)) * 100}%`, width: `${(pl / Number(u.target_rkap)) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-sm bg-navy" /> Realisasi kontrak</span>
            <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-sm bg-gold/60" /> Pipeline potensi</span>
            <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-sm bg-slate-100 ring-1 ring-slate-200" /> Target RKAP</span>
          </div>
        </div>

        <div className="card p-5 xl:col-span-2">
          <h2 className="font-semibold text-navy">Sebaran per Sektor</h2>
          <p className="mb-4 text-xs text-slate-500">Jumlah proyek & potensi aktif per sektor BKI.</p>
          <div className="space-y-3">
            {[...sektor.entries()]
              .sort((a, b) => b[1].proyek + b[1].potensi - (a[1].proyek + a[1].potensi))
              .map(([nama, e]) => (
                <div key={nama} className="flex items-center gap-3 text-sm">
                  <span className="w-40 shrink-0 truncate" title={nama}>{nama}</span>
                  <div className="flex h-4 flex-1 overflow-hidden rounded bg-slate-100">
                    <div className="bg-navy" style={{ width: `${(e.proyek / maxSektor) * 100}%` }} />
                    <div className="bg-gold" style={{ width: `${(e.potensi / maxSektor) * 100}%` }} />
                  </div>
                  <span className="w-16 text-right text-xs text-slate-500">{e.proyek} prj · {e.potensi} pot</span>
                </div>
              ))}
          </div>
          <div className="mt-4 flex gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-sm bg-navy" /> Proyek</span>
            <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-sm bg-gold" /> Potensi</span>
          </div>
        </div>
      </div>

      <div className="card mt-5 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-navy">Aktivitas Integrasi Terakhir</h2>
          <Link href="/erp-log" className="flex items-center gap-1 text-sm text-navy-light hover:underline">
            Lihat log <ArrowRight size={14} />
          </Link>
        </div>
        <ul className="divide-y divide-slate-100 text-sm">
          {logs.map((l) => (
            <li key={l.id} className="flex items-center justify-between py-2">
              <span>
                <Badge tone="gold">{l.sumber} → {l.tujuan}</Badge> <span className="ml-2">{l.event}</span>
              </span>
              <span className="text-xs text-slate-400">{tgl(l.created_at)}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
