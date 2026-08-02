'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { CompanySettings } from '@/types';

interface QuotationFooterProps {
  termsAndConditions?: string | null;
}

/** Signature blocks + Terms & Conditions + repeated company contact — the printable footer. */
export function QuotationFooter({ termsAndConditions }: QuotationFooterProps) {
  const { data: settings } = useQuery({
    queryKey: ['company-settings'],
    queryFn: () => api.get<CompanySettings>('/settings'),
  });

  const contactLine = [settings?.address, settings?.phone, settings?.email, settings?.website].filter(Boolean).join('   ·   ');

  return (
    <div className="space-y-6 rounded-lg border border-[#e5e7eb] bg-white p-6 text-[#0F172A]">
      {termsAndConditions && (
        <div>
          <p className="text-sm font-semibold">Terms &amp; Conditions</p>
          <p className="mt-1 whitespace-pre-line text-xs text-[#555555]">{termsAndConditions}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 pt-4 sm:grid-cols-2">
        <div>
          <div className="h-px w-full bg-[#0F172A]" />
          <p className="mt-2 text-xs text-[#555555]">Customer Signature</p>
        </div>
        <div>
          <div className="h-px w-full bg-[#0F172A]" />
          <p className="mt-2 text-xs text-[#555555]">Authorized Signature</p>
        </div>
      </div>

      {contactLine && <div className="border-t-2 border-[#F97316] pt-3 text-center text-xs text-[#555555]">{contactLine}</div>}
    </div>
  );
}
