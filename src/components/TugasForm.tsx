'use client';
import { useEffect, useRef, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { AlertTriangle, Plus, CheckCircle2 } from 'lucide-react';
import { createTugas, cekBentrok, type TugasState } from '@/app/actions';

type Opt = { id: number; label: string };

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button className="btn-primary" disabled={pending}><Plus size={14} /> {pending ? 'Menyimpan…' : label}</button>;
}

export default function TugasForm({ proyekId, blanket, inspektor, alat, sisaBobot, defaultNama }: { proyekId: number; blanket: boolean; inspektor: Opt[]; alat: Opt[]; sisaBobot: number; defaultNama: string }) {
  const [state, action] = useFormState<TugasState, FormData>(createTugas.bind(null, proyekId), {});
  const [f, setF] = useState({ mulai: '', selesai: '', alatId: '', inspektorId: String(inspektor[0]?.id ?? '') });
  const [warnings, setWarnings] = useState<string[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

  // Validasi bentrok real-time saat tanggal/alat/inspektor berubah
  useEffect(() => {
    let alive = true;
    cekBentrok({ mulai: f.mulai, selesai: f.selesai, alatId: Number(f.alatId) || null, inspektorId: Number(f.inspektorId) || null }).then((w) => alive && setWarnings(w));
    return () => { alive = false; };
  }, [f]);

  useEffect(() => {
    if (state.ok) { formRef.current?.reset(); setF((x) => ({ ...x, mulai: '', selesai: '', alatId: '' })); }
  }, [state]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  if (sisaBobot <= 0) return <p className="text-sm text-slate-500">Seluruh bobot pekerjaan (100%) sudah terjadwal.</p>;

  return (
    <form ref={formRef} action={action} className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <div className="xl:col-span-2">
          <label className="label">{blanket ? 'Nama Call Out' : 'Nama Tugas'}</label>
          <input name="nama_tugas" required className="input" placeholder={defaultNama} />
        </div>
        <div>
          <label className="label">Inspektor</label>
          <select name="inspektor_id" className="input" value={f.inspektorId} onChange={set('inspektorId')}>
            {inspektor.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Alat Kerja</label>
          <select name="alat_id" className="input" value={f.alatId} onChange={set('alatId')}>
            <option value="">— Tanpa alat —</option>
            {alat.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Mulai</label>
          <input name="tanggal_mulai" type="date" required className="input" value={f.mulai} onChange={set('mulai')} />
        </div>
        <div>
          <label className="label">Selesai</label>
          <input name="tanggal_selesai" type="date" required className="input" value={f.selesai} onChange={set('selesai')} />
        </div>
        <div>
          <label className="label">Bobot Progres (%)</label>
          <input name="bobot_progres" type="number" min={1} max={sisaBobot} defaultValue={Math.min(sisaBobot, 20)} required className="input" />
          <div className="mt-1 text-[11px] text-slate-400">Sisa bobot: {sisaBobot}%</div>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {warnings.map((w) => (
            <div key={w} className="flex items-start gap-2"><AlertTriangle size={16} className="mt-0.5 shrink-0" /> {w}</div>
          ))}
          <label className="mt-2 flex items-center gap-2 text-xs font-medium">
            <input type="checkbox" name="override" /> Tetap jadwalkan (saya sudah berkoordinasi dengan pemilik jadwal)
          </label>
        </div>
      )}
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="flex items-center gap-1 text-sm text-emerald-700"><CheckCircle2 size={14} /> Penugasan tersimpan.</p>}
      <Submit label={blanket ? 'Tambah Call Out' : 'Tambah Tugas'} />
    </form>
  );
}
