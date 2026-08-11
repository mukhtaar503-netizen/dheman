import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'crypto';
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

describe('Site Inspection Registration module (PHASE 06)', () => {
  let adminToken: string;
  let categoryId: string;
  let inspectorId: string;

  beforeAll(async () => {
    adminToken = await login('superadmin@sms.local', 'ChangeMe123!');
    const categories = await request(app).get('/api/v1/service-categories').set('Authorization', `Bearer ${adminToken}`);
    categoryId = categories.body[0].id;

    const email = `sireg-inspector-${randomUUID()}@sms.local`;
    const inspector = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email, fullName: 'SIReg Inspector', password: 'Password123!', role: 'SITE_INSPECTOR' });
    expect(inspector.status).toBe(201);
    inspectorId = inspector.body.id;
  });

  async function createCustomerAndRequest(fullName = 'SIReg Test Customer') {
    const customer = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fullName, phone: uniquePhone(), type: 'INDIVIDUAL' });
    expect(customer.status).toBe(201);

    const serviceRequest = await request(app)
      .post('/api/v1/service-requests')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: customer.body.id,
        serviceCategoryId: categoryId,
        description: 'Registration module test request',
        title: 'Test Project',
        projectType: 'New Installation',
        projectLocation: 'Test Site',
        expectedStartDate: '2026-09-01T00:00:00.000Z',
        expectedCompletionDate: '2026-09-15T00:00:00.000Z',
      });
    expect(serviceRequest.status).toBe(201);
    expect(serviceRequest.body.projectType).toBe('New Installation');
    expect(serviceRequest.body.expectedStartDate).toBe('2026-09-01T00:00:00.000Z');

    return { customer: customer.body, serviceRequest: serviceRequest.body };
  }

  it('auto-generates a unique Inspection Number and defaults to SCHEDULED when no status is given', async () => {
    const { serviceRequest } = await createCustomerAndRequest();
    const created = await request(app)
      .post('/api/v1/inspections')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ serviceRequestId: serviceRequest.id, inspectorId, scheduledAt: '2026-09-05T09:00:00Z', siteAddress: '123 Test St' });
    expect(created.status).toBe(201);
    expect(created.body.inspectionNo).toMatch(/^INS-\d{4}-\d{5}$/);
    expect(created.body.status).toBe('SCHEDULED');
  });

  it('rejects an explicit SCHEDULED registration without a site address, but allows PENDING drafts without one', async () => {
    const { serviceRequest } = await createCustomerAndRequest();

    const rejected = await request(app)
      .post('/api/v1/inspections')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ serviceRequestId: serviceRequest.id, inspectorId, scheduledAt: '2026-09-05T09:00:00Z', status: 'SCHEDULED' });
    expect(rejected.status).toBe(400);

    const draft = await request(app)
      .post('/api/v1/inspections')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ serviceRequestId: serviceRequest.id, inspectorId, scheduledAt: '2026-09-05T09:00:00Z', status: 'PENDING' });
    expect(draft.status).toBe(201);
    expect(draft.body.status).toBe('PENDING');
  });

  it('accepts measurements and materials directly at registration (draft-safe — no dependency on the on-site /details endpoint)', async () => {
    const { serviceRequest } = await createCustomerAndRequest();
    const created = await request(app)
      .post('/api/v1/inspections')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        serviceRequestId: serviceRequest.id,
        inspectorId,
        scheduledAt: '2026-09-05T09:00:00Z',
        status: 'PENDING',
        city: 'Dubai',
        region: 'Dubai',
        estimatedWorkers: 4,
        estimatedWorkingDays: 5,
        specialSkillsRequired: 'Electrician',
        vehicleRequired: 'Pickup truck',
        transportDistance: 12.5,
        accessibility: 'Narrow street',
        transportationNotes: 'No elevator access',
        measurements: [{ label: 'Living Room', length: 5, width: 4, unit: 'm', quantity: 1, notes: 'Open plan' }],
        materialEstimate: [{ material: 'Aluminum Profile', quantity: '30', unit: 'meter', remarks: 'Standard grade' }],
      });
    expect(created.status).toBe(201);
    expect(created.body.city).toBe('Dubai');
    expect(created.body.estimatedWorkers).toBe(4);
    expect(created.body.vehicleRequired).toBe('Pickup truck');

    const detail = await request(app).get(`/api/v1/inspections/${created.body.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(detail.status).toBe(200);
    expect(detail.body.measurements).toHaveLength(1);
    expect(detail.body.measurements[0].label).toBe('Living Room');
    expect(detail.body.materialEstimate).toHaveLength(1);
    expect(detail.body.materialEstimate[0].estimatedCost).toBeUndefined();
  });

  it('"Update Inspection": saves a draft repeatedly, then "Submit Inspection" validates and advances PENDING -> SCHEDULED', async () => {
    const { serviceRequest } = await createCustomerAndRequest();
    const created = await request(app)
      .post('/api/v1/inspections')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ serviceRequestId: serviceRequest.id, inspectorId, scheduledAt: '2026-09-05T09:00:00Z', status: 'PENDING' });

    const savedDraft = await request(app)
      .patch(`/api/v1/inspections/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ city: 'Dubai' });
    expect(savedDraft.status).toBe(200);
    expect(savedDraft.body.status).toBe('PENDING');
    expect(savedDraft.body.city).toBe('Dubai');

    const blockedSubmit = await request(app)
      .patch(`/api/v1/inspections/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'SCHEDULED' });
    expect(blockedSubmit.status).toBe(400);

    const submitted = await request(app)
      .patch(`/api/v1/inspections/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ siteAddress: '456 Submit Ave', status: 'SCHEDULED' });
    expect(submitted.status).toBe(200);
    expect(submitted.body.status).toBe('SCHEDULED');

    const srAfter = await request(app).get(`/api/v1/service-requests/${serviceRequest.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(srAfter.body.status).toBe('SITE_INSPECTION_SCHEDULED');
  });

  it('"Delete Inspection": deletes freely, but is blocked once a Quotation has been built from it', async () => {
    const { serviceRequest } = await createCustomerAndRequest();
    const created = await request(app)
      .post('/api/v1/inspections')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ serviceRequestId: serviceRequest.id, inspectorId, scheduledAt: '2026-09-05T09:00:00Z', siteAddress: '1 Delete Test Rd' });

    const deleted = await request(app).delete(`/api/v1/inspections/${created.body.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(deleted.status).toBe(204);
    const gone = await request(app).get(`/api/v1/inspections/${created.body.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(gone.status).toBe(404);

    const { serviceRequest: sr2 } = await createCustomerAndRequest('SIReg Quotation-Guard Customer');
    const forQuotation = await request(app)
      .post('/api/v1/inspections')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ serviceRequestId: sr2.id, inspectorId, scheduledAt: '2026-09-05T09:00:00Z', siteAddress: '2 Delete Test Rd' });
    await request(app)
      .post('/api/v1/quotations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        serviceRequestId: sr2.id,
        siteInspectionId: forQuotation.body.id,
        lineItems: [{ category: 'MATERIAL', description: 'Item', quantity: 1, unit: 'unit', unitPrice: 100 }],
      });
    const blockedDelete = await request(app).delete(`/api/v1/inspections/${forQuotation.body.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(blockedDelete.status).toBe(409);
  });

  it('GET /inspections supports search / customer / status / date-range filters', async () => {
    const { serviceRequest, customer } = await createCustomerAndRequest('SIReg Filter Customer');
    const created = await request(app)
      .post('/api/v1/inspections')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ serviceRequestId: serviceRequest.id, inspectorId, scheduledAt: '2026-09-10T09:00:00Z', siteAddress: 'Filter Test Rd' });

    const bySearch = await request(app)
      .get(`/api/v1/inspections?search=${created.body.inspectionNo}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(bySearch.status).toBe(200);
    expect(bySearch.body.items.some((i: { id: string }) => i.id === created.body.id)).toBe(true);

    const byCustomer = await request(app).get(`/api/v1/inspections?customerId=${customer.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(byCustomer.status).toBe(200);
    expect(byCustomer.body.items.every((i: { serviceRequest: { customerId: string } }) => i.serviceRequest.customerId === customer.id)).toBe(true);

    const byDateRange = await request(app)
      .get('/api/v1/inspections?dateFrom=2026-09-09T00:00:00.000Z&dateTo=2026-09-11T00:00:00.000Z')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(byDateRange.status).toBe(200);
    expect(byDateRange.body.items.some((i: { id: string }) => i.id === created.body.id)).toBe(true);

    const wrongStatus = await request(app).get('/api/v1/inspections?status=COMPLETED').set('Authorization', `Bearer ${adminToken}`);
    expect(wrongStatus.body.items.some((i: { id: string }) => i.id === created.body.id)).toBe(false);

    const paginated = await request(app).get('/api/v1/inspections?page=1&pageSize=1').set('Authorization', `Bearer ${adminToken}`);
    expect(paginated.status).toBe(200);
    expect(paginated.body.items.length).toBeLessThanOrEqual(1);
    expect(typeof paginated.body.total).toBe('number');
  });

  it('"Print Inspection Report": generates a downloadable PDF', async () => {
    const { serviceRequest } = await createCustomerAndRequest();
    const created = await request(app)
      .post('/api/v1/inspections')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ serviceRequestId: serviceRequest.id, inspectorId, scheduledAt: '2026-09-05T09:00:00Z', siteAddress: 'PDF Test Rd' });

    const pdfRes = await request(app).get(`/api/v1/inspections/${created.body.id}/pdf`).set('Authorization', `Bearer ${adminToken}`);
    expect(pdfRes.status).toBe(200);
    expect(pdfRes.headers['content-type']).toBe('application/pdf');
    expect(pdfRes.body.length).toBeGreaterThan(500);
    expect(pdfRes.body.slice(0, 4).toString('latin1')).toBe('%PDF');
  });

  it('denies registering an inspection without inspections.manage permission', async () => {
    const email = `sireg-tech-${randomUUID()}@sms.local`;
    await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email, fullName: 'RBAC Test Tech', password: 'Password123!', role: 'TECHNICIAN' });
    const techToken = await login(email, 'Password123!');

    const res = await request(app)
      .post('/api/v1/inspections')
      .set('Authorization', `Bearer ${techToken}`)
      .send({ serviceRequestId: randomUUID(), inspectorId, scheduledAt: '2026-09-05T09:00:00Z' });
    expect(res.status).toBe(403);
  });
});
