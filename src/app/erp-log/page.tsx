import { prisma } from '@/lib/db';
import { PageHeader, Badge, Empty } from '@/components/ui';

const TONE: Record<string, string> = { AP: 'blue', SIKOM: 'amber' };

export default async function ErpLogPage() {
  const logs = await prisma.erpLog.findMany({ orderBy: { id: 'desc' }, take: 200 });
  return (
    <>
      <PageHeader title="Log Integrasi ERP (Simulasi)" sub="Payload JSON setiap transaksi lintas sistem AP ↔ SIKOM ↔ SAP / Oracle ERP — bahan diskusi dengan vendor IT." />
      {logs.length === 0 ? <Empty>Belum ada transaksi.</Empty> : (
        <div className="space-y-3">
          {logs.map((l) => (
            <details key={l.id} className="card group">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 p-4">
                <span className="w-10 font-mono text-xs text-slate-400">#{l.id}</span>
                <Badge tone={TONE[l.sumber] ?? 'gold'}>{l.sumber}</Badge>
                <span className="text-slate-400">→</span>
                <Badge tone={TONE[l.tujuan] ?? 'gold'}>{l.tujuan}</Badge>
                <span className="font-medium text-navy">{l.event}</span>
                <span className="ml-auto text-xs text-slate-400">{l.created_at.toLocaleString('id-ID')}</span>
              </summary>
              <pre className="overflow-x-auto rounded-b-xl bg-navy-dark p-4 text-xs text-emerald-300">
                {JSON.stringify({ id: l.id, source: l.sumber, target: l.tujuan, event: l.event, timestamp: l.created_at, payload: l.payload }, null, 2)}
              </pre>
            </details>
          ))}
        </div>
      )}
    </>
  );
}
