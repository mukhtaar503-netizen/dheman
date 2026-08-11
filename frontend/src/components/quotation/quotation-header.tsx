'use client';

import { useQuery } from '@tanstack/react-query';
import { Phone } from 'lucide-react';
import { api } from '@/lib/api-client';
import type { CompanySettings } from '@/types';
import { QuotationLogo } from './quotation-logo';

/**
 * The Quotation letterhead: identical logo marks flanking a centered company identity block.
 * Deliberately fixed to a white paper / navy-and-orange brand palette regardless of the app's
 * dark/light theme — this is the same "document" that gets exported to PDF (see
 * lib/pdf-branding.ts drawBrandHeader), so it should look identical to it.
 */
export function QuotationHeader() {
  const { data: settings } = useQuery({
    queryKey: ['company-settings'],
    queryFn: () => api.get<CompanySettings>('/settings'),
  });

  const name = settings?.name ?? 'Dheeman Decoration and Furniture Solution';

  return (
    <div className="rounded-lg border border-[#e5e7eb] bg-white p-6 text-[#0F172A]">
      <div className="flex items-center justify-between gap-3">
        <QuotationLogo className="h-11 w-auto shrink-0" />
        <div className="flex flex-col items-center gap-1.5 px-2 text-center">
          <p className="font-serif text-lg font-bold uppercase leading-tight tracking-wide text-[#0F172A]">{name}</p>
          {settings?.tagline && <p className="text-xs text-[#555555]">{settings.tagline}</p>}
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="h-px w-8 bg-[#F97316]" />
            <span className="h-1.5 w-1.5 rotate-45 bg-[#F97316]" />
            <span className="h-px w-8 bg-[#F97316]" />
          </div>
          {settings?.phone && (
            <p className="flex items-center gap-1.5 text-sm font-bold text-[#0F172A]">
              <Phone className="h-3.5 w-3.5 text-[#F97316]" />
              {settings.phone}
            </p>
          )}
        </div>
        <QuotationLogo className="h-11 w-auto shrink-0" />
      </div>
      <div className="mt-4 h-[3px] w-full rounded bg-[#F97316]" />
    </div>
  );
}
