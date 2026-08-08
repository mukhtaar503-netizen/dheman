'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { CompanySettings } from '@/types';
import { QuotationLogo } from './quotation-logo';

/**
 * The Quotation letterhead: logo + company identity block. Deliberately fixed to a white
 * paper / navy-and-orange brand palette regardless of the app's dark/light theme — this is
 * the same "document" that gets exported to PDF, so it should look identical to it.
 */
export function QuotationHeader() {
  const { data: settings } = useQuery({
    queryKey: ['company-settings'],
    queryFn: () => api.get<CompanySettings>('/settings'),
  });

  const contactLine = [settings?.phone, settings?.email, settings?.website].filter(Boolean).join('   ·   ');

  return (
    <div className="rounded-lg border border-[#e5e7eb] bg-white p-6 text-[#0F172A]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <QuotationLogo />
          <div className="min-w-0">
            <p className="text-lg font-bold leading-tight">{settings?.name ?? 'Dheeman Decoration And Furniture'}</p>
            {settings?.tagline && <p className="text-sm font-medium italic text-[#F97316]">{settings.tagline}</p>}
          </div>
        </div>
        <div className="space-y-0.5 text-xs text-[#555555] sm:text-right">
          {settings?.address && <p>{settings.address}</p>}
          {contactLine && <p>{contactLine}</p>}
          {settings?.taxRegistrationNo && <p>Tax Reg. No: {settings.taxRegistrationNo}</p>}
        </div>
      </div>
      <div className="mt-4 h-[3px] w-full rounded bg-[#F97316]" />
    </div>
  );
}
