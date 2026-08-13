'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, ClipboardList, ClipboardCheck, Layers, FileText, FolderKanban, Wrench, Receipt, IdCard, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BRAND } from '@/lib/brand';
import { NAV_ITEMS } from './nav-items';
import type { AuthUser } from '@/types';

const ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  '/dashboard': LayoutDashboard,
  '/customers': Users,
  '/service-requests': ClipboardList,
  '/site-inspections': ClipboardCheck,
  '/services': Layers,
  '/quotations': FileText,
  '/projects': FolderKanban,
  '/technicians': Wrench,
  '/employees': IdCard,
  '/invoices': Receipt,
};

export function Sidebar({ user, open, onClose }: { user: AuthUser; open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const visibleNav = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user.role));
  const initial = user.fullName.trim().charAt(0).toUpperCase() || '?';

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={onClose} />}
      <aside
        style={{ backgroundColor: BRAND.navyDark }}
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-60 flex-col px-3 py-5 text-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="mb-5 flex items-center justify-between border-b border-white/10 px-2 pb-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base font-bold text-white" style={{ backgroundColor: BRAND.orange }}>
              D
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">Dheman</p>
              <p className="truncate text-[11px] text-white/50">Service Mgmt</p>
            </div>
          </div>
          <button className="text-white/70 lg:hidden" onClick={onClose} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1">
          {visibleNav.map((item) => {
            const Icon = ICONS[item.href] ?? LayoutDashboard;
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn('group relative flex items-center gap-3 rounded-lg py-2 pl-3 pr-3 text-sm transition-colors duration-150', !active && 'hover:bg-white/5')}
                style={active ? { backgroundColor: `${BRAND.orange}1F` } : undefined}
              >
                {active && (
                  <span className="absolute inset-y-1 left-0 w-[3px] rounded-full" style={{ backgroundColor: BRAND.orange }} aria-hidden="true" />
                )}
                <Icon
                  className={cn('h-5 w-5 shrink-0 transition-colors', !active && 'text-white/60 group-hover:text-white/90')}
                  style={active ? { color: BRAND.orange } : undefined}
                />
                <span className={cn('transition-colors', active ? 'font-semibold text-white' : 'font-medium text-white/60 group-hover:text-white/90')}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 flex items-center gap-2.5 border-t border-white/10 px-2 pt-4">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: BRAND.navyLight }}
          >
            {initial}
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-white">{user.fullName}</p>
            <p className="truncate text-[11px] text-white/50">{user.role.replaceAll('_', ' ')}</p>
          </div>
        </div>
      </aside>
    </>
  );
}
