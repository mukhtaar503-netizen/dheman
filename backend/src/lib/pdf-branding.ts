import fs from 'fs';
import path from 'path';

/** Shared Dheeman letterhead — logo/header/footer drawing used by every generated PDF (Quotations, Site Inspection reports, ...) so they all read as one consistent brand. */

export const NAVY = '#0F172A';
export const ORANGE = '#F97316';
export const GRAY = '#555555';
export const LIGHT_BORDER = '#dddddd';

export const PAGE_LEFT = 50;
export const PAGE_RIGHT = 545;
export const PAGE_WIDTH = PAGE_RIGHT - PAGE_LEFT;

// The Dheeman mark, bundled with the app so the logo always renders in exported PDFs
// even when no CompanySettings.logoUrl has been configured yet.
const BUNDLED_LOGO_PATH = path.resolve(process.cwd(), 'src/assets/dheeman-logo.png');
// Intrinsic size of the bundled asset (transparent PNG, navy diamond mark + orange icon),
// used to preserve its aspect ratio instead of hardcoding a display box.
const BUNDLED_LOGO_ASPECT = 663 / 781;

function readBundledLogo(): Buffer | null {
  try {
    return fs.readFileSync(BUNDLED_LOGO_PATH);
  } catch {
    return null;
  }
}

/** Prefers a configured Settings logo; falls back to the bundled Dheeman mark so the header never goes blank. */
export async function resolveLogoBuffer(logoUrl: string | null): Promise<Buffer | null> {
  if (logoUrl) {
    try {
      const res = await fetch(logoUrl);
      if (res.ok) return Buffer.from(await res.arrayBuffer());
    } catch {
      // A broken/unreachable configured logo URL must never fail the whole PDF — fall back below.
    }
  }
  return readBundledLogo();
}

export interface CompanySettingsForPdf {
  name: string;
  tagline: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  taxRegistrationNo: string | null;
}

/** Draws the logo + company identity block + orange accent rule. Returns the Y position to continue content from. */
export function drawBrandHeader(doc: PDFKit.PDFDocument, settings: CompanySettingsForPdf, logoBuffer: Buffer | null): number {
  const logoWidth = 60;
  if (logoBuffer) {
    try {
      doc.image(logoBuffer, PAGE_LEFT, 42, { width: logoWidth });
    } catch {
      // Corrupt image data — skip rather than abort the whole document.
    }
  }
  const headerX = logoBuffer ? PAGE_LEFT + logoWidth + 15 : PAGE_LEFT;
  doc.fontSize(17).font('Helvetica-Bold').fillColor(NAVY).text(settings.name, headerX, 44, { width: PAGE_RIGHT - headerX });
  let headerY = 44 + 20;
  if (settings.tagline) {
    doc.fontSize(9).font('Helvetica-Oblique').fillColor(ORANGE).text(settings.tagline, headerX, headerY, { width: PAGE_RIGHT - headerX });
    headerY += 13;
  }
  doc.fontSize(8.5).font('Helvetica').fillColor(GRAY);
  if (settings.address) {
    doc.text(settings.address, headerX, headerY, { width: PAGE_RIGHT - headerX });
    headerY += 11;
  }
  const contactLine = [settings.phone, settings.email, settings.website].filter(Boolean).join('   ·   ');
  if (contactLine) {
    doc.text(contactLine, headerX, headerY, { width: PAGE_RIGHT - headerX });
    headerY += 11;
  }
  if (settings.taxRegistrationNo) {
    doc.text(`Tax Reg. No: ${settings.taxRegistrationNo}`, headerX, headerY, { width: PAGE_RIGHT - headerX });
    headerY += 11;
  }
  doc.fillColor('#000000');

  const logoBottom = 42 + logoWidth * BUNDLED_LOGO_ASPECT;
  const ruleY = Math.max(headerY + 6, logoBottom + 10, 118);
  doc.moveTo(PAGE_LEFT, ruleY).lineTo(PAGE_RIGHT, ruleY).strokeColor(ORANGE).lineWidth(2).stroke();
  doc.lineWidth(1);
  return ruleY;
}

/** Draws the footer (orange rule + contact line) at a fixed position on the current page. */
export function drawBrandFooter(doc: PDFKit.PDFDocument, settings: CompanySettingsForPdf): void {
  const footerY = 780;
  // Text this close to the page's bottom margin makes pdfkit think it doesn't fit and
  // silently start a new page before drawing it — zero the bottom margin for this call
  // so it renders in place instead of pushing everything after it onto a phantom page.
  const savedBottomMargin = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;
  doc.moveTo(PAGE_LEFT, footerY).lineTo(PAGE_RIGHT, footerY).strokeColor(ORANGE).lineWidth(1.5).stroke();
  doc.lineWidth(1);
  doc.font('Helvetica').fontSize(8).fillColor(GRAY);
  const footerContact = [settings.address, settings.phone, settings.email, settings.website].filter(Boolean).join('   ·   ');
  if (footerContact) doc.text(footerContact, PAGE_LEFT, footerY + 8, { width: PAGE_WIDTH, align: 'center', lineBreak: false });
  doc.fillColor('#000000');
  doc.page.margins.bottom = savedBottomMargin;
}

/** Registers the footer on the first page and every page added after it. */
export function attachBrandFooter(doc: PDFKit.PDFDocument, settings: CompanySettingsForPdf): void {
  drawBrandFooter(doc, settings);
  doc.on('pageAdded', () => drawBrandFooter(doc, settings));
}
