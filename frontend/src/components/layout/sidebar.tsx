'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, ClipboardList, FileText, FolderKanban, Wrench, Receipt, IdCard, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BRAND } from '@/lib/brand';
import { NAV_ITEMS } from './nav-items';
import type { AuthUser } from '@/types';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  '/dashboard': LayoutDashboard,
  '/customers': Users,
  '/service-requests': ClipboardList,
  '/quotations': FileText,
  '/projects': FolderKanban,
  '/technicians': Wrench,
  '/employees': IdCard,
  '/invoices': Receipt,
};

export function Sidebar({ user, open, onClose }: { user: AuthUser; open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const visibleNav = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user.role));

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
        <div className="mb-8 flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg font-bold text-white" style={{ backgroundColor: BRAND.orange }}>
              D
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">Dheman</p>
              <p className="text-[10px] text-white/50">Service Mgmt</p>
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
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  active ? 'bg-white/10 font-medium text-white' : 'text-white/60 hover:bg-white/5 hover:text-white',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 rounded-lg bg-white/5 px-3 py-2 text-xs text-white/70">
          <p className="truncate font-medium text-white">{user.fullName}</p>
          <p>{user.role.replaceAll('_', ' ')}</p>
        </div>
      </aside>
    </>
  );
}
