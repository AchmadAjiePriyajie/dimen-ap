import { Check, X } from 'lucide-react';
import { DOC_STEPS, DOC_APPROVED } from '@/lib/flow';

const TONES: Record<string, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  blue: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  amber: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  red: 'bg-red-50 text-red-700 ring-red-600/20',
  slate: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  gold: 'bg-gold/15 text-gold-dark ring-gold/40',
};

export function toneOf(status: string) {
  if (/Menang|Approved|Disetujui Mitra|Selesai|Sudah LPJ|Tersedia|Synced/.test(status)) return 'green';
  if (/Gugur|Ditolak|Revisi|Kalibrasi/.test(status)) return 'red';
  if (/Menunggu|Review|Pending|In Progress|Belum LPJ|Digunakan/.test(status)) return 'amber';
  if (/Siap Tender/.test(status)) return 'blue';
  return 'slate';
}

export function Badge({ children, tone }: { children: React.ReactNode; tone?: string }) {
  const t = tone ?? toneOf(String(children));
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[t]}`}>{children}</span>;
}

export function Progress({ value, className = '' }: { value: number; className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-gradient-to-r from-navy-light to-gold" style={{ width: `${value}%` }} />
      </div>
      <span className="w-10 text-right text-xs font-semibold tabular-nums">{value}%</span>
    </div>
  );
}

export function PageHeader({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-navy">{title}</h1>
        {sub && <p className="mt-0.5 text-sm text-slate-500">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

export function Stat({ label, value, sub, icon }: { label: string; value: React.ReactNode; sub?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
        <span className="text-gold-dark">{icon}</span>
      </div>
      <div className="mt-2 text-2xl font-bold tabular-nums text-navy">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

// Indikator progres approval berjenjang
export function ApprovalStepper({ status }: { status: string }) {
  const idx = status === DOC_APPROVED ? DOC_STEPS.length : DOC_STEPS.findIndex((s) => s.status === status);
  const rejected = status === 'Ditolak';
  return (
    <div className="flex items-center gap-1">
      {DOC_STEPS.map((s, i) => {
        const done = idx > i;
        const current = idx === i;
        return (
          <div key={s.status} className="flex items-center gap-1">
            <div
              className={`flex h-6 items-center gap-1 whitespace-nowrap rounded-full px-2 text-[11px] font-medium ${
                done ? 'bg-emerald-600 text-white' : current ? 'bg-amber-400 text-navy-dark' : rejected ? 'bg-red-50 text-red-400' : 'bg-slate-100 text-slate-400'
              }`}
            >
              {done ? <Check size={11} /> : rejected ? <X size={11} /> : null}
              {s.label}
            </div>
            {i < DOC_STEPS.length - 1 && <div className={`h-0.5 w-2 ${done ? 'bg-emerald-600' : 'bg-slate-200'}`} />}
          </div>
        );
      })}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">{children}</div>;
}
