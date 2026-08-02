import PDFDocument from 'pdfkit';
import type { Prisma } from '@prisma/client';
import type { Decimal } from '@prisma/client/runtime/library';
import { getSettings } from '@/modules/settings/settings.service';
import { NAVY, ORANGE, GRAY, LIGHT_BORDER, PAGE_LEFT, PAGE_RIGHT, PAGE_WIDTH, resolveLogoBuffer, drawBrandHeader, attachBrandFooter } from '@/lib/pdf-branding';

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

function money(n: number | string | Decimal, currency: string) {
  return `${currency} ${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

    attachBrandFooter(doc, settings);
    const ruleY = drawBrandHeader(doc, settings, logoBuffer);

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
