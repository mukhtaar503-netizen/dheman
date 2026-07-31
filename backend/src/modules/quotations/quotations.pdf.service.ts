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
  };
}>;

const CATEGORY_LABEL: Record<string, string> = {
  MATERIAL: 'Material',
  LABOR: 'Labor',
  TRANSPORTATION: 'Transportation',
};

function money(n: number | string | Decimal, currency: string) {
  return `${currency} ${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function fetchLogoBuffer(logoUrl: string | null): Promise<Buffer | null> {
  if (!logoUrl) return null;
  try {
    const res = await fetch(logoUrl);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    // A broken/unreachable logo URL must never fail the whole PDF — fall back to text-only header.
    return null;
  }
}

/** Renders a professional Quotation PDF and resolves to the full document Buffer. */
export async function generateQuotationPdf(quotation: QuotationForPdf): Promise<Buffer> {
  const settings = await getSettings();
  const logoBuffer = await fetchLogoBuffer(settings.logoUrl);
  const currency = settings.currency ?? 'USD';

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ── Company header ──────────────────────────────────────────────────────
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, 50, 45, { width: 70 });
      } catch {
        // Corrupt image data — skip rather than abort the whole document.
      }
    }
    const headerX = logoBuffer ? 130 : 50;
    doc.fontSize(18).font('Helvetica-Bold').text(settings.name, headerX, 50);
    doc.fontSize(9).font('Helvetica').fillColor('#555555');
    if (settings.address) doc.text(settings.address, headerX, 72);
    const contactLine = [settings.phone, settings.email].filter(Boolean).join('   ·   ');
    if (contactLine) doc.text(contactLine, headerX, 86);
    if (settings.taxRegistrationNo) doc.text(`Tax Reg. No: ${settings.taxRegistrationNo}`, headerX, 100);
    doc.fillColor('#000000');

    doc.moveTo(50, 125).lineTo(545, 125).strokeColor('#dddddd').stroke();

    // ── Quotation info ───────────────────────────────────────────────────────
    doc.fontSize(16).font('Helvetica-Bold').text('QUOTATION', 50, 140);
    doc.fontSize(10).font('Helvetica');
    const infoTop = 165;
    doc.text(`Quotation No: ${quotation.quotationNo}`, 50, infoTop);
    doc.text(`Date: ${quotation.createdAt.toLocaleDateString()}`, 50, infoTop + 15);
    doc.text(`Valid Until: ${quotation.validUntil ? quotation.validUntil.toLocaleDateString() : '—'}`, 50, infoTop + 30);
    doc.text(`Status: ${quotation.status}`, 50, infoTop + 45);

    doc.font('Helvetica-Bold').text('Customer', 320, infoTop);
    doc.font('Helvetica');
    doc.text(quotation.customer.companyName || quotation.customer.fullName, 320, infoTop + 15);
    if (quotation.customer.companyName) doc.text(quotation.customer.fullName, 320, infoTop + 28);
    if (quotation.customer.email) doc.text(quotation.customer.email, 320, infoTop + 41);
    doc.text(quotation.customer.phone, 320, infoTop + 54);

    // ── Project info ─────────────────────────────────────────────────────────
    let y = infoTop + 80;
    doc.font('Helvetica-Bold').fontSize(11).text('Project Information', 50, y);
    y += 18;
    doc.font('Helvetica').fontSize(10);
    doc.text(`Service Type: ${quotation.serviceRequest.service?.serviceName ?? quotation.serviceRequest.serviceCategory.name}`, 50, y);
    y += 14;
    if (quotation.serviceRequest.projectLocation) {
      doc.text(`Project Location: ${quotation.serviceRequest.projectLocation}`, 50, y);
      y += 14;
    }
    if (quotation.siteInspection) {
      doc.text(`Inspection Reference: ${quotation.siteInspection.id.slice(0, 8).toUpperCase()} (${quotation.siteInspection.scheduledAt.toLocaleDateString()})`, 50, y);
      y += 14;
    }
    if (quotation.title) {
      doc.text(`Title: ${quotation.title}`, 50, y);
      y += 14;
    }
    if (quotation.description) {
      doc.text(quotation.description, 50, y, { width: 495 });
      y += 14 * Math.ceil(quotation.description.length / 100);
    }

    // ── Cost table ───────────────────────────────────────────────────────────
    y += 16;
    const tableTop = y;
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('Item', 50, tableTop, { width: 170 });
    doc.text('Category', 220, tableTop, { width: 80 });
    doc.text('Qty', 300, tableTop, { width: 50, align: 'right' });
    doc.text('Unit Price', 350, tableTop, { width: 90, align: 'right' });
    doc.text('Total', 445, tableTop, { width: 100, align: 'right' });
    doc.moveTo(50, tableTop + 14).lineTo(545, tableTop + 14).strokeColor('#333333').stroke();

    doc.font('Helvetica').fontSize(9);
    let rowY = tableTop + 20;
    for (const item of quotation.lineItems) {
      if (rowY > 720) {
        doc.addPage();
        rowY = 50;
      }
      doc.text(item.itemName || item.description, 50, rowY, { width: 170 });
      doc.text(CATEGORY_LABEL[item.category] ?? item.category, 220, rowY, { width: 80 });
      doc.text(String(item.quantity), 300, rowY, { width: 50, align: 'right' });
      doc.text(money(item.unitPrice, currency), 350, rowY, { width: 90, align: 'right' });
      doc.text(money(item.subtotal, currency), 445, rowY, { width: 100, align: 'right' });
      rowY += 18;
    }
    doc.moveTo(50, rowY).lineTo(545, rowY).strokeColor('#dddddd').stroke();
    rowY += 12;

    // ── Summary ──────────────────────────────────────────────────────────────
    if (rowY > 680) {
      doc.addPage();
      rowY = 50;
    }
    const summaryX = 350;
    doc.font('Helvetica').fontSize(10);
    doc.text('Subtotal:', summaryX, rowY, { width: 95 });
    doc.text(money(quotation.subtotal, currency), 445, rowY, { width: 100, align: 'right' });
    rowY += 16;
    if (Number(quotation.discountAmount) > 0) {
      const discountLabel =
        quotation.discountType === 'PERCENTAGE' ? `Discount (${quotation.discountValue}%):` : 'Discount:';
      doc.text(discountLabel, summaryX, rowY, { width: 95 });
      doc.text(`-${money(quotation.discountAmount, currency)}`, 445, rowY, { width: 100, align: 'right' });
      rowY += 16;
    }
    doc.text(`VAT (${quotation.taxRatePercent}%):`, summaryX, rowY, { width: 95 });
    doc.text(money(quotation.taxAmount, currency), 445, rowY, { width: 100, align: 'right' });
    rowY += 16;
    doc.moveTo(summaryX, rowY).lineTo(545, rowY).strokeColor('#333333').stroke();
    rowY += 8;
    doc.font('Helvetica-Bold').fontSize(12);
    doc.text('Grand Total:', summaryX, rowY, { width: 95 });
    doc.text(money(quotation.total, currency), 445, rowY, { width: 100, align: 'right' });
    rowY += 30;

    // ── Terms & Conditions ───────────────────────────────────────────────────
    if (quotation.termsAndConditions) {
      if (rowY > 650) {
        doc.addPage();
        rowY = 50;
      }
      doc.font('Helvetica-Bold').fontSize(10).text('Terms & Conditions', 50, rowY);
      rowY += 15;
      doc.font('Helvetica').fontSize(9).text(quotation.termsAndConditions, 50, rowY, { width: 495 });
      rowY += 15 * Math.ceil(quotation.termsAndConditions.length / 110) + 10;
    }

    // ── Approval section ─────────────────────────────────────────────────────
    if (rowY > 700) {
      doc.addPage();
      rowY = 50;
    }
    rowY += 20;
    doc.moveTo(50, rowY + 30).lineTo(230, rowY + 30).strokeColor('#333333').stroke();
    doc.moveTo(320, rowY + 30).lineTo(500, rowY + 30).strokeColor('#333333').stroke();
    doc.font('Helvetica').fontSize(9);
    doc.text('Customer Signature', 50, rowY + 35);
    doc.text('Company Signature', 320, rowY + 35);

    doc.end();
  });
}
