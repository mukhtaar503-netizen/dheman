import PDFDocument from 'pdfkit';
import type { Prisma } from '@prisma/client';
import { getSettings } from '@/modules/settings/settings.service';
import { NAVY, GRAY, PAGE_LEFT, PAGE_RIGHT, PAGE_WIDTH, resolveLogoBuffer, drawBrandHeader, attachBrandFooter } from '@/lib/pdf-branding';

type InspectionForPdf = Prisma.SiteInspectionGetPayload<{
  include: {
    serviceRequest: { include: { customer: true; serviceCategory: true; service: true } };
    inspector: { select: { id: true; fullName: true } };
    measurements: true;
  };
}>;

type MaterialRow = { material: string; quantity: string; unit?: string; estimatedCost?: number; remarks?: string };
type LaborRow = { task: string; workers?: number; days?: number; estimatedHours?: number; cost: number };

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

/** Renders a professional Site Inspection report PDF and resolves to the full document Buffer. */
export async function generateInspectionPdf(inspection: InspectionForPdf): Promise<Buffer> {
  const settings = await getSettings();
  const logoBuffer = await resolveLogoBuffer(settings.logoUrl);
  const customer = inspection.serviceRequest.customer;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    attachBrandFooter(doc, settings);
    const ruleY = drawBrandHeader(doc, settings, logoBuffer);

    // ── Report title + meta ─────────────────────────────────────────────────
    let y = ruleY + 15;
    doc.fontSize(16).font('Helvetica-Bold').fillColor(NAVY).text('SITE INSPECTION REPORT', PAGE_LEFT, y);
    doc.fillColor('#000000');
    doc.fontSize(10).font('Helvetica');
    const infoTop = y + 25;
    doc.text(`Inspection No: ${inspection.inspectionNo}`, PAGE_LEFT, infoTop);
    doc.text(`Date: ${inspection.scheduledAt.toLocaleDateString()}`, PAGE_LEFT, infoTop + 15);
    doc.text(`Status: ${STATUS_LABEL[inspection.status] ?? inspection.status}`, PAGE_LEFT, infoTop + 30);
    doc.text(`Inspector: ${inspection.inspector.fullName}`, PAGE_LEFT, infoTop + 45);

    doc.font('Helvetica-Bold').text('Customer', 320, infoTop);
    doc.font('Helvetica');
    doc.text(customer.companyName || customer.fullName, 320, infoTop + 15);
    if (customer.companyName) doc.text(customer.fullName, 320, infoTop + 28);
    if (customer.email) doc.text(customer.email, 320, infoTop + 41);
    doc.text(customer.phone, 320, infoTop + 54);

    // ── Project & Site information ──────────────────────────────────────────
    let py = infoTop + 80;
    doc.font('Helvetica-Bold').fontSize(11).fillColor(NAVY).text('Project & Site Information', PAGE_LEFT, py);
    doc.fillColor('#000000');
    py += 18;
    doc.font('Helvetica').fontSize(10);
    if (inspection.serviceRequest.title) {
      doc.text(`Project Name: ${inspection.serviceRequest.title}`, PAGE_LEFT, py);
      py += 14;
    }
    doc.text(`Service Type: ${inspection.serviceRequest.service?.serviceName ?? inspection.serviceRequest.serviceCategory.name}`, PAGE_LEFT, py);
    py += 14;
    const siteLine = [inspection.siteAddress, inspection.city, inspection.region].filter(Boolean).join(', ');
    if (siteLine) {
      doc.text(`Site Address: ${siteLine}`, PAGE_LEFT, py, { width: PAGE_WIDTH });
      py += 14;
    }

    // Shared 4-column table layout (Item/Name/Type + 3 right-aligned numeric columns) reused
    // by Measurements, Materials, and Labor below — keeps all three visually identical, which
    // is what lets the detail page mirror this exact structure column-for-column.
    const tcol = { first: PAGE_LEFT, c1: 300, c2: 380, c3: 460 };
    const tFirstWidth = tcol.c1 - tcol.first - 8;
    const tColWidth = 72;

    function drawTableHeader(headers: [string, string, string, string]) {
      doc.font('Helvetica-Bold').fontSize(8.5);
      doc.text(headers[0], tcol.first, py, { width: tFirstWidth });
      doc.text(headers[1], tcol.c1, py, { width: tColWidth, align: 'right' });
      doc.text(headers[2], tcol.c2, py, { width: tColWidth, align: 'right' });
      doc.text(headers[3], tcol.c3, py, { width: PAGE_RIGHT - tcol.c3, align: 'right' });
      py += 12;
      doc.moveTo(PAGE_LEFT, py).lineTo(PAGE_RIGHT, py).strokeColor(NAVY).stroke();
      py += 6;
      doc.font('Helvetica').fontSize(9);
    }

    function ensureSpace(threshold = 740) {
      if (py > threshold) {
        doc.addPage();
        py = 50;
      }
    }

    // ── Measurements ─────────────────────────────────────────────────────────
    py += 10;
    ensureSpace(680);
    doc.font('Helvetica-Bold').fontSize(11).fillColor(NAVY).text('Measurements', PAGE_LEFT, py);
    doc.fillColor('#000000');
    py += 18;
    if (inspection.measurements.length) {
      drawTableHeader(['Item', 'Height (m)', 'Width (m)', 'Area (m²)']);
      let totalArea = 0;
      for (const m of inspection.measurements) {
        ensureSpace();
        const height = m.height != null ? Number(m.height) : null;
        const width = m.width != null ? Number(m.width) : null;
        const area = m.area != null ? Number(m.area) : height != null && width != null ? height * width : null;
        if (area != null) totalArea += area;
        doc.text(m.label, tcol.first, py, { width: tFirstWidth });
        doc.text(height != null ? height.toString() : '—', tcol.c1, py, { width: tColWidth, align: 'right' });
        doc.text(width != null ? width.toString() : '—', tcol.c2, py, { width: tColWidth, align: 'right' });
        doc.text(area != null ? area.toFixed(2) : '—', tcol.c3, py, { width: PAGE_RIGHT - tcol.c3, align: 'right' });
        py += 14;
      }
      py += 4;
      doc.font('Helvetica-Bold').fontSize(9.5).text(`Total Area: ${totalArea.toFixed(2)} m²`, PAGE_LEFT, py, { width: PAGE_WIDTH, align: 'right' });
      py += 16;
    } else {
      doc.font('Helvetica').fontSize(9.5).fillColor(GRAY).text('No measurements added.', PAGE_LEFT, py);
      doc.fillColor('#000000');
      py += 18;
    }

    // ── Materials ────────────────────────────────────────────────────────────
    const materials = (inspection.materialEstimate as MaterialRow[] | null) ?? [];
    py += 6;
    ensureSpace(680);
    doc.font('Helvetica-Bold').fontSize(11).fillColor(NAVY).text('Materials', PAGE_LEFT, py);
    doc.fillColor('#000000');
    py += 18;
    if (materials.length) {
      drawTableHeader(['Material Name', 'Quantity', 'Unit', 'Cost']);
      for (const m of materials) {
        ensureSpace();
        doc.text(m.material, tcol.first, py, { width: tFirstWidth });
        doc.text(m.quantity || '—', tcol.c1, py, { width: tColWidth, align: 'right' });
        doc.text(m.unit || '—', tcol.c2, py, { width: tColWidth, align: 'right' });
        doc.text(m.estimatedCost != null ? `$${Number(m.estimatedCost).toFixed(2)}` : '—', tcol.c3, py, { width: PAGE_RIGHT - tcol.c3, align: 'right' });
        py += 14;
      }
      py += 10;
    } else {
      doc.font('Helvetica').fontSize(9.5).fillColor(GRAY).text('No materials added.', PAGE_LEFT, py);
      doc.fillColor('#000000');
      py += 18;
    }

    // ── Labor ────────────────────────────────────────────────────────────────
    const labor = (inspection.laborEstimate as LaborRow[] | null) ?? [];
    ensureSpace(680);
    doc.font('Helvetica-Bold').fontSize(11).fillColor(NAVY).text('Labor', PAGE_LEFT, py);
    doc.fillColor('#000000');
    py += 18;
    if (labor.length) {
      drawTableHeader(['Work Type', 'Workers', 'Days', 'Cost']);
      for (const l of labor) {
        ensureSpace();
        doc.text(l.task, tcol.first, py, { width: tFirstWidth });
        doc.text(l.workers != null ? String(l.workers) : '—', tcol.c1, py, { width: tColWidth, align: 'right' });
        doc.text(l.days != null ? String(l.days) : '—', tcol.c2, py, { width: tColWidth, align: 'right' });
        doc.text(`$${Number(l.cost).toFixed(2)}`, tcol.c3, py, { width: PAGE_RIGHT - tcol.c3, align: 'right' });
        py += 14;
      }
      py += 10;
    } else {
      doc.font('Helvetica').fontSize(9.5).fillColor(GRAY).text('No labor added.', PAGE_LEFT, py);
      doc.fillColor('#000000');
      py += 18;
    }

    // ── Cost Estimate ────────────────────────────────────────────────────────
    // Same formula the detail page shows and the backend derives on save: material + labor +
    // transportation, unless an explicit override was ever stored on this record.
    const materialCost = inspection.materialCost != null ? Number(inspection.materialCost) : 0;
    const laborCost = inspection.laborCost != null ? Number(inspection.laborCost) : 0;
    const transportationCost = inspection.transportationCost != null ? Number(inspection.transportationCost) : 0;
    const estimatedTotal = inspection.estimatedCost != null ? Number(inspection.estimatedCost) : materialCost + laborCost + transportationCost;

    ensureSpace(700);
    doc.font('Helvetica-Bold').fontSize(11).fillColor(NAVY).text('Cost Estimate', PAGE_LEFT, py);
    doc.fillColor('#000000');
    py += 18;
    doc.font('Helvetica').fontSize(10);
    doc.text(`Material Cost: $${materialCost.toFixed(2)}`, PAGE_LEFT, py);
    py += 14;
    doc.text(`Labor Cost: $${laborCost.toFixed(2)}`, PAGE_LEFT, py);
    py += 14;
    doc.text(`Transportation: $${transportationCost.toFixed(2)}`, PAGE_LEFT, py);
    py += 18;

    ensureSpace(720);
    doc.rect(PAGE_LEFT, py, PAGE_WIDTH, 26).fillColor('#F3F4F6').fill();
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(12);
    doc.text('Estimated Total', PAGE_LEFT + 10, py + 7);
    doc.text(`$${estimatedTotal.toFixed(2)}`, PAGE_LEFT, py + 7, { width: PAGE_WIDTH - 10, align: 'right' });
    doc.fillColor('#000000');
    py += 34;

    doc.end();
  });
}
