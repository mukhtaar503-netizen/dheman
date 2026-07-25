'use client';

import { useQuery } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface CompanySettings {
  name: string;
  currency: string;
  taxRatePercent: string | number;
  quotationValidityDays: number;
}

/** Replaces the reference design's weather widget with something actually relevant to an ERP dashboard. */
export function CompanyOverviewCard() {
  const { data, isLoading } = useQuery({ queryKey: ['company-settings'], queryFn: () => api.get<CompanySettings>('/settings') });

  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Building2 className="h-5 w-5" />
        </div>
        {isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          data && (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{data.name}</p>
              <p className="text-xs text-muted-foreground">
                {data.currency} · Tax {Number(data.taxRatePercent)}% · Quotes valid {data.quotationValidityDays}d
              </p>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}
