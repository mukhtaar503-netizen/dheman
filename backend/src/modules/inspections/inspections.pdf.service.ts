import PDFDocument from 'pdfkit';
import type { Prisma } from '@prisma/client';
import { getSettings } from '@/modules/settings/settings.service';
import { NAVY, ORANGE, GRAY, LIGHT_BORDER, PAGE_LEFT, PAGE_RIGHT, PAGE_WIDTH, resolveLogoBuffer, drawBrandHeader, attachBrandFooter } from '@/lib/pdf-branding';

type InspectionForPdf = Prisma.SiteInspectionGetPayload<{
  include: {
    serviceRequest: { include: { customer: true; serviceCategory: true; service: true } };
    inspector: { select: { id: true; fullName: true } };
    measurements: true;
  };
}>;

type MaterialRow = { material: string; quantity: string; unit?: string; estimatedCost?: number; remarks?: string };
type LaborRow = { task: string; estimatedHours: number; cost: number };

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

    // ── Measurements ─────────────────────────────────────────────────────────
    if (inspection.measurements.length) {
      py += 10;
      if (py > 680) {
        doc.addPage();
        py = 50;
      }
      doc.font('Helvetica-Bold').fontSize(11).fillColor(NAVY).text('Measurements', PAGE_LEFT, py);
      doc.fillColor('#000000');
      py += 18;
      const col = { area: PAGE_LEFT, l: 190, w: 240, h: 290, unit: 340, qty: 390, notes: 430 };
      doc.font('Helvetica-Bold').fontSize(8.5);
      doc.text('Area/Room', col.area, py, { width: 135 });
      doc.text('L', col.l, py, { width: 45, align: 'right' });
      doc.text('W', col.w, py, { width: 45, align: 'right' });
      doc.text('H', col.h, py, { width: 45, align: 'right' });
      doc.text('Unit', col.unit, py, { width: 45 });
      doc.text('Qty', col.qty, py, { width: 35, align: 'right' });
      doc.text('Notes', col.notes, py, { width: PAGE_RIGHT - col.notes });
      py += 12;
      doc.moveTo(PAGE_LEFT, py).lineTo(PAGE_RIGHT, py).strokeColor(NAVY).stroke();
      py += 6;
      doc.font('Helvetica').fontSize(8.5);
      for (const m of inspection.measurements) {
        if (py > 740) {
          doc.addPage();
          py = 50;
        }
        doc.text(m.label, col.area, py, { width: 135 });
        doc.text(m.length != null ? Number(m.length).toString() : '—', col.l, py, { width: 45, align: 'right' });
        doc.text(m.width != null ? Number(m.width).toString() : '—', col.w, py, { width: 45, align: 'right' });
        doc.text(m.height != null ? Number(m.height).toString() : '—', col.h, py, { width: 45, align: 'right' });
        doc.text(m.unit, col.unit, py, { width: 45 });
        doc.text(m.quantity != null ? String(m.quantity) : '—', col.qty, py, { width: 35, align: 'right' });
        doc.text(m.notes ?? '—', col.notes, py, { width: PAGE_RIGHT - col.notes });
        py += 14;
      }
      py += 6;
    }

    // ── Materials assessment ────────────────────────────────────────────────
    const materials = (inspection.materialEstimate as MaterialRow[] | null) ?? [];
    if (materials.length) {
      py += 6;
      if (py > 680) {
        doc.addPage();
        py = 50;
      }
      doc.font('Helvetica-Bold').fontSize(11).fillColor(NAVY).text('Materials Assessment', PAGE_LEFT, py);
      doc.fillColor('#000000');
      py += 18;
      doc.font('Helvetica').fontSize(9);
      for (const m of materials) {
        if (py > 740) {
          doc.addPage();
          py = 50;
        }
        const line = [m.material, m.quantity, m.unit].filter(Boolean).join(' · ');
        doc.text(`• ${line}${m.remarks ? ` — ${m.remarks}` : ''}`, PAGE_LEFT, py, { width: PAGE_WIDTH });
        py += 13;
      }
      py += 6;
    }

    // ── Labor assessment ─────────────────────────────────────────────────────
    if (inspection.estimatedWorkers != null || inspection.estimatedWorkingDays != null || inspection.specialSkillsRequired) {
      if (py > 700) {
        doc.addPage();
        py = 50;
      }
      doc.font('Helvetica-Bold').fontSize(11).fillColor(NAVY).text('Labor Assessment', PAGE_LEFT, py);
      doc.fillColor('#000000');
      py += 18;
      doc.font('Helvetica').fontSize(10);
      if (inspection.estimatedWorkers != null) {
        doc.text(`Estimated Workers: ${inspection.estimatedWorkers}`, PAGE_LEFT, py);
        py += 14;
      }
      if (inspection.estimatedWorkingDays != null) {
        doc.text(`Estimated Working Days: ${inspection.estimatedWorkingDays}`, PAGE_LEFT, py);
        py += 14;
      }
      if (inspection.specialSkillsRequired) {
        doc.text(`Special Skills Required: ${inspection.specialSkillsRequired}`, PAGE_LEFT, py, { width: PAGE_WIDTH });
        py += 14;
      }
      py += 6;
    }

    // ── Transportation ───────────────────────────────────────────────────────
    if (inspection.vehicleRequired || inspection.transportDistance != null || inspection.accessibility || inspection.transportationNotes) {
      if (py > 700) {
        doc.addPage();
        py = 50;
      }
      doc.font('Helvetica-Bold').fontSize(11).fillColor(NAVY).text('Transportation', PAGE_LEFT, py);
      doc.fillColor('#000000');
      py += 18;
      doc.font('Helvetica').fontSize(10);
      if (inspection.vehicleRequired) {
        doc.text(`Vehicle Required: ${inspection.vehicleRequired}`, PAGE_LEFT, py);
        py += 14;
      }
      if (inspection.transportDistance != null) {
        doc.text(`Distance: ${Number(inspection.transportDistance)} km`, PAGE_LEFT, py);
        py += 14;
      }
      if (inspection.accessibility) {
        doc.text(`Accessibility: ${inspection.accessibility}`, PAGE_LEFT, py, { width: PAGE_WIDTH });
        py += 14;
      }
      if (inspection.transportationNotes) {
        doc.text(`Notes: ${inspection.transportationNotes}`, PAGE_LEFT, py, { width: PAGE_WIDTH });
        py += 14;
      }
      py += 6;
    }

    doc.end();
  });
}
