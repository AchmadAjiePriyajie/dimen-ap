import Link from 'next/link';
import { FileText, Info } from 'lucide-react';
import { rp } from '@/lib/fmt';
import { rekapKinerja } from '@/lib/kinerja';
import { PageHeader, Badge } from '@/components/ui';

export default async function KinerjaPage() {
  const rekap = await rekapKinerja();
  return (
    <>
      <PageHeader title="Portofolio & Beban Kerja Pegawai" sub="Rekam jejak otomatis dari SIKOM — bukti kinerja untuk pengajuan jenjang karier / pengangkatan ke Human Capital." />
      <div className="mb-5 flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
        <Info size={16} className="mt-0.5 shrink-0" />
        Pegawai berstatus <b className="mx-1">Kontrak/PKWT</b> dapat mengekspor rekap kinerja ini sebagai lampiran resmi pengajuan pengangkatan karyawan tetap.
      </div>
      <div className="card overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>Pegawai</th><th>Jabatan</th><th>Unit</th><th>Status</th><th className="text-right">Proyek Delivered</th><th className="text-right">Tugas Selesai</th><th className="text-right">Sertifikat</th><th className="text-right">Beban Aktif</th><th className="text-right">Akumulasi Nilai Proyek</th><th /></tr></thead>
          <tbody>
            {rekap.map((g) => (
              <tr key={g.id}>
                <td className="font-medium">{g.nama}</td>
                <td>{g.jabatan}</td>
                <td className="text-xs">{g.unit.nama_unit}</td>
                <td><Badge tone={g.status_kepegawaian === 'Tetap' ? 'green' : 'amber'}>{g.status_kepegawaian}</Badge></td>
                <td className="text-right tabular-nums">{g.delivered}</td>
                <td className="text-right tabular-nums">{g.selesai.length}</td>
                <td className="text-right tabular-nums">{g.sertifikat}</td>
                <td className="text-right tabular-nums">{g.bebanAktif}</td>
                <td className="text-right font-semibold tabular-nums text-navy">{rp(g.total_nilai_proyek_ditangani)}</td>
                <td><Link href={`/kinerja/${g.id}`} className="btn whitespace-nowrap"><FileText size={14} /> Export Rekap HC</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
