import Link from 'next/link';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { KpiCard as KpiCardType } from '@/types';

// Only link to routes that actually exist in this app — unknown/report hrefs render as a plain (non-link) card.
const KNOWN_ROUTES = new Set(['/customers', '/projects', '/service-requests', '/quotations', '/invoices', '/technicians']);

function formatValue(card: KpiCardType) {
  if (card.format === 'currency') return card.value.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  if (card.format === 'currency-count') {
    return `${card.value} (${(card.secondaryValue ?? 0).toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })})`;
  }
  return card.value.toLocaleString();
}

function resolvableHref(href?: string) {
  if (!href) return undefined;
  const base = href.split('?')[0];
  return KNOWN_ROUTES.has(base) ? href : undefined;
}

export function KpiCard({ card }: { card: KpiCardType }) {
  const trend = card.percentChange;
  const href = resolvableHref(card.href);

  const body = (
    <Card className={cn('transition-shadow', href && 'hover:shadow-md')}>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{card.label}</p>
        <p className="mt-1 text-2xl font-semibold">{formatValue(card)}</p>
        {trend !== undefined && trend !== null && (
          <div className={cn('mt-1 flex items-center gap-1 text-xs', trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-destructive' : 'text-muted-foreground')}>
            {trend > 0 ? <ArrowUpRight className="h-3 w-3" /> : trend < 0 ? <ArrowDownRight className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
            <span>{Math.abs(trend)}% vs previous period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}
