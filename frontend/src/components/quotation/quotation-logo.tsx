import { cn } from '@/lib/utils';

interface QuotationLogoProps {
  className?: string;
}

/**
 * The Dheeman mark — a transparent PNG (navy diamond outline + orange icon) sized only
 * via CSS height, so the browser derives width from the asset's own aspect ratio instead
 * of a hardcoded box that could stretch or crop it.
 */
export function QuotationLogo({ className }: QuotationLogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo/dheeman-mark.png"
      alt="Dheeman Decoration and Furniture Solution"
      loading="eager"
      className={cn('h-14 w-auto object-contain', className)}
    />
  );
}
