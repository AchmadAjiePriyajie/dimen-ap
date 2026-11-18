import './globals.css';
import { Anchor, PlugZap } from 'lucide-react';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import { ROLES } from '@/lib/flow';
import Nav from '@/components/Nav';
import RoleSwitcher from '@/components/RoleSwitcher';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'AP & SIKOM — BKI', description: 'Prototipe Sistem Terintegrasi Account Planning & SIKOM' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { role, unitId } = getSession();
  const units = await prisma.unitKerja.findMany({ orderBy: { id: 'asc' } });
  return (
    <html lang="id">
      <body className="bg-slate-100 text-slate-800 antialiased">
        <div className="flex min-h-screen">
          <aside className="sticky top-0 hidden h-screen w-64 shrink-0 overflow-y-auto bg-navy print:hidden md:block">
            <div className="flex items-center gap-2.5 border-b border-white/10 px-5 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold text-navy-dark">
                <Anchor size={20} />
              </div>
              <div>
                <div className="text-sm font-bold leading-tight text-white">BKI · AP & SIKOM</div>
                <div className="text-[10px] uppercase tracking-wider text-gold-light">Operasi Bisnis Komersial</div>
              </div>
            </div>
            <Nav />
            <div className="mx-3 mb-4 rounded-lg bg-white/5 p-3 text-[11px] text-slate-300">
              Mode Prototipe — tanpa login. Ganti peran & unit di header untuk menguji alur approval.
            </div>
          </aside>
          <div className="min-w-0 flex-1">
            <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-6 py-3 backdrop-blur print:hidden">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold text-navy">PT Biro Klasifikasi Indonesia</span>
                <span className="hidden text-slate-400 lg:inline">· IDSurvey</span>
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-600/20">
                  <PlugZap size={12} /> Terhubung SAP / Oracle ERP
                </span>
              </div>
              <RoleSwitcher role={role} unitId={unitId} units={units.map((u) => ({ id: u.id, nama: u.nama_unit }))} />
            </header>
            <main className="p-6">
              <div className="mb-4 text-xs text-slate-500 print:hidden">
                Masuk sebagai: <b className="text-navy">{ROLES[role]}</b> · {units.find((u) => u.id === unitId)?.nama_unit}
              </div>
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
