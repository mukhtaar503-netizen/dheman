'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import type { Role } from '@/types';

const NAV_ITEMS: { href: string; label: string; roles?: Role[] }[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/customers', label: 'Customers', roles: ['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER'] },
  { href: '/service-requests', label: 'Service Requests', roles: ['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER', 'CUSTOMER'] },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  React.useEffect(() => {
    if (!isLoading && !user) router.replace('/login');
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }

  const visibleNav = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user.role));

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r border-border bg-card p-4">
        <div className="mb-6 px-2">
          <p className="font-semibold">SMS</p>
          <p className="text-xs text-muted-foreground">{user.fullName}</p>
          <p className="text-xs text-muted-foreground">{user.role.replaceAll('_', ' ')}</p>
        </div>
        <nav className="space-y-1">
          {visibleNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-md px-2 py-1.5 text-sm ${pathname === item.href ? 'bg-muted font-medium' : 'text-muted-foreground hover:bg-muted'}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Button variant="ghost" size="sm" className="mt-6 w-full justify-start" onClick={logout}>
          Log out
        </Button>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
