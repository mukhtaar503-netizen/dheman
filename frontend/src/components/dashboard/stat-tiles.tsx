'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Wrench, FolderKanban, ClipboardList, TrendingUp } from 'lucide-react';
import { dashboardApi } from '@/lib/dashboard-api';
import { useDashboardFilterStore, buildRangeParams } from '@/stores/dashboard-filter-store';
import { BRAND } from '@/lib/brand';
import { Skeleton } from '@/components/ui/skeleton';

const TILES = [
  { key: 'activeTechnicians', label: 'Active Technicians', icon: Wrench, color: BRAND.orange, href: '/technicians' },
  { key: 'activeProjects', label: 'Active Projects', icon: FolderKanban, color: BRAND.navy, href: '/projects' },
  { key: 'pendingServiceRequests', label: 'Pending Requests', icon: ClipboardList, color: BRAND.teal, href: '/service-requests' },
] as const;

export function StatTiles() {
  const filters = useDashboardFilterStore();
  const params = buildRangeParams(filters);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-summary', params],
    queryFn: () => dashboardApi.summary(params),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {TILES.map((t) => (
          <Skeleton key={t.key} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const cardByKey = new Map(data?.cards.map((c) => [c.key, c]));

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {TILES.map((tile) => {
        const card = cardByKey.get(tile.key);
        const Icon = tile.icon;
        return (
          <Link key={tile.key} href={tile.href} className="block">
            <div className="flex items-center justify-between rounded-xl p-5 text-white shadow-sm transition-transform hover:-translate-y-0.5" style={{ backgroundColor: tile.color }}>
              <div>
                <p className="text-xs font-medium text-white/80">{tile.label}</p>
                <p className="mt-1 text-3xl font-bold">{card?.value ?? 0}</p>
                {card?.percentChange !== undefined && card?.percentChange !== null && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-white/80">
                    <TrendingUp className="h-3 w-3" />
                    {card.percentChange > 0 ? '+' : ''}
                    {card.percentChange}% vs previous
                  </p>
                )}
              </div>
              <Icon className="h-9 w-9 text-white/70" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
