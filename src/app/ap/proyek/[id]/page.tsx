import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Plus, Check, X, RotateCcw, Handshake, CloudUpload, CalendarClock } from 'lucide-react';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import { rp, rpShort, tgl } from '@/lib/fmt';
import { DOC_STEPS, JENIS_DOKUMEN, JENIS_DESC } from '@/lib/flow';
import { PageHeader, Badge, Progress, ApprovalStepper, Empty } from '@/components/ui';
import { createDokumen, advanceDokumen, rejectDokumen, toggleLpj, createSos, respondSos } from '../../../actions';

const TABS = [...JENIS_DOKUMEN, 'SOS'] as const;

export default async function ProyekKeuangan({ params, searchParams }: { params: { id: string }; searchParams: { tab?: string } }) {
  const { role, unitId } = getSession();
  const proyek = await prisma.proyek.findUnique({
    where: { id: Number(params.id) },
    include: {
      unit_utama: true, pm: true,
      potensi: { include: { layanan: true, sektor: true } },
      dokumen: { orderBy: { id: 'asc' } },
      sos: { include: { unit_utama: true, unit_mitra: true }, orderBy: { id: 'asc' } },
    },
  });
  if (!proyek) notFound();
  const units = await prisma.unitKerja.findMany({ where: { id: { not: proyek.unit_utama_id } } });
  const tab = (TABS as readonly string[]).includes(searchParams.tab ?? '') ? searchParams.tab! : 'RAB';
  const docs = proyek.dokumen.filter((d) => d.jenis_dokumen === tab);
  const sum = (j: string, approvedOnly = false) =>
    proyek.dokumen.filter((d) => d.jenis_dokumen === j && (!approvedOnly || d.status_approval === 'Approved Direksi')).reduce((s, d) => s + d.nominal, 0n);
  const rabApproved = sum('RAB', true);
  const canCreateDoc = role === 'OPERASIONAL' || role === 'COE';

  return (
    <>
      <Link href="/ap" className="mb-3 inline-flex items-center gap-1 text-sm text-navy-light hover:underline"><ArrowLeft size={14} /> Kembali ke AP</Link>
      <PageHeader title={proyek.nama_proyek} sub={`${proyek.kode_proyek} · ${proyek.klien} · ${proyek.potensi.layanan.nama_layanan} · ${proyek.potensi.sektor.nama_sektor}`}>
        <Link href={`/sikom/${proyek.id}`} className="btn"><CalendarClock size={14} /> Buka di SIKOM</Link>
      </PageHeader>

      <div className="card mb-5 grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">
        <div><div className="label">Unit Utama · PM</div><div className="text-sm font-medium">{proyek.unit_utama.nama_unit}</div><div className="text-xs text-slate-500">{proyek.pm.nama}</div></div>
        <div><div className="label">Jenis Kontrak</div><Badge tone="slate">{proyek.jenis_kontrak}</Badge><div className="mt-1 text-xs text-slate-500">{tgl(proyek.tanggal_mulai)} – {tgl(proyek.tanggal_selesai)}</div></div>
        <div><div className="label">Nilai Kontrak</div><div className="text-lg font-bold text-navy">{rp(proyek.nilai_kontrak)}</div></div>
        <div><div className="label">Progres (dari SIKOM)</div><Progress value={proyek.persentase_progres} className="mt-2" /></div>
        <div><div className="label">Sisa Potensi Pendapatan</div><div className="text-lg font-bold text-gold-dark">{rp(proyek.potensi_pendapatan_sisa)}</div><Badge>{proyek.status_erp}</Badge></div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-5">
        {JENIS_DOKUMEN.map((j) => (
          <div key={j} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <div className="text-xs text-slate-500">{j}</div>
            <div className="font-semibold tabular-nums text-navy">{rpShort(sum(j))}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="flex overflow-x-auto border-b border-slate-200">
          {TABS.map((t) => (
            <Link key={t} href={`?tab=${t}`} className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium ${tab === t ? 'border-gold text-navy' : 'border-transparent text-slate-500 hover:text-navy'}`}>
              {t === 'SOS' ? 'Statement of Share' : t} <span className="ml-1 text-xs text-slate-400">({t === 'SOS' ? proyek.sos.length : proyek.dokumen.filter((d) => d.jenis_dokumen === t).length})</span>
            </Link>
          ))}
        </div>

        {tab !== 'SOS' ? (
          <div className="p-5">
            <p className="mb-4 text-sm text-slate-600">{JENIS_DESC[tab]}</p>
            {canCreateDoc && (
              <form action={createDokumen.bind(null, proyek.id, tab)} className="mb-5 grid gap-3 rounded-lg bg-slate-50 p-4 md:grid-cols-[200px_1fr_auto]">
                <div><label className="label">Nominal (Rp)</label><input name="nominal" type="number" min={1} required className="input" /></div>
                <div><label className="label">Keterangan</label><input name="keterangan" className="input" placeholder={`Keterangan ${tab}`} /></div>
                <div className="flex items-end"><button className="btn-primary"><Plus size={14} /> Buat {tab}</button></div>
              </form>
            )}
            {docs.length === 0 ? (
              <Empty>Belum ada dokumen {tab}.</Empty>
            ) : (
              <div className="overflow-x-auto">
                <table className="tbl">
                  <thead><tr><th>Nomor</th><th className="text-right">Nominal</th><th>Keterangan</th><th>Approval Berjenjang</th>{tab === 'Dropping' && <th>LPJ</th>}<th>ERP</th><th>Aksi</th></tr></thead>
                  <tbody>
                    {docs.map((d) => {
                      const step = DOC_STEPS.find((s) => s.status === d.status_approval);
                      const isDraft = d.status_approval === 'Draft' || d.status_approval === 'Ditolak';
                      const canAct = step ? step.role === role : isDraft && canCreateDoc;
                      return (
                        <tr key={d.id}>
                          <td className="whitespace-nowrap font-mono text-xs">{d.nomor_dokumen}</td>
                          <td className="whitespace-nowrap text-right tabular-nums">{rp(d.nominal)}</td>
                          <td className="max-w-xs text-xs text-slate-600">{d.keterangan}</td>
                          <td><ApprovalStepper status={d.status_approval} /><div className="mt-1"><Badge>{d.status_approval}</Badge></div></td>
                          {tab === 'Dropping' && (
                            <td>
                              <form action={toggleLpj.bind(null, d.id)}>
                                <button className="flex items-center gap-2" disabled={d.status_approval !== 'Approved Direksi' || !(role === 'OPERASIONAL' || role === 'LAPANGAN')} title="Toggle status LPJ">
                                  <span className={`relative h-5 w-9 rounded-full transition ${d.status_lpj === 'Sudah LPJ' ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${d.status_lpj === 'Sudah LPJ' ? 'left-[18px]' : 'left-0.5'}`} />
                                  </span>
                                  <Badge>{d.status_lpj}</Badge>
                                </button>
                              </form>
                            </td>
                          )}
                          <td>{d.synced_to_erp ? <Badge tone="green"><CloudUpload size={12} className="mr-1" /> Synced</Badge> : <Badge tone="slate">Belum</Badge>}</td>
                          <td className="whitespace-nowrap">
                            {d.status_approval !== 'Approved Direksi' && (
                              <div className="flex gap-1.5">
                                <form action={advanceDokumen.bind(null, d.id)}>
                                  <button className={isDraft ? 'btn' : 'btn-primary'} disabled={!canAct} title={step ? `Perlu peran ${step.role}` : 'Peran Operasional / CoE'}>
                                    {isDraft ? <><RotateCcw size={14} /> Ajukan</> : <><Check size={14} /> Setujui {step!.label}</>}
                                  </button>
                                </form>
                                {step && (
                                  <form action={rejectDokumen.bind(null, d.id)}>
                                    <button className="btn-danger" disabled={!canAct}><X size={14} /></button>
                                  </form>
                                )}
                              </div>
                            )}
                            {step && !canAct && <div className="mt-1 text-[11px] text-slate-400">Menunggu peran: {step.role}</div>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="p-5">
            <p className="mb-4 text-sm text-slate-600">
              Bagi hasil antar-cabang. Pendapatan dibagi dari nilai kontrak ({rpShort(proyek.nilai_kontrak)}); batas budget dibagi dari RAB yang telah disetujui Direksi ({rpShort(rabApproved)}).
            </p>
            {role === 'OPERASIONAL' && unitId === proyek.unit_utama_id && (
              <form action={createSos.bind(null, proyek.id)} className="mb-5 grid gap-3 rounded-lg bg-slate-50 p-4 md:grid-cols-4">
                <div><label className="label">Undang Cabang Mitra</label><select name="unit_mitra_id" className="input">{units.map((u) => <option key={u.id} value={u.id}>{u.nama_unit}</option>)}</select></div>
                <div><label className="label">Porsi Utama (%)</label><select name="porsi_utama_persen" className="input" defaultValue="50"><option value="50">50 : 50</option><option value="60">60 : 40</option><option value="70">70 : 30</option><option value="80">80 : 20</option></select></div>
                <div><label className="label">Tahap Kesepakatan</label><select name="tahap_kesepakatan" className="input"><option>Awal Potensi</option><option>Tengah Proyek</option></select></div>
                <div className="flex items-end"><button className="btn-primary"><Handshake size={14} /> Kirim Undangan SOS</button></div>
              </form>
            )}
            {!(role === 'OPERASIONAL' && unitId === proyek.unit_utama_id) && (
              <p className="mb-4 rounded-md bg-amber-50 p-3 text-xs text-amber-800">Undangan SOS dibuat oleh Kepala Cabang unit utama ({proyek.unit_utama.nama_unit}). Persetujuan dilakukan oleh peran Operasional pada unit mitra.</p>
            )}
            {proyek.sos.length === 0 ? (
              <Empty>Belum ada Statement of Share.</Empty>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {proyek.sos.map((s) => {
                  const isMitra = role === 'OPERASIONAL' && unitId === s.unit_mitra_id;
                  const part = (v: bigint, pct: number) => (v * BigInt(pct)) / 100n;
                  return (
                    <div key={s.id} className="rounded-lg border border-slate-200 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="text-sm font-semibold text-navy">SOS #{s.id} · {s.porsi_utama_persen}:{s.porsi_mitra_persen}</div>
                        <div className="flex gap-1.5"><Badge tone="slate">{s.tahap_kesepakatan}</Badge><Badge>{s.status_persetujuan}</Badge></div>
                      </div>
                      <table className="tbl">
                        <thead><tr><th>Unit</th><th>Porsi</th><th className="text-right">Nilai Pendapatan</th><th className="text-right">Batas Budget RAB</th></tr></thead>
                        <tbody>
                          <tr><td>{s.unit_utama.nama_unit} <span className="text-xs text-slate-400">(utama)</span></td><td>{s.porsi_utama_persen}%</td><td className="text-right tabular-nums">{rp(part(proyek.nilai_kontrak, s.porsi_utama_persen))}</td><td className="text-right tabular-nums">{rp(part(rabApproved, s.porsi_utama_persen))}</td></tr>
                          <tr><td>{s.unit_mitra.nama_unit} <span className="text-xs text-slate-400">(mitra)</span></td><td>{s.porsi_mitra_persen}%</td><td className="text-right tabular-nums">{rp(part(proyek.nilai_kontrak, s.porsi_mitra_persen))}</td><td className="text-right tabular-nums">{rp(part(rabApproved, s.porsi_mitra_persen))}</td></tr>
                        </tbody>
                      </table>
                      {s.status_persetujuan !== 'Disetujui Mitra' && (
                        <div className="mt-3 flex items-center gap-2">
                          <form action={respondSos.bind(null, s.id, true)}><button className="btn-primary" disabled={!isMitra}><Check size={14} /> Setujui (Mitra)</button></form>
                          <form action={respondSos.bind(null, s.id, false)}><button className="btn-danger" disabled={!isMitra}>Minta Revisi</button></form>
                          {!isMitra && <span className="text-[11px] text-slate-400">Ganti ke peran Operasional · {s.unit_mitra.nama_unit}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
