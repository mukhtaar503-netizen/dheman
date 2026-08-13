'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  ClipboardCheck,
  Wrench,
  FileText,
  Briefcase,
  HardHat,
  UserRoundCog,
  Receipt,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BRAND } from '@/lib/brand';
import { NAV_ITEMS } from './nav-items';
import type { AuthUser } from '@/types';

const ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  '/dashboard': LayoutDashboard,
  '/customers': Users,
  '/service-requests': ClipboardList,
  '/site-inspections': ClipboardCheck,
  '/services': Wrench,
  '/quotations': FileText,
  '/projects': Briefcase,
  '/technicians': HardHat,
  '/employees': UserRoundCog,
  '/invoices': Receipt,
};

// Same background-color/color/box-shadow trio on every nav item — hover and active states are
// just different strengths of this one transition, not separate effects.
const navTransition = 'transition-[background-color,color,box-shadow] duration-[180ms] ease-out';

interface SidebarProps {
  user: AuthUser;
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export function Sidebar({ user, open, onClose, collapsed, onToggleCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const visibleNav = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user.role));
  const initial = user.fullName.trim().charAt(0).toUpperCase() || '?';

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={onClose} />}
      <aside
        style={{ backgroundColor: BRAND.navyDark }}
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-60 flex-col overflow-hidden px-3 py-5 text-white transition-[width,transform] duration-200 ease-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
          collapsed && 'lg:w-[78px]',
        )}
      >
        {/* Header stays a row (brand left, controls right) on mobile and when expanded; when
            collapsed on desktop it switches to a centered column (logo, then toggle stacked
            below) so the toggle stays fully inside the rail's own background instead of
            floating over the Topbar. */}
        <div
          className={cn(
            'mb-6 flex items-center justify-between gap-3 border-b border-white/10 px-2 pb-5',
            collapsed && 'lg:flex-col lg:justify-center lg:px-0',
          )}
        >
          <div className={cn('flex min-w-0 items-center gap-2.5', collapsed && 'lg:gap-0')}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo/dheeman-mark.png" alt="Dheman" className="h-9 w-9 shrink-0 object-contain" />
            <div className={cn('min-w-0', collapsed && 'lg:hidden')}>
              <p className="truncate text-[15px] font-bold leading-tight">Dheman</p>
              <p className="truncate text-[11px] text-white/50">Service Mgmt</p>
            </div>
          </div>
          <button className="shrink-0 text-white/70 lg:hidden" onClick={onClose} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
          {/* Desktop-only collapse toggle. Mobile relies on the Topbar's menu button to open
              this drawer and the X above to close it. */}
          <button
            onClick={onToggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition-colors duration-200 hover:bg-white/10 hover:text-white lg:flex"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        <p className={cn('mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/30', collapsed && 'lg:hidden')}>Navigation</p>
        <nav className="flex-1 space-y-1">
          {visibleNav.map((item) => {
            const Icon = ICONS[item.href] ?? LayoutDashboard;
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                title={item.label}
                className={cn(
                  navTransition,
                  'group relative flex items-center gap-3 rounded-[10px] py-2.5 pl-3.5 pr-3.5 text-sm',
                  collapsed && 'lg:justify-center lg:px-0',
                  !active && 'hover:bg-white/5 hover:shadow-[0_1px_3px_rgba(0,0,0,0.3)]',
                )}
                style={active ? { backgroundColor: `${BRAND.orange}1F`, boxShadow: `0 1px 3px rgba(0,0,0,0.35)` } : undefined}
              >
                {active && (
                  <span className="absolute inset-y-1 left-0 w-[3px] rounded-full" style={{ backgroundColor: BRAND.orange }} aria-hidden="true" />
                )}
                <Icon
                  className={cn(navTransition, 'h-5 w-5 shrink-0', !active && 'text-white/60 group-hover:text-white/90')}
                  style={active ? { color: BRAND.orange } : undefined}
                />
                <span
                  className={cn(
                    navTransition,
                    'whitespace-nowrap',
                    collapsed && 'lg:hidden',
                    active ? 'font-semibold text-white' : 'font-medium text-white/60 group-hover:text-white/90',
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className={cn('mt-6 flex items-center gap-2.5 border-t border-white/10 px-2 pt-4', collapsed && 'lg:justify-center lg:px-0')}>
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: BRAND.navyLight }}
          >
            {initial}
          </span>
          <div className={cn('min-w-0', collapsed && 'lg:hidden')}>
            <p className="truncate text-xs font-medium text-white">{user.fullName}</p>
            <p className="truncate text-[11px] text-white/50">{user.role.replaceAll('_', ' ')}</p>
          </div>
        </div>
      </aside>
    </>
  );
}
