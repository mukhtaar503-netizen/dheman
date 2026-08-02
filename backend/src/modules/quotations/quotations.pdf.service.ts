import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import type { Prisma } from '@prisma/client';
import type { Decimal } from '@prisma/client/runtime/library';
import { getSettings } from '@/modules/settings/settings.service';

type QuotationForPdf = Prisma.QuotationGetPayload<{
  include: {
    customer: true;
    serviceRequest: { include: { serviceCategory: true; service: true } };
    siteInspection: true;
    lineItems: true;
    createdBy: { select: { id: true; fullName: true } };
  };
}>;

const CATEGORY_LABEL: Record<string, string> = {
  MATERIAL: 'Material',
  LABOR: 'Labor',
  TRANSPORTATION: 'Transportation',
};

// Brand palette (matches the app's Quotation UI): white paper, navy text, orange accent.
const NAVY = '#0F172A';
const ORANGE = '#F97316';
const GRAY = '#555555';
const LIGHT_BORDER = '#dddddd';

const PAGE_LEFT = 50;
const PAGE_RIGHT = 545;
const PAGE_WIDTH = PAGE_RIGHT - PAGE_LEFT;

// The Dheeman mark, bundled with the app so the logo always renders in exported PDFs
// even when no CompanySettings.logoUrl has been configured yet.
const BUNDLED_LOGO_PATH = path.resolve(process.cwd(), 'src/assets/dheeman-logo.png');
// Intrinsic size of the bundled asset (transparent PNG, navy diamond mark + orange icon),
// used to preserve its aspect ratio instead of hardcoding a display box.
const BUNDLED_LOGO_ASPECT = 663 / 781;

