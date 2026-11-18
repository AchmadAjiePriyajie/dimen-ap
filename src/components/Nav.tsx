'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Briefcase, CalendarClock, BadgeCheck, Users, Network } from 'lucide-react';

const GROUPS = [
  { title: 'Eksekutif', items: [{ href: '/', label: 'Dashboard Eksekutif', icon: LayoutDashboard }] },
  { title: 'Modul 1 · Account Planning', items: [{ href: '/ap', label: 'Potensi & Proyek (AP)', icon: Briefcase }] },
  {
    title: 'Modul 2 · SIKOM',
    items: [
      { href: '/sikom', label: 'Penjadwalan & Call Out', icon: CalendarClock },
      { href: '/sikom/sertifikat', label: 'Sertifikat TIC', icon: BadgeCheck },
    ],
  },
  { title: 'Modul 3 · Human Capital', items: [{ href: '/kinerja', label: 'Portofolio & Beban Kerja', icon: Users }] },
  { title: 'Integrasi', items: [{ href: '/erp-log', label: 'Log Integrasi ERP', icon: Network }] },
];

export default function Nav() {
  const path = usePathname();
  const active = (href: string) =>
    href === '/' ? path === '/' : href === '/sikom' ? path === '/sikom' || /^\/sikom\/\d/.test(path) : path.startsWith(href);
  return (
    <nav className="space-y-5 px-3 py-4">
      {GROUPS.map((g) => (
        <div key={g.title}>
          <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">{g.title}</div>
          {g.items.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition ${
                active(href) ? 'bg-gold font-semibold text-navy-dark' : 'text-slate-200 hover:bg-white/10'
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
