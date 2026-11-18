import { cookies } from 'next/headers';
import { ROLES, type Role } from './flow';

// Mode prototipe: peran & unit disimpan di cookie (tanpa login).
export function getSession(): { role: Role; unitId: number } {
  const c = cookies();
  const r = c.get('role')?.value as Role;
  return { role: r && r in ROLES ? r : 'PUSAT', unitId: Number(c.get('unit')?.value) || 4 };
}