function money(n: number | string | Decimal, currency: string) {
  return `${currency} ${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function readBundledLogo(): Buffer | null {
  try {
    return fs.readFileSync(BUNDLED_LOGO_PATH);
  } catch {
    return null;
  }
}

/** Prefers a configured Settings logo; falls back to the bundled Dheeman mark so the header never goes blank. */
async function resolveLogoBuffer(logoUrl: string | null): Promise<Buffer | null> {
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

/** Renders a professional Quotation PDF and resolves to the full document Buffer. */
export async function generateQuotationPdf(quotation: QuotationForPdf): Promise<Buffer> {
  const settings = await getSettings();
  const logoBuffer = await resolveLogoBuffer(settings.logoUrl);
  const currency = settings.currency ?? 'USD';

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const drawFooter = () => {
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
    };
    // pdfkit only emits 'pageAdded' for pages after the first, so the initial page's
    // footer is drawn once up front and every subsequent addPage() picks up the listener.
    drawFooter();
    doc.on('pageAdded', drawFooter);

    // ── Company header ──────────────────────────────────────────────────────
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

    // ── Quotation info ───────────────────────────────────────────────────────
    let y = ruleY + 15;
    doc.fontSize(16).font('Helvetica-Bold').fillColor(NAVY).text('QUOTATION', PAGE_LEFT, y);
    doc.fillColor('#000000');
    doc.fontSize(10).font('Helvetica');
    const infoTop = y + 25;
    doc.text(`Quotation No: ${quotation.quotationNo}`, PAGE_LEFT, infoTop);
    doc.text(`Date: ${quotation.createdAt.toLocaleDateString()}`, PAGE_LEFT, infoTop + 15);
    doc.text(`Valid Until: ${quotation.validUntil ? quotation.validUntil.toLocaleDateString() : '—'}`, PAGE_LEFT, infoTop + 30);
    doc.text(`Status: ${quotation.status}`, PAGE_LEFT, infoTop + 45);
    if (quotation.createdBy) {
      doc.text(`Sales Representative: ${quotation.createdBy.fullName}`, PAGE_LEFT, infoTop + 60);
    }

    doc.font('Helvetica-Bold').text('Customer', 320, infoTop);
    doc.font('Helvetica');
    doc.text(quotation.customer.companyName || quotation.customer.fullName, 320, infoTop + 15);
    if (quotation.customer.companyName) doc.text(quotation.customer.fullName, 320, infoTop + 28);
    if (quotation.customer.email) doc.text(quotation.customer.email, 320, infoTop + 41);
    doc.text(quotation.customer.phone, 320, infoTop + 54);

    // ── Project info ─────────────────────────────────────────────────────────
    let py = infoTop + 80;
    doc.font('Helvetica-Bold').fontSize(11).fillColor(NAVY).text('Project Information', PAGE_LEFT, py);
    doc.fillColor('#000000');
    py += 18;
    doc.font('Helvetica').fontSize(10);
    if (quotation.title) {
      doc.text(`Project Name: ${quotation.title}`, PAGE_LEFT, py);
      py += 14;
    }
    doc.text(`Service Type: ${quotation.serviceRequest.service?.serviceName ?? quotation.serviceRequest.serviceCategory.name}`, PAGE_LEFT, py);
    py += 14;
    if (quotation.serviceRequest.projectLocation) {
      doc.text(`Project Location: ${quotation.serviceRequest.projectLocation}`, PAGE_LEFT, py);
      py += 14;
    }
    if (quotation.siteInspection) {
      doc.text(
        `Site Inspection Reference: ${quotation.siteInspection.id.slice(0, 8).toUpperCase()} (${quotation.siteInspection.scheduledAt.toLocaleDateString()})`,
        PAGE_LEFT,
        py,
      );
      py += 14;
    }
    if (quotation.description) {
      doc.text(quotation.description, PAGE_LEFT, py, { width: PAGE_WIDTH });
      py += 14 * Math.ceil(quotation.description.length / 100);
    }

    // ── Cost table ───────────────────────────────────────────────────────────
    py += 16;
    const tableTop = py;
    const col = { desc: PAGE_LEFT, qty: 300, unit: 345, price: 400, total: 470 };
    doc.font('Helvetica-Bold').fontSize(9).fillColor(NAVY);
    doc.text('Description', col.desc, tableTop, { width: 245 });
    doc.text('Qty', col.qty, tableTop, { width: 40, align: 'right' });
    doc.text('Unit', col.unit, tableTop, { width: 50 });
    doc.text('Unit Price', col.price, tableTop, { width: 65, align: 'right' });
    doc.text('Total', col.total, tableTop, { width: 75, align: 'right' });
    doc.fillColor('#000000');
    doc.moveTo(PAGE_LEFT, tableTop + 14).lineTo(PAGE_RIGHT, tableTop + 14).strokeColor(NAVY).stroke();

    doc.font('Helvetica').fontSize(9);
    let rowY = tableTop + 20;
    for (const item of quotation.lineItems) {
      if (rowY > 700) {
        doc.addPage();
        rowY = 50;
      }
      const label = item.itemName ? `${item.itemName} — ${item.description}` : item.description;
      doc.text(label, col.desc, rowY, { width: 245 });
      doc.text(String(item.quantity), col.qty, rowY, { width: 40, align: 'right' });
      doc.text(item.unit, col.unit, rowY, { width: 50 });
      doc.text(money(item.unitPrice, currency), col.price, rowY, { width: 65, align: 'right' });
      doc.text(money(item.subtotal, currency), col.total, rowY, { width: 75, align: 'right' });
      doc.font('Helvetica').fontSize(7.5).fillColor(GRAY);
      doc.text(CATEGORY_LABEL[item.category] ?? item.category, col.desc, rowY + 11, { width: 245 });
      doc.fillColor('#000000').font('Helvetica').fontSize(9);
      rowY += 26;
    }
    doc.moveTo(PAGE_LEFT, rowY).lineTo(PAGE_RIGHT, rowY).strokeColor(LIGHT_BORDER).stroke();
    rowY += 12;

    // ── Summary ──────────────────────────────────────────────────────────────
    if (rowY > 660) {
      doc.addPage();
      rowY = 50;
    }
    const summaryLabelX = 330;
    const summaryValueX = 470;
    const summaryValueWidth = 75;
    doc.font('Helvetica').fontSize(10);
    doc.text('Material Cost:', summaryLabelX, rowY, { width: 130 });
    doc.text(money(quotation.materialCost, currency), summaryValueX, rowY, { width: summaryValueWidth, align: 'right' });
    rowY += 15;
    doc.text('Labor Cost:', summaryLabelX, rowY, { width: 130 });
    doc.text(money(quotation.laborCost, currency), summaryValueX, rowY, { width: summaryValueWidth, align: 'right' });
    rowY += 15;
    doc.text('Transportation Cost:', summaryLabelX, rowY, { width: 130 });
    doc.text(money(quotation.transportationCost, currency), summaryValueX, rowY, { width: summaryValueWidth, align: 'right' });
    rowY += 15;
    doc.moveTo(summaryLabelX, rowY).lineTo(PAGE_RIGHT, rowY).strokeColor(LIGHT_BORDER).stroke();
    rowY += 8;
    doc.font('Helvetica-Bold');
    doc.text('Subtotal:', summaryLabelX, rowY, { width: 130 });
    doc.text(money(quotation.subtotal, currency), summaryValueX, rowY, { width: summaryValueWidth, align: 'right' });
    doc.font('Helvetica');
    rowY += 16;
    if (Number(quotation.discountAmount) > 0) {
      const discountLabel = quotation.discountType === 'PERCENTAGE' ? `Discount (${quotation.discountValue}%):` : 'Discount:';
      doc.text(discountLabel, summaryLabelX, rowY, { width: 130 });
      doc.text(`-${money(quotation.discountAmount, currency)}`, summaryValueX, rowY, { width: summaryValueWidth, align: 'right' });
      rowY += 16;
    }
    doc.text(`VAT (${quotation.taxRatePercent}%):`, summaryLabelX, rowY, { width: 130 });
    doc.text(money(quotation.taxAmount, currency), summaryValueX, rowY, { width: summaryValueWidth, align: 'right' });
    rowY += 16;
    doc.moveTo(summaryLabelX, rowY).lineTo(PAGE_RIGHT, rowY).strokeColor(NAVY).stroke();
    rowY += 8;
    doc.font('Helvetica-Bold').fontSize(13).fillColor(ORANGE);
    doc.text('Grand Total:', summaryLabelX, rowY + 3, { width: 130 });
    doc.text(money(quotation.total, currency), summaryLabelX + 130, rowY, { width: PAGE_RIGHT - (summaryLabelX + 130), align: 'right' });
    doc.fillColor('#000000');
    rowY += 32;

    // ── Terms & Conditions ───────────────────────────────────────────────────
    if (quotation.termsAndConditions) {
      if (rowY > 640) {
        doc.addPage();
        rowY = 50;
      }
      doc.font('Helvetica-Bold').fontSize(10).fillColor(NAVY).text('Terms & Conditions', PAGE_LEFT, rowY);
      doc.fillColor('#000000');
      rowY += 15;
      doc.font('Helvetica').fontSize(9).text(quotation.termsAndConditions, PAGE_LEFT, rowY, { width: PAGE_WIDTH });
      rowY += 15 * Math.ceil(quotation.termsAndConditions.length / 110) + 10;
    }

    // ── Signatures ────────────────────────────────────────────────────────────
    if (rowY > 690) {
      doc.addPage();
      rowY = 50;
    }
    rowY += 20;
    doc.moveTo(PAGE_LEFT, rowY + 30).lineTo(230, rowY + 30).strokeColor(NAVY).stroke();
    doc.moveTo(320, rowY + 30).lineTo(PAGE_RIGHT, rowY + 30).strokeColor(NAVY).stroke();
    doc.font('Helvetica').fontSize(9).fillColor(GRAY);
    doc.text('Customer Signature', PAGE_LEFT, rowY + 35);
    doc.text('Authorized Signature', 320, rowY + 35);
    doc.fillColor('#000000');

    doc.end();
  });
}
