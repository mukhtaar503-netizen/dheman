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

// Standard "call" glyph (telephone handset silhouette), defined on a 24x24 grid — the same
// path used by Material Design's phone icon — so the header shows a recognizable handset
// rather than a hand-built abstract shape. Drawn via PDFKit's SVG-path support and scaled to
// whatever pixel size is requested.
const PHONE_HANDSET_PATH =
  'M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z';

/** Draws a standard telephone handset icon with its top-left corner at (x, y). */
function drawPhoneIcon(doc: PDFKit.PDFDocument, x: number, y: number, size: number, color: string): void {
  doc.save();
  doc.translate(x, y);
  doc.scale(size / 24);
  doc.path(PHONE_HANDSET_PATH).fill(color);
  doc.restore();
}

/** A short line — small diamond — short line, centered on cx. Purely decorative. */
function drawDecorativeDivider(doc: PDFKit.PDFDocument, cx: number, cy: number, color: string): void {
  const halfSpan = 30;
  const gap = 6;
  const diamond = 5;
  doc.strokeColor(color).lineWidth(1);
  doc.moveTo(cx - halfSpan - gap, cy).lineTo(cx - gap, cy).stroke();
  doc.moveTo(cx + gap, cy).lineTo(cx + halfSpan + gap, cy).stroke();
  doc.save();
  doc.translate(cx, cy);
  doc.rotate(45);
  doc.rect(-diamond / 2, -diamond / 2, diamond, diamond).fill(color);
  doc.restore();
  doc.lineWidth(1);
}

/**
 * Draws the letterhead: identical logo marks flanking a centered company identity block
 * (name / subtitle / decorative divider / phone), then a full-width orange rule beneath the
 * whole block. Both logos are the plain diamond mark only — no name/tagline text is drawn
 * next to them, that identity text lives solely in the centered block. Returns the Y position
 * to continue page content from.
 */
export function drawBrandHeader(doc: PDFKit.PDFDocument, settings: CompanySettingsForPdf, logoBuffer: Buffer | null): number {
  const centerX = (PAGE_LEFT + PAGE_RIGHT) / 2;
  const nameWidth = 300;
  const subtitleWidth = 380;
  const blockTop = 28;

  const nameText = settings.name.toUpperCase();
  doc.font('Times-Bold').fontSize(15);
  const nameHeight = doc.heightOfString(nameText, { width: nameWidth, align: 'center' });

  doc.font('Helvetica').fontSize(8.5);
  const subtitleHeight = settings.tagline ? doc.heightOfString(settings.tagline, { width: subtitleWidth, align: 'center' }) : 0;

  const phoneText = settings.phone ?? null;
  const phoneIconSize = 8;
  doc.font('Helvetica-Bold').fontSize(10);
  const phoneTextWidth = phoneText ? doc.widthOfString(phoneText) : 0;
  const phoneHeight = phoneText ? doc.heightOfString(phoneText, { width: phoneTextWidth + 1 }) : 0;

  const gapNameToSubtitle = 5;
  const gapSubtitleToDivider = 9;
  const dividerHeight = 5;
  const gapDividerToPhone = 9;

  const blockHeight =
    nameHeight +
    (settings.tagline ? gapNameToSubtitle + subtitleHeight : 0) +
    gapSubtitleToDivider +
    dividerHeight +
    (phoneText ? gapDividerToPhone + phoneHeight : 0);

  // Logos: identical size, vertically centered against the whole identity block.
  const logoWidth = 44;
  const logoHeight = logoWidth * BUNDLED_LOGO_ASPECT;
  const logoY = blockTop + (blockHeight - logoHeight) / 2;
  if (logoBuffer) {
    try {
      doc.image(logoBuffer, PAGE_LEFT, logoY, { width: logoWidth });
      doc.image(logoBuffer, PAGE_RIGHT - logoWidth, logoY, { width: logoWidth });
    } catch {
      // Corrupt image data — skip rather than abort the whole document.
    }
  }

  // Centered identity block.
  let y = blockTop;
  doc.font('Times-Bold').fontSize(15).fillColor(NAVY).text(nameText, centerX - nameWidth / 2, y, { width: nameWidth, align: 'center' });
  y += nameHeight;

  if (settings.tagline) {
    y += gapNameToSubtitle;
    doc.font('Helvetica').fontSize(8.5).fillColor(GRAY).text(settings.tagline, centerX - subtitleWidth / 2, y, { width: subtitleWidth, align: 'center' });
    y += subtitleHeight;
  }

  y += gapSubtitleToDivider;
  drawDecorativeDivider(doc, centerX, y + dividerHeight / 2, ORANGE);
  y += dividerHeight;

  if (phoneText) {
    y += gapDividerToPhone;
    const totalWidth = phoneIconSize + 6 + phoneTextWidth;
    const startX = centerX - totalWidth / 2;
    drawPhoneIcon(doc, startX, y + (phoneHeight - phoneIconSize) / 2, phoneIconSize, ORANGE);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(NAVY).text(phoneText, startX + phoneIconSize + 6, y, { width: phoneTextWidth + 1, lineBreak: false });
    y += phoneHeight;
  }
  doc.fillColor('#000000');

  const logoBottom = logoY + logoHeight;
  const ruleY = Math.max(blockTop + blockHeight + 12, logoBottom + 12, 118);
  doc.moveTo(PAGE_LEFT, ruleY).lineTo(PAGE_RIGHT, ruleY).strokeColor(ORANGE).lineWidth(1.5).stroke();
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
