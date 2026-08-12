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

const RTF = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

/** "2 minutes ago" / "Yesterday" / falls back to a plain date once it's more than a week old. */
function relativeTime(iso: string) {
  const diffMs = new Date(iso).getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60_000);
  if (Math.abs(diffMinutes) < 60) return RTF.format(diffMinutes, 'minute');
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return RTF.format(diffHours, 'hour');
  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 7) return RTF.format(diffDays, 'day');
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Small, static list — the dashboard only ever shows the latest 5 events its parent already
 *  fetched as part of the single summary call. No pagination, no independent query. */
export function RecentActivity({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) return null;

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-border">
          {items.map((event) => {
            const Icon = ICONS[event.type];
            return (
              <li key={`${event.type}-${event.id}`} className="flex items-start gap-3 px-6 py-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{event.description}</p>
                  <p className="text-xs text-muted-foreground">{relativeTime(event.at)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
