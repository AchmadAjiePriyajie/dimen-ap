import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Eye, Play, CheckCircle2, RotateCcw, Award } from 'lucide-react';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import { rp, tgl } from '@/lib/fmt';
import { PageHeader, Badge, Progress, Empty } from '@/components/ui';
import TugasForm from '@/components/TugasForm';
import { setStatusTugas } from '../../actions';

export default async function SikomProyek({ params }: { params: { id: string } }) {
  const { role } = getSession();
  const p = await prisma.proyek.findUnique({
    where: { id: Number(params.id) },
    include: {
      unit_utama: true, pm: true,
      potensi: { include: { layanan: true, sektor: true } },
      tugas: { include: { inspektor: true, alat: true }, orderBy: { tanggal_mulai: 'asc' } },
      dokumen: { where: { jenis_dokumen: 'RAB' } },
    },
  });
  if (!p) notFound();
  const [inspektor, alat] = await Promise.all([
    prisma.pegawai.findMany({ where: { jabatan: { in: ['Inspektor', 'PM'] } }, include: { unit: true }, orderBy: [{ jabatan: 'asc' }, { id: 'asc' }] }),
    prisma.alatKerja.findMany(),
  ]);
  const canEdit = role === 'LAPANGAN' || role === 'OPERASIONAL';
  const blanket = p.jenis_kontrak === 'Blanket';
  const sisaBobot = 100 - p.tugas.reduce((s, t) => s + t.bobot_progres, 0);

  // Timeline (Gantt sederhana) dari tanggal awal hingga akhir seluruh tugas/proyek
  const t0 = Math.min(p.tanggal_mulai.getTime(), ...p.tugas.map((t) => t.tanggal_mulai.getTime()));
  const t1 = Math.max(p.tanggal_selesai.getTime(), ...p.tugas.map((t) => t.tanggal_selesai.getTime()));
  const pos = (d: Date) => ((d.getTime() - t0) / (t1 - t0)) * 100;
  const now = Date.now();

  return (
    <>
      <Link href="/sikom" className="mb-3 inline-flex items-center gap-1 text-sm text-navy-light hover:underline"><ArrowLeft size={14} /> Kembali ke SIKOM</Link>
      <PageHeader title={p.nama_proyek} sub={`${p.kode_proyek} · ${p.klien} · ${p.unit_utama.nama_unit} · PM ${p.pm.nama}`}>
        <details className="relative">
          <summary className="btn list-none"><Eye size={14} /> Lihat Ringkasan RAB (dari AP)</summary>
          <div className="card absolute right-0 z-20 mt-2 w-96 p-4 shadow-xl">
            <div className="mb-2 text-xs font-semibold uppercase text-slate-500">Read-only · sumber: Modul AP</div>
            {p.dokumen.length === 0 ? <p className="text-sm text-slate-500">Belum ada RAB.</p> : p.dokumen.map((d) => (
              <div key={d.id} className="flex items-center justify-between border-b border-slate-100 py-2 text-sm last:border-0">
                <span className="font-mono text-xs">{d.nomor_dokumen}</span>
                <span className="text-right"><b className="tabular-nums">{rp(d.nominal)}</b><br /><Badge>{d.status_approval}</Badge></span>
              </div>
            ))}
          </div>
        </details>
      </PageHeader>

      <div className="card mb-5 grid gap-4 p-5 sm:grid-cols-4">
        <div><div className="label">Kontrak</div><Badge tone="slate">{p.jenis_kontrak}</Badge></div>
        <div><div className="label">Layanan · Sektor</div><div className="text-sm">{p.potensi.layanan.nama_layanan}</div><div className="text-xs text-slate-500">{p.potensi.sektor.nama_sektor}</div></div>
        <div><div className="label">Periode</div><div className="text-sm">{tgl(p.tanggal_mulai)} – {tgl(p.tanggal_selesai)}</div></div>
        <div><div className="label">Progres Proyek</div><Progress value={p.persentase_progres} className="mt-2" /><div className="mt-1 text-[11px] text-slate-400">Tersinkron otomatis ke AP</div></div>
      </div>

      <div className="card mb-5 p-5">
        <h2 className="mb-4 font-semibold text-navy">Timeline {blanket ? 'Call Out' : 'Pekerjaan'}</h2>
        {p.tugas.length === 0 ? <Empty>Belum ada tugas.</Empty> : (
          <div className="relative space-y-2">
            {now >= t0 && now <= t1 && <div className="absolute inset-y-0 z-10 w-px bg-red-500" style={{ left: `calc(14rem + (100% - 14rem) * ${pos(new Date(now)) / 100})` }} title="Hari ini" />}
            {p.tugas.map((t) => (
              <div key={t.id} className="flex items-center gap-3 text-xs">
                <div className="w-56 shrink-0 truncate" title={t.nama_tugas}>{t.nama_tugas}</div>
                <div className="relative h-6 flex-1 rounded bg-slate-100">
                  <div
                    className={`absolute inset-y-0 flex items-center rounded px-2 text-[10px] font-medium text-white ${t.status === 'Selesai' ? 'bg-emerald-600' : t.status === 'In Progress' ? 'bg-amber-500' : 'bg-slate-400'}`}
                    style={{ left: `${pos(t.tanggal_mulai)}%`, width: `${Math.max(2, pos(t.tanggal_selesai) - pos(t.tanggal_mulai))}%` }}
                  >
                    <span className="truncate">{t.bobot_progres}%</span>
                  </div>
                </div>
              </div>
            ))}
            <div className="flex justify-between pl-[14.75rem] text-[10px] text-slate-400"><span>{tgl(new Date(t0))}</span><span>{tgl(new Date(t1))}</span></div>
          </div>
        )}
      </div>

      <div className="card mb-5 overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>{blanket ? 'Call Out' : 'Tugas'}</th><th>Inspektor</th><th>Alat</th><th>Jadwal</th><th>Bobot</th><th>Status</th><th>Sertifikat TIC</th><th>Update Progres</th></tr></thead>
          <tbody>
            {p.tugas.map((t) => (
              <tr key={t.id}>
                <td className="font-medium">{t.nama_tugas}</td>
                <td className="text-xs">{t.inspektor.nama}</td>
                <td className="text-xs">{t.alat ? <span className="font-mono">{t.alat.kode_aset}</span> : '—'}</td>
                <td className="whitespace-nowrap text-xs">{tgl(t.tanggal_mulai)}<div className="text-slate-400">s/d {tgl(t.tanggal_selesai)}</div></td>
                <td className="tabular-nums">{t.bobot_progres}%</td>
                <td><Badge>{t.status}</Badge></td>
                <td className="font-mono text-[11px]">{t.nomor_sertifikat_tic ? <span className="flex items-center gap-1 text-emerald-700"><Award size={12} />{t.nomor_sertifikat_tic}</span> : '—'}</td>
                <td className="whitespace-nowrap">
                  <div className="flex gap-1">
                    {t.status === 'To Do' && <form action={setStatusTugas.bind(null, t.id, 'In Progress')}><button className="btn" disabled={!canEdit}><Play size={13} /> Mulai</button></form>}
                    {t.status === 'In Progress' && <form action={setStatusTugas.bind(null, t.id, 'Selesai')}><button className="btn-primary" disabled={!canEdit}><CheckCircle2 size={13} /> Selesai & Terbitkan Sertifikat</button></form>}
                    {t.status === 'Selesai' && <form action={setStatusTugas.bind(null, t.id, 'In Progress')}><button className="btn" disabled={!canEdit} title="Buka kembali"><RotateCcw size={13} /></button></form>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card p-5">
        <h2 className="mb-1 font-semibold text-navy">{blanket ? 'Tambah Call Out (Pecah Pekerjaan Blanket)' : 'Penugasan Inspektor & Alat'}</h2>
        <p className="mb-4 text-xs text-slate-500">Sistem memeriksa otomatis bentrok jadwal alat & inspektor dengan proyek lain pada rentang tanggal yang beririsan.</p>
        {canEdit ? (
          <TugasForm
            proyekId={p.id}
            blanket={blanket}
            sisaBobot={sisaBobot}
            defaultNama={blanket ? `Call Out #${p.tugas.length + 1} — …` : 'mis. Inspeksi Radiografi Sambungan Las'}
            inspektor={inspektor.map((i) => ({ id: i.id, label: `${i.nama} (${i.jabatan}, ${i.unit.nama_unit.replace('Cabang Komersial ', 'Cab. ')})` }))}
            alat={alat.map((a) => ({ id: a.id, label: `${a.kode_aset} — ${a.nama_alat} [${a.status}]` }))}
          />
        ) : (
          <p className="text-sm text-slate-500">Ganti peran ke <b>User Lapangan</b> atau <b>Unit Operasional</b> untuk menjadwalkan tugas.</p>
        )}
      </div>
    </>
  );
}
