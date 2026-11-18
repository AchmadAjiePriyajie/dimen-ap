import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Anchor } from 'lucide-react';
import { rp, tgl } from '@/lib/fmt';
import { rekapKinerja } from '@/lib/kinerja';
import PrintButton from '@/components/PrintButton';

// Print view resmi rekap kinerja untuk Human Capital (Ctrl+P / Save as PDF).
export default async function RekapHC({ params }: { params: { id: string } }) {
  const [g] = await rekapKinerja({ id: Number(params.id) });
  if (!g) notFound();
  const tugas = [...g.tugas, ...g.proyek_pm.flatMap((p) => p.tugas.filter((t) => t.inspektor_id !== g.id).map((t) => ({ ...t, proyek: p })))];

  return (
    <>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href="/kinerja" className="inline-flex items-center gap-1 text-sm text-navy-light hover:underline"><ArrowLeft size={14} /> Kembali</Link>
        <PrintButton />
      </div>
      <div className="mx-auto max-w-4xl bg-white p-10 shadow-sm print:p-0 print:shadow-none">
        <div className="flex items-center justify-between border-b-4 border-gold pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-navy text-gold"><Anchor size={26} /></div>
            <div>
              <div className="text-lg font-bold text-navy">PT Biro Klasifikasi Indonesia (Persero)</div>
              <div className="text-xs text-slate-500">Lini Operasi Bisnis Komersial · Anggota Holding IDSurvey</div>
            </div>
          </div>
          <div className="text-right text-xs text-slate-500">Dicetak: {tgl(new Date())}<br />Sumber data: SIKOM</div>
        </div>

        <h1 className="mt-6 text-center text-xl font-bold uppercase tracking-wide text-navy">Rekap Kinerja & Portofolio Pegawai Lapangan</h1>
        <p className="text-center text-xs text-slate-500">Lampiran pengajuan kepada Divisi Human Capital</p>

        <table className="mt-6 w-full text-sm">
          <tbody>
            {[
              ['Nama', g.nama], ['Jabatan', g.jabatan], ['Unit Kerja', g.unit.nama_unit], ['Status Kepegawaian', g.status_kepegawaian],
            ].map(([k, v]) => (
              <tr key={k}><td className="w-48 py-1 text-slate-500">{k}</td><td className="py-1 font-medium">: {v}</td></tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 grid grid-cols-4 gap-3">
          {[
            ['Proyek Delivered', g.delivered], ['Tugas / Call Out Selesai', g.selesai.length], ['Sertifikat TIC Diterbitkan', g.sertifikat], ['Akumulasi Nilai Proyek', rp(g.total_nilai_proyek_ditangani)],
          ].map(([k, v]) => (
            <div key={k as string} className="rounded-lg border border-slate-200 p-3 text-center">
              <div className="text-[11px] uppercase text-slate-500">{k}</div>
              <div className="mt-1 text-lg font-bold text-navy">{v}</div>
            </div>
          ))}
        </div>

        <h2 className="mt-8 border-b border-slate-200 pb-1 font-semibold text-navy">Riwayat Proyek yang Didukung</h2>
        <table className="tbl mt-2">
          <thead><tr><th>Kode</th><th>Proyek / Klien</th><th>Layanan · Sektor</th><th>Peran</th><th className="text-right">Nilai Kontrak</th><th>Progres</th></tr></thead>
          <tbody>
            {g.proyekTerlibat.map((p) => (
              <tr key={p.id}>
                <td className="font-mono text-xs">{p.kode_proyek}</td>
                <td>{p.nama_proyek}<div className="text-xs text-slate-500">{p.klien}</div></td>
                <td className="text-xs">{p.potensi.layanan.nama_layanan}<div className="text-slate-500">{p.potensi.sektor.nama_sektor}</div></td>
                <td className="text-xs">{p.pm_id === g.id ? 'Project Manager' : 'Inspektor'}</td>
                <td className="text-right tabular-nums">{rp(p.nilai_kontrak)}</td>
                <td>{p.persentase_progres}%</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 className="mt-8 border-b border-slate-200 pb-1 font-semibold text-navy">Rincian Tugas Lapangan</h2>
        <table className="tbl mt-2">
          <thead><tr><th>Tugas</th><th>Proyek</th><th>Periode</th><th>Status</th><th>No. Sertifikat</th></tr></thead>
          <tbody>
            {tugas.map((t) => (
              <tr key={t.id}>
                <td>{t.nama_tugas}</td>
                <td className="font-mono text-xs">{t.proyek.kode_proyek}</td>
                <td className="whitespace-nowrap text-xs">{tgl(t.tanggal_mulai)} – {tgl(t.tanggal_selesai)}</td>
                <td className="text-xs">{t.status}</td>
                <td className="font-mono text-[11px]">{t.nomor_sertifikat_tic ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-12 grid grid-cols-2 gap-10 text-center text-sm">
          <div>Mengetahui,<br />Kepala Unit<div className="mt-16 border-t border-slate-400 pt-1 text-xs text-slate-500">Nama & Tanda Tangan</div></div>
          <div>Diverifikasi,<br />Divisi Human Capital<div className="mt-16 border-t border-slate-400 pt-1 text-xs text-slate-500">Nama & Tanda Tangan</div></div>
        </div>
        <p className="mt-8 text-center text-[10px] text-slate-400">Dokumen ini dihasilkan otomatis oleh Sistem Terintegrasi AP & SIKOM (prototipe).</p>
      </div>
    </>
  );
}
