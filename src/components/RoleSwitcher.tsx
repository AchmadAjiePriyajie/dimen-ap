'use client';
import { useTransition } from 'react';
import { UserCog, Building2 } from 'lucide-react';
import { setSession } from '@/app/actions';
import { ROLES, type Role } from '@/lib/flow';

export default function RoleSwitcher({ role, unitId, units }: { role: Role; unitId: number; units: { id: number; nama: string }[] }) {
  const [pending, start] = useTransition();
  return (
    <div className={`flex flex-wrap items-center gap-2 ${pending ? 'opacity-60' : ''}`}>
      <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
        <UserCog size={15} /> Simulasi Peran
        <select className="input w-auto py-1.5" value={role} onChange={(e) => start(() => setSession(e.target.value, unitId))}>
          {Object.entries(ROLES).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
        <Building2 size={15} /> Unit
        <select className="input w-auto py-1.5" value={unitId} onChange={(e) => start(() => setSession(role, Number(e.target.value)))}>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nama}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
