'use client';

import { LogIn, UserPlus, FileText, CheckCircle2, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ActivityItem, ActivityType } from '@/types';

const ICONS: Record<ActivityType, React.ComponentType<{ className?: string }>> = {
  LOGIN: LogIn,
  NEW_CUSTOMER: UserPlus,
  NEW_QUOTATION: FileText,
  PROJECT_COMPLETED: CheckCircle2,
  PAYMENT: Wallet,
};

/** Small, static list — the dashboard only ever shows the latest 5 events its parent already
 *  fetched as part of the single summary call. No pagination, no independent query. */
export function RecentActivity({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {items.map((event) => {
            const Icon = ICONS[event.type];
            return (
              <li key={`${event.type}-${event.id}`} className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-muted p-1.5">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{event.description}</p>
                  <p className="text-xs text-muted-foreground">{new Date(event.at).toLocaleString()}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
