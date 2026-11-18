import Link from 'next/link';
import { ChevronRight, Wrench } from 'lucide-react';
import { prisma } from '@/lib/db';
import { tgl } from '@/lib/fmt';
import { PageHeader, Badge, Progress } from '@/components/ui';

// SIKOM: zero money input — tidak menampilkan/menerima nominal uang.
export default async function SikomPage() {
  const [proyek, alat] = await Promise.all([
    prisma.proyek.findMany({ include: { unit_utama: true, pm: true, tugas: true, potensi: { include: { layanan: true } } }, orderBy: { id: 'desc' } }),
    prisma.alatKerja.findMany({ include: { tugas: { where: { status: { not: 'Selesai' } }, include: { proyek: true } } } }),
  ]);

  return (
    <>
      <PageHeader title="SIKOM — Penjadwalan & Call Out" sub="Modul operasional lapangan (tanpa input uang). Proyek otomatis masuk dari AP saat potensi menang kontrak." />

      <div className="card mb-6 overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>Proyek</th><th>Unit · PM</th><th>Layanan</th><th>Kontrak</th><th>Timeline</th><th className="w-52">Progres</th><th>Tugas</th><th /></tr></thead>
          <tbody>
            {proyek.map((p) => (
              <tr key={p.id}>
                <td><div className="text-xs text-slate-400">{p.kode_proyek}</div><div className="font-medium">{p.nama_proyek}</div><div className="text-xs text-slate-500">{p.klien}</div></td>
                <td className="text-xs">{p.unit_utama.nama_unit}<div className="text-slate-500">PM: {p.pm.nama}</div></td>
                <td className="text-xs">{p.potensi.layanan.nama_layanan}</td>
                <td><Badge tone="slate">{p.jenis_kontrak}</Badge></td>
                <td className="whitespace-nowrap text-xs">{tgl(p.tanggal_mulai)}<div className="text-slate-400">s/d {tgl(p.tanggal_selesai)}</div></td>
                <td><Progress value={p.persentase_progres} /></td>
                <td className="text-xs">
                  {p.tugas.filter((t) => t.status === 'Selesai').length}/{p.tugas.length} selesai
                  {p.jenis_kontrak === 'Blanket' && <div className="text-slate-400">{p.tugas.length} Call Out</div>}
                </td>
                <td><Link href={`/sikom/${p.id}`} className="btn">Kelola <ChevronRight size={14} /></Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mb-3 flex items-center gap-2 font-semibold text-navy"><Wrench size={16} /> Status Alat Kerja TIC</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {alat.map((a) => (
          <div key={a.id} className="card p-4">
            <div className="flex items-center justify-between"><span className="font-mono text-sm font-bold text-navy">{a.kode_aset}</span><Badge>{a.status}</Badge></div>
            <div className="mt-1 text-sm">{a.nama_alat}</div>
            {a.tugas.map((t) => (
              <div key={t.id} className="mt-2 rounded bg-slate-50 p-2 text-[11px] text-slate-600">
                {t.proyek.kode_proyek}: {tgl(t.tanggal_mulai)} – {tgl(t.tanggal_selesai)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
