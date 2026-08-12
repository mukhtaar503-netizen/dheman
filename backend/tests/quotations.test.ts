import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'crypto';
// Relative import: tsconfig path aliases (@/...) only resolve for files under
// src/ (this test file lives outside it); everything app.ts imports internally
// still resolves via the alias as normal.
import { createApp } from '../src/app';

const app = createApp();

async function login(email: string, password: string) {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password });
  expect(res.status).toBe(200);
  return res.body.accessToken as string;
}

function uniquePhone() {
  return `+1555${randomUUID().replace(/-/g, '').slice(0, 7)}`;
}

describe('Quotation Management module (PHASE 07)', () => {
  let adminToken: string;
  let categoryId: string;

  beforeAll(async () => {
    adminToken = await login('superadmin@sms.local', 'ChangeMe123!');
    const categories = await request(app).get('/api/v1/service-categories').set('Authorization', `Bearer ${adminToken}`);
    categoryId = categories.body[0].id;
  });

  async function createCustomerAndRequest(fullName = 'PHASE07 Test Customer') {
    const customer = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fullName, phone: uniquePhone(), type: 'INDIVIDUAL' });
    expect(customer.status).toBe(201);

    const serviceRequest = await request(app)
      .post('/api/v1/service-requests')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customerId: customer.body.id, serviceCategoryId: categoryId, description: 'Quotation test request' });
    expect(serviceRequest.status).toBe(201);

    return { customer: customer.body, serviceRequest: serviceRequest.body };
  }

  it('creates a quotation and computes material/labor/transportation cost buckets + discount + VAT correctly', async () => {
    const { serviceRequest } = await createCustomerAndRequest();
    const res = await request(app)
      .post('/api/v1/quotations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        serviceRequestId: serviceRequest.id,
        lineItems: [
          { category: 'MATERIAL', description: 'Aluminum Profile', quantity: 20, unit: 'meters', unitPrice: 15 },
          { category: 'MATERIAL', description: 'Glass Panels', quantity: 5, unit: 'units', unitPrice: 90 },
          { category: 'LABOR', description: 'Installation', quantity: 8, unit: 'hours', unitPrice: 25 },
          { category: 'TRANSPORTATION', description: 'Delivery', quantity: 1, unit: 'trip', unitPrice: 50 },
        ],
        discountType: 'PERCENTAGE',
        discountValue: 5,
        vatPercentage: 15,
      });
    expect(res.status).toBe(201);
    expect(res.body.materialCost).toBe('750');
    expect(res.body.laborCost).toBe('200');
    expect(res.body.transportationCost).toBe('50');
    expect(res.body.subtotal).toBe('1000');
    expect(res.body.discountAmount).toBe('50');
    expect(res.body.taxAmount).toBe('142.5');
    expect(res.body.total).toBe('1092.5');
    expect(res.body.status).toBe('DRAFT');
  });

  it('rejects invalid input (no line items)', async () => {
    const { serviceRequest } = await createCustomerAndRequest();
    const res = await request(app)
      .post('/api/v1/quotations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ serviceRequestId: serviceRequest.id, lineItems: [] });
    expect(res.status).toBe(400);
  });

  it('auto-loads a suggested line-item prefill from a completed Site Inspection', async () => {
    const { serviceRequest } = await createCustomerAndRequest();
    const inspectorEmail = `qt-inspector-${randomUUID()}@sms.local`;
    const inspector = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: inspectorEmail, fullName: 'QT Inspector', password: 'Password123!', role: 'SITE_INSPECTOR' });
    const inspectorToken = await login(inspectorEmail, 'Password123!');

    const inspection = await request(app)
      .post('/api/v1/inspections')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ serviceRequestId: serviceRequest.id, inspectorId: inspector.body.id, scheduledAt: '2026-08-01T09:00:00Z' });
    expect(inspection.status).toBe(201);

    await request(app)
      .patch(`/api/v1/inspections/${inspection.body.id}/complete`)
      .set('Authorization', `Bearer ${inspectorToken}`)
      .send({
        materialEstimate: [{ material: 'Aluminum Profile', quantity: '20 meters', estimatedCost: 300 }],
        laborEstimate: [{ task: 'Installation', estimatedHours: 8, cost: 200 }],
      });

    const prefill = await request(app)
      .get(`/api/v1/quotations/prefill/${inspection.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(prefill.status).toBe(200);
    expect(prefill.body.customer).toBeDefined();
    expect(prefill.body.suggestedLineItems).toHaveLength(2);
    expect(prefill.body.suggestedLineItems[0].category).toBe('MATERIAL');
    expect(prefill.body.suggestedLineItems[1].category).toBe('LABOR');
  });

  it('validates the status transition table: rejects DRAFT->APPROVED, allows DRAFT->SENT', async () => {
    const { serviceRequest } = await createCustomerAndRequest();
    const created = await request(app)
      .post('/api/v1/quotations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ serviceRequestId: serviceRequest.id, lineItems: [{ category: 'MATERIAL', description: 'Item', quantity: 1, unit: 'unit', unitPrice: 100 }] });

    const invalid = await request(app)
      .patch(`/api/v1/quotations/${created.body.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED' });
    expect(invalid.status).toBe(400);

    const valid = await request(app)
      .patch(`/api/v1/quotations/${created.body.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'SENT' });
    expect(valid.status).toBe(200);
    expect(valid.body.status).toBe('SENT');
  });

  it('edits a DRAFT quotation and recomputes totals, but blocks edits once SENT', async () => {
    const { serviceRequest } = await createCustomerAndRequest();
    const created = await request(app)
      .post('/api/v1/quotations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ serviceRequestId: serviceRequest.id, lineItems: [{ category: 'MATERIAL', description: 'Item A', quantity: 1, unit: 'unit', unitPrice: 100 }] });

    const edited = await request(app)
      .patch(`/api/v1/quotations/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        lineItems: [
          { category: 'MATERIAL', description: 'Item A', quantity: 1, unit: 'unit', unitPrice: 100 },
          { category: 'LABOR', description: 'Item B', quantity: 2, unit: 'hr', unitPrice: 50 },
        ],
      });
    expect(edited.status).toBe(200);
    expect(edited.body.materialCost).toBe('100');
    expect(edited.body.laborCost).toBe('100');
    expect(edited.body.subtotal).toBe('200');

    await request(app).patch(`/api/v1/quotations/${created.body.id}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'SENT' });

    const blockedEdit = await request(app)
      .patch(`/api/v1/quotations/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ notes: 'should be blocked' });
    expect(blockedEdit.status).toBe(400);
  });

  it('deletes a Draft quotation, but blocks deletion once Sent/Approved', async () => {
    const { serviceRequest } = await createCustomerAndRequest();
    const created = await request(app)
      .post('/api/v1/quotations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ serviceRequestId: serviceRequest.id, lineItems: [{ category: 'MATERIAL', description: 'Item', quantity: 1, unit: 'unit', unitPrice: 100 }] });

    const deleted = await request(app).delete(`/api/v1/quotations/${created.body.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(deleted.status).toBe(204);

    const created2 = await request(app)
      .post('/api/v1/quotations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ serviceRequestId: serviceRequest.id, lineItems: [{ category: 'MATERIAL', description: 'Item', quantity: 1, unit: 'unit', unitPrice: 100 }] });
    await request(app).patch(`/api/v1/quotations/${created2.body.id}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'SENT' });

    const blockedDelete = await request(app).delete(`/api/v1/quotations/${created2.body.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(blockedDelete.status).toBe(409);
  });

  it('generates a downloadable PDF', async () => {
    const { serviceRequest } = await createCustomerAndRequest();
    const created = await request(app)
      .post('/api/v1/quotations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ serviceRequestId: serviceRequest.id, lineItems: [{ category: 'MATERIAL', description: 'Item', quantity: 1, unit: 'unit', unitPrice: 100 }] });

    const pdfRes = await request(app).get(`/api/v1/quotations/${created.body.id}/pdf`).set('Authorization', `Bearer ${adminToken}`);
    expect(pdfRes.status).toBe(200);
    expect(pdfRes.headers['content-type']).toBe('application/pdf');
    expect(pdfRes.body.length).toBeGreaterThan(500);
    expect(pdfRes.body.slice(0, 4).toString('latin1')).toBe('%PDF');
  });

  it('reports a graceful config-missing error when emailing without SMTP configured', async () => {
    const customer = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fullName: 'Email Test Customer', phone: uniquePhone(), type: 'INDIVIDUAL', email: `qt-email-${randomUUID()}@example.com` });
    const serviceRequest = await request(app)
      .post('/api/v1/service-requests')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customerId: customer.body.id, serviceCategoryId: categoryId, description: 'Email test request' });
    const created = await request(app)
      .post('/api/v1/quotations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ serviceRequestId: serviceRequest.body.id, lineItems: [{ category: 'MATERIAL', description: 'Item', quantity: 1, unit: 'unit', unitPrice: 100 }] });

    const res = await request(app).post(`/api/v1/quotations/${created.body.id}/email`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Email delivery is not configured');
  });

  it('returns dashboard statistics', async () => {
    const res = await request(app).get('/api/v1/quotations/statistics').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalQuotations');
    expect(res.body).toHaveProperty('draftQuotations');
    expect(res.body).toHaveProperty('sentQuotations');
    expect(res.body).toHaveProperty('approvedQuotations');
    expect(res.body).toHaveProperty('rejectedQuotations');
    expect(res.body).toHaveProperty('totalRevenueValue');
    expect(res.body).toHaveProperty('approvalRatePercent');
    expect(Array.isArray(res.body.byStatus)).toBe(true);
    expect(Array.isArray(res.body.monthlyValue)).toBe(true);
  });

  it('denies mutation without quotations.manage', async () => {
    const email = `qt-tech-${randomUUID()}@sms.local`;
    await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email, fullName: 'RBAC Test Tech', password: 'Password123!', role: 'TECHNICIAN' });
    const techToken = await login(email, 'Password123!');

    const res = await request(app)
      .post('/api/v1/quotations')
      .set('Authorization', `Bearer ${techToken}`)
      .send({ serviceRequestId: randomUUID(), lineItems: [{ category: 'MATERIAL', description: 'Item', quantity: 1, unit: 'unit', unitPrice: 100 }] });
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('quotations.manage');
  });

  describe('customer approval workflow', () => {
    let custToken: string;
    let custCustomerId: string;

    beforeAll(async () => {
      const email = `qt-cust-${randomUUID()}@sms.local`;
      const reg = await request(app)
        .post('/api/v1/auth/register')
        .send({ email, fullName: 'Approval Test Customer', password: 'Password123!', phone: uniquePhone() });
      expect(reg.status).toBe(201);
      custToken = await login(email, 'Password123!');

      const list = await request(app)
        .get('/api/v1/customers?search=Approval Test Customer')
        .set('Authorization', `Bearer ${adminToken}`);
      custCustomerId = list.body.items[0].id;
    });

    it('lets a customer approve their own Sent quotation and records a QuotationApproval', async () => {
      const serviceRequest = await request(app)
        .post('/api/v1/service-requests')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ customerId: custCustomerId, serviceCategoryId: categoryId, description: 'Approval flow request' });

      const created = await request(app)
        .post('/api/v1/quotations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ serviceRequestId: serviceRequest.body.id, lineItems: [{ category: 'MATERIAL', description: 'Item', quantity: 1, unit: 'unit', unitPrice: 100 }] });
      await request(app).patch(`/api/v1/quotations/${created.body.id}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'SENT' });

      const approved = await request(app)
        .post(`/api/v1/quotations/${created.body.id}/respond`)
        .set('Authorization', `Bearer ${custToken}`)
        .send({ decision: 'APPROVED', comments: 'Looks good' });
      expect(approved.status).toBe(200);
      expect(approved.body.status).toBe('APPROVED');

      const detail = await request(app).get(`/api/v1/quotations/${created.body.id}`).set('Authorization', `Bearer ${adminToken}`);
      expect(detail.body.approvals).toHaveLength(1);
      expect(detail.body.approvals[0].action).toBe('APPROVED');
      expect(detail.body.approvals[0].comments).toBe('Looks good');
    });

    it("rejects a customer approving someone else's quotation", async () => {
      const otherCustomer = await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ fullName: 'Other Customer', phone: uniquePhone(), type: 'INDIVIDUAL' });
      const serviceRequest = await request(app)
        .post('/api/v1/service-requests')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ customerId: otherCustomer.body.id, serviceCategoryId: categoryId, description: 'Not mine' });
      const created = await request(app)
        .post('/api/v1/quotations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ serviceRequestId: serviceRequest.body.id, lineItems: [{ category: 'MATERIAL', description: 'Item', quantity: 1, unit: 'unit', unitPrice: 100 }] });
      await request(app).patch(`/api/v1/quotations/${created.body.id}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'SENT' });

      const res = await request(app)
        .post(`/api/v1/quotations/${created.body.id}/respond`)
        .set('Authorization', `Bearer ${custToken}`)
        .send({ decision: 'APPROVED' });
      expect(res.status).toBe(403);
    });
  });

  describe('duplicate quotation prevention (one Quotation per Site Inspection)', () => {
    async function completedInspection() {
      const { serviceRequest } = await createCustomerAndRequest();
      const inspectorEmail = `qt-dup-inspector-${randomUUID()}@sms.local`;
      const inspector = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: inspectorEmail, fullName: 'QT Dup Inspector', password: 'Password123!', role: 'SITE_INSPECTOR' });
      const inspectorToken = await login(inspectorEmail, 'Password123!');

      const inspection = await request(app)
        .post('/api/v1/inspections')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ serviceRequestId: serviceRequest.id, inspectorId: inspector.body.id, scheduledAt: '2026-08-01T09:00:00Z' });
      await request(app).patch(`/api/v1/inspections/${inspection.body.id}/complete`).set('Authorization', `Bearer ${inspectorToken}`).send({});

      return { serviceRequest, inspectionId: inspection.body.id as string };
    }

    it('creates successfully for a completed Site Inspection with no existing Quotation, then blocks a second one with a clear 409', async () => {
      const { serviceRequest, inspectionId } = await completedInspection();

      const prefillBefore = await request(app).get(`/api/v1/quotations/prefill/${inspectionId}`).set('Authorization', `Bearer ${adminToken}`);
      expect(prefillBefore.status).toBe(200);
      expect(prefillBefore.body.existingQuotation).toBeNull();

      const first = await request(app)
        .post('/api/v1/quotations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          serviceRequestId: serviceRequest.id,
          siteInspectionId: inspectionId,
          lineItems: [{ category: 'MATERIAL', description: 'Item', quantity: 1, unit: 'unit', unitPrice: 100 }],
        });
      expect(first.status).toBe(201);

      const prefillAfter = await request(app).get(`/api/v1/quotations/prefill/${inspectionId}`).set('Authorization', `Bearer ${adminToken}`);
      expect(prefillAfter.body.existingQuotation).toMatchObject({ id: first.body.id, quotationNo: first.body.quotationNo });

      const second = await request(app)
        .post('/api/v1/quotations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          serviceRequestId: serviceRequest.id,
          siteInspectionId: inspectionId,
          lineItems: [{ category: 'MATERIAL', description: 'Item', quantity: 1, unit: 'unit', unitPrice: 100 }],
        });
      expect(second.status).toBe(409);
      expect(second.body.error).toBe('A quotation already exists for this site inspection.');
      expect(second.body.details).toMatchObject({ existingQuotationId: first.body.id, existingQuotationNo: first.body.quotationNo });

      // No duplicate was actually written to the database — the failed create left no row behind.
      const list = await request(app).get(`/api/v1/quotations?search=${first.body.quotationNo}`).set('Authorization', `Bearer ${adminToken}`);
      expect(list.body.items).toHaveLength(1);
      expect(list.body.items[0].id).toBe(first.body.id);
    });

    it('rejects two near-simultaneous create requests for the same inspection with only one succeeding', async () => {
      const { serviceRequest, inspectionId } = await completedInspection();
      const payload = {
        serviceRequestId: serviceRequest.id,
        siteInspectionId: inspectionId,
        lineItems: [{ category: 'MATERIAL', description: 'Item', quantity: 1, unit: 'unit', unitPrice: 100 }],
      };

      const [a, b] = await Promise.all([
        request(app).post('/api/v1/quotations').set('Authorization', `Bearer ${adminToken}`).send(payload),
        request(app).post('/api/v1/quotations').set('Authorization', `Bearer ${adminToken}`).send(payload),
      ]);

      const statuses = [a.status, b.status].sort();
      expect(statuses).toEqual([201, 409]);
      const failed = a.status === 409 ? a : b;
      expect(failed.body.error).toBe('A quotation already exists for this site inspection.');
      expect(failed.body.details.existingQuotationId).toBeDefined();
    });
  });

  describe('inspector view', () => {
    it('scopes the inspector view to quotations tied to inspections they performed', async () => {
      const { serviceRequest } = await createCustomerAndRequest();
      const inspectorEmail = `qt-inspector2-${randomUUID()}@sms.local`;
      const inspector = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: inspectorEmail, fullName: 'QT Inspector 2', password: 'Password123!', role: 'SITE_INSPECTOR' });
      const inspectorToken = await login(inspectorEmail, 'Password123!');

      const inspection = await request(app)
        .post('/api/v1/inspections')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ serviceRequestId: serviceRequest.id, inspectorId: inspector.body.id, scheduledAt: '2026-08-01T09:00:00Z' });
      await request(app).patch(`/api/v1/inspections/${inspection.body.id}/complete`).set('Authorization', `Bearer ${inspectorToken}`).send({});

      const created = await request(app)
        .post('/api/v1/quotations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          serviceRequestId: serviceRequest.id,
          siteInspectionId: inspection.body.id,
          lineItems: [{ category: 'MATERIAL', description: 'Item', quantity: 1, unit: 'unit', unitPrice: 100 }],
        });
      expect(created.status).toBe(201);

      const list = await request(app).get('/api/v1/quotations/inspector/me').set('Authorization', `Bearer ${inspectorToken}`);
      expect(list.status).toBe(200);
      expect(list.body.some((q: { id: string }) => q.id === created.body.id)).toBe(true);
    });
  });
});
