'use client';

import { useQuery } from '@tanstack/react-query';
import { Wallet } from 'lucide-react';
import { dashboardApi } from '@/lib/dashboard-api';
import { useDashboardFilterStore, buildRangeParams } from '@/stores/dashboard-filter-store';
import { BRAND } from '@/lib/brand';
import { Skeleton } from '@/components/ui/skeleton';

export function HeroValueTile() {
  const filters = useDashboardFilterStore();
  const params = buildRangeParams(filters);
  const { data, isLoading } = useQuery({ queryKey: ['dashboard-summary', params], queryFn: () => dashboardApi.summary(params) });

  const revenue = data?.cards.find((c) => c.key === 'monthlyRevenue')?.value ?? 0;

  if (isLoading) return <Skeleton className="h-24 w-full rounded-xl" />;

  return (
    <div className="flex items-center gap-3 rounded-xl p-5 text-white" style={{ backgroundColor: BRAND.navyDark }}>
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
        <Wallet className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-white/70">Monthly Revenue</p>
        <p className="text-2xl font-bold">{revenue.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}</p>
      </div>
    </div>
  );
}
