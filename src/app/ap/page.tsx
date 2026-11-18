import Link from 'next/link';
import { Plus, Send, CheckCircle2, XCircle, Trophy, ChevronRight } from 'lucide-react';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import { rp, rpShort, tgl, isoDate } from '@/lib/fmt';
import { PageHeader, Badge, Progress, Empty } from '@/components/ui';
import { createPotensi, ajukanPotensi, approvePotensi, gugurPotensi, konversiPotensi } from '../actions';

export default async function APPage() {
  const { role, unitId } = getSession();
  const [potensi, proyek, units, sektor, layanan, pms] = await Promise.all([
    prisma.potensiProyek.findMany({ include: { unit: true, sektor: true, layanan: true, proyek: true }, orderBy: { id: 'desc' } }),
    prisma.proyek.findMany({ include: { unit_utama: true, pm: true, sos: true }, orderBy: { id: 'desc' } }),
    prisma.unitKerja.findMany({ orderBy: { id: 'asc' } }),
    prisma.sektor.findMany({ orderBy: { id: 'asc' } }),
    prisma.layanan.findMany({ orderBy: { id: 'asc' } }),
    prisma.pegawai.findMany({ where: { jabatan: 'PM' } }),
  ]);
  const canCreate = role !== 'LAPANGAN';
  const isOps = role === 'OPERASIONAL';
  const today = new Date();

  return (
    <>
      <PageHeader title="Account Planning — Potensi & Proyek" sub="Modul finansial: potensi proyek, approval, konversi menjadi kontrak, dokumen keuangan & Statement of Share." />

      {canCreate ? (
        <details className="card mb-5 group">
          <summary className="flex cursor-pointer list-none items-center gap-2 p-4 font-semibold text-navy">
            <Plus size={18} /> Buat Potensi Proyek Baru
          </summary>
          <form action={createPotensi} className="grid gap-4 border-t border-slate-100 p-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="md:col-span-2">
              <label className="label">Nama Potensi</label>
              <input name="nama_potensi" required className="input" placeholder="mis. Inspeksi Tangki Timbun Terminal BBM" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Klien</label>
              <input name="klien" required className="input" placeholder="mis. PT Pertamina Patra Niaga" />
            </div>
            <div>
              <label className="label">Unit</label>
              <select name="unit_id" className="input" defaultValue={unitId}>
                {units.map((u) => <option key={u.id} value={u.id}>{u.nama_unit}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Layanan</label>
              <select name="layanan_id" className="input">
                {layanan.map((l) => <option key={l.id} value={l.id}>{l.nama_layanan}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Sektor</label>
              <select name="sektor_id" className="input">
                {sektor.map((s) => <option key={s.id} value={s.id}>{s.nama_sektor}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Jalur Akuisisi</label>
              <select name="jalur_akuisisi" className="input">
                <option>Tender</option>
                <option>Surat Penawaran</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="label">Estimasi Nilai (Rp)</label>
              <input name="estimasi_nilai" type="number" min={1} required className="input" placeholder="1500000000" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Estimasi Biaya Operasi (Rp)</label>
              <input name="estimasi_biaya_operasi" type="number" min={1} required className="input" placeholder="900000000" />
            </div>
            <div className="flex items-center justify-between md:col-span-2 xl:col-span-4">
              <p className="text-xs text-slate-500">Jalur <b>Surat Penawaran</b> memerlukan approval Kepala Cabang sebelum siap diajukan.</p>
              <button className="btn-primary"><Plus size={16} /> Simpan sebagai Draft</button>
            </div>
          </form>
        </details>
      ) : (
        <div className="card mb-5 p-4 text-sm text-slate-500">Peran User Lapangan hanya dapat melihat data AP. Gunakan modul SIKOM untuk pekerjaan operasional.</div>
      )}

      <div className="card mb-6">
        <div className="border-b border-slate-100 p-4">
          <h2 className="font-semibold text-navy">Daftar Potensi Proyek</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Kode / Potensi</th><th>Unit</th><th>Layanan · Sektor</th><th className="text-right">Estimasi Nilai</th>
                <th className="text-right">Margin</th><th>Jalur</th><th>Status</th><th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {potensi.map((p) => {
                const margin = Number(((p.estimasi_nilai - p.estimasi_biaya_operasi) * 1000n) / p.estimasi_nilai) / 10;
                return (
                  <tr key={p.id}>
                    <td>
                      <div className="text-xs text-slate-400">{p.kode_potensi}</div>
                      <div className="font-medium">{p.nama_potensi}</div>
                      <div className="text-xs text-slate-500">{p.klien}</div>
                    </td>
                    <td className="text-xs">{p.unit.nama_unit}</td>
                    <td className="text-xs">{p.layanan.nama_layanan}<div className="text-slate-400">{p.sektor.nama_sektor}</div></td>
                    <td className="text-right tabular-nums">{rpShort(p.estimasi_nilai)}<div className="text-xs text-slate-400">biaya {rpShort(p.estimasi_biaya_operasi)}</div></td>
                    <td className="text-right tabular-nums">{margin}%</td>
                    <td><Badge tone="slate">{p.jalur_akuisisi}</Badge></td>
                    <td><Badge>{p.status}</Badge></td>
                    <td className="whitespace-nowrap">
                      {p.status === 'Draft' && (
                        <form action={ajukanPotensi.bind(null, p.id)}>
                          <button className="btn" disabled={!(isOps || role === 'COE')} title="Peran: Operasional / CoE">
                            <Send size={14} /> {p.jalur_akuisisi === 'Tender' ? 'Siapkan Tender' : 'Ajukan ke Kacab'}
                          </button>
                        </form>
                      )}
                      {p.status === 'Menunggu Approval Kacab' && (
                        <div className="flex gap-1.5">
                          <form action={approvePotensi.bind(null, p.id)}>
                            <button className="btn-primary" disabled={!isOps} title="Peran: Kepala Cabang (Operasional)"><CheckCircle2 size={14} /> Setujui Kacab</button>
                          </form>
                          <form action={gugurPotensi.bind(null, p.id)}>
                            <button className="btn-danger" disabled={!isOps}><XCircle size={14} /> Tolak</button>
                          </form>
                        </div>
                      )}
                      {p.status === 'Disetujui / Siap Tender' && (
                        <div className="flex gap-1.5">
                          <details className="relative">
                            <summary className="btn-gold list-none"><Trophy size={14} /> Konversi Menjadi Proyek</summary>
                            <form action={konversiPotensi.bind(null, p.id)} className="card absolute right-0 z-20 mt-2 w-80 space-y-3 p-4 text-left shadow-xl">
                              <div className="text-sm font-semibold text-navy">Menang Kontrak — {p.kode_potensi}</div>
                              <div>
                                <label className="label">Jenis Kontrak</label>
                                <select name="jenis_kontrak" className="input"><option>Lump Sum</option><option>Blanket</option></select>
                              </div>
                              <div>
                                <label className="label">Nilai Kontrak (Rp)</label>
                                <input name="nilai_kontrak" type="number" min={1} defaultValue={String(p.estimasi_nilai)} className="input" required />
                              </div>
                              <div>
                                <label className="label">Project Manager</label>
                                <select name="pm_id" className="input">{pms.map((m) => <option key={m.id} value={m.id}>{m.nama}</option>)}</select>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div><label className="label">Mulai</label><input name="tanggal_mulai" type="date" defaultValue={isoDate(today)} className="input" required /></div>
                                <div><label className="label">Selesai</label><input name="tanggal_selesai" type="date" defaultValue={isoDate(new Date(today.getTime() + 90 * 864e5))} className="input" required /></div>
                              </div>
                              <div>
                                <label className="label">Sinkron ke ERP</label>
                                <select name="erp" className="input"><option value="SAP">SAP</option><option value="Oracle">Oracle</option></select>
                              </div>
                              <button className="btn-primary w-full" disabled={!(isOps || role === 'PUSAT')}>Konfirmasi & Buat Proyek di SIKOM</button>
                              {!(isOps || role === 'PUSAT') && <p className="text-xs text-red-600">Perlu peran Operasional / Manajemen Pusat.</p>}
                            </form>
                          </details>
                          <form action={gugurPotensi.bind(null, p.id)}>
                            <button className="btn-danger" disabled={!(isOps || role === 'PUSAT')}>Gugur</button>
                          </form>
                        </div>
                      )}
                      {p.proyek && (
                        <Link href={`/ap/proyek/${p.proyek.id}`} className="btn">Lihat {p.proyek.kode_proyek} <ChevronRight size={14} /></Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="border-b border-slate-100 p-4">
          <h2 className="font-semibold text-navy">Proyek Terkontrak</h2>
          <p className="text-xs text-slate-500">Sisa potensi pendapatan berkurang otomatis saat progres di SIKOM diperbarui.</p>
        </div>
        {proyek.length === 0 ? (
          <div className="p-4"><Empty>Belum ada proyek.</Empty></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr><th>Proyek</th><th>Unit Utama · PM</th><th>Kontrak</th><th className="text-right">Nilai Kontrak</th><th className="w-48">Progres (SIKOM)</th><th className="text-right">Sisa Potensi Pendapatan</th><th>ERP</th><th /></tr>
              </thead>
              <tbody>
                {proyek.map((p) => (
                  <tr key={p.id}>
                    <td><div className="text-xs text-slate-400">{p.kode_proyek}</div><div className="font-medium">{p.nama_proyek}</div><div className="text-xs text-slate-500">{p.klien}</div></td>
                    <td className="text-xs">{p.unit_utama.nama_unit}<div className="text-slate-500">PM: {p.pm.nama}</div>{p.sos.length > 0 && <Badge tone="gold">SOS</Badge>}</td>
                    <td><Badge tone="slate">{p.jenis_kontrak}</Badge><div className="mt-1 text-xs text-slate-400">{tgl(p.tanggal_mulai)} – {tgl(p.tanggal_selesai)}</div></td>
                    <td className="text-right tabular-nums">{rp(p.nilai_kontrak)}</td>
                    <td><Progress value={p.persentase_progres} /></td>
                    <td className="text-right font-semibold tabular-nums text-navy">{rp(p.potensi_pendapatan_sisa)}</td>
                    <td><Badge>{p.status_erp}</Badge></td>
                    <td><Link href={`/ap/proyek/${p.id}`} className="btn">Keuangan <ChevronRight size={14} /></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
