'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Menu, LogOut, User as UserIcon, Search, HelpCircle, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/theme-toggle';
import { NotificationsMenu } from './notifications-menu';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { AuthUser } from '@/types';

export function Topbar({ user, onMenuClick, onLogout }: { user: AuthUser; onMenuClick: () => void; onLogout: () => void }) {
  const router = useRouter();
  const [search, setSearch] = React.useState('');

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur">
      <Button variant="ghost" size="sm" className="lg:hidden" onClick={onMenuClick} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </Button>

      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search customers…"
          className="h-9 pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && search.trim()) {
              router.push(`/customers?search=${encodeURIComponent(search.trim())}`);
            }
          }}
        />
      </div>

      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="sm" className="hidden sm:inline-flex" aria-label="Apps">
          <LayoutGrid className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="hidden sm:inline-flex" aria-label="Help">
          <HelpCircle className="h-4 w-4" />
        </Button>
        <ThemeToggle />
        <NotificationsMenu />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 pl-1.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
                <UserIcon className="h-4 w-4" />
              </span>
              <span className="hidden text-left leading-tight sm:block">
                <span className="block text-xs font-medium">{user.fullName}</span>
                <span className="block text-[10px] text-muted-foreground">{user.role.replaceAll('_', ' ')}</span>
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{user.role.replaceAll('_', ' ')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
