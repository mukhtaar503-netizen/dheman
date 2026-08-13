'use client';

import { LogIn, UserPlus, FileText, CheckCircle2, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { surfaceClass, surfaceStyle } from './surface';
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

// The backend only ever sends a single combined `description` string (e.g. "New customer
// registered: ALloore Hotel"). Splitting it here — purely a display concern — recovers the
// title/secondary-line layout without asking the backend for a new shape or an extra field.
function splitDescription(description: string): { title: string; secondary?: string } {
  const sep = description.includes(': ') ? ': ' : description.includes(' — ') ? ' — ' : null;
  if (!sep) return { title: description };
  const idx = description.indexOf(sep);
  return { title: description.slice(0, idx), secondary: description.slice(idx + sep.length) };
}

/** Small, static list — the dashboard only ever shows the latest 5 events its parent already
 *  fetched as part of the single summary call. No pagination, no independent query. */
export function RecentActivity({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className={cn(surfaceClass, 'p-5')} style={surfaceStyle}>
      <h2 className="mb-2 text-[18px] font-semibold text-white">Recent Activity</h2>
      <ul className="divide-y divide-white/10">
        {items.map((event) => {
          const Icon = ICONS[event.type];
          const { title, secondary } = splitDescription(event.description);
          return (
            <li key={`${event.type}-${event.id}`} className="flex items-start gap-2.5 py-2">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10">
                <Icon className="h-3 w-3 text-white/80" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm leading-tight text-white">{title}</p>
                {secondary && <p className="truncate text-xs text-white/60">{secondary}</p>}
                <p className="text-[11px] text-white/40">{relativeTime(event.at)}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
