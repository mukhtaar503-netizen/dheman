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

describe('Site Inspection workflow (PHASE 06 FINAL)', () => {
  let adminToken: string;
  let categoryId: string;
  let inspectorId: string;
  let inspectorToken: string;

  beforeAll(async () => {
    adminToken = await login('superadmin@sms.local', 'ChangeMe123!');
    const categories = await request(app).get('/api/v1/service-categories').set('Authorization', `Bearer ${adminToken}`);
    categoryId = categories.body[0].id;

    const email = `si-inspector-${randomUUID()}@sms.local`;
    const inspector = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email, fullName: 'SI Inspector', password: 'Password123!', role: 'SITE_INSPECTOR' });
    expect(inspector.status).toBe(201);
    inspectorId = inspector.body.id;
    inspectorToken = await login(email, 'Password123!');
  });

  async function createCustomerAndRequest(fullName = 'PHASE06F Test Customer') {
    const customer = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fullName, phone: uniquePhone(), type: 'INDIVIDUAL' });
    expect(customer.status).toBe(201);

    const serviceRequest = await request(app)
      .post('/api/v1/service-requests')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customerId: customer.body.id, serviceCategoryId: categoryId, description: 'Site inspection workflow test request' });
    expect(serviceRequest.status).toBe(201);

    return { customer: customer.body, serviceRequest: serviceRequest.body };
  }

  it('persists siteAddress through schedule -> details -> complete', async () => {
    const { serviceRequest } = await createCustomerAndRequest();

    const created = await request(app)
      .post('/api/v1/inspections')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        serviceRequestId: serviceRequest.id,
        inspectorId,
        scheduledAt: '2026-08-05T09:00:00Z',
        siteAddress: 'Site A, Sheikh Zayed Road',
      });
    expect(created.status).toBe(201);
    expect(created.body.siteAddress).toBe('Site A, Sheikh Zayed Road');
    expect(created.body.status).toBe('SCHEDULED');

    const details = await request(app)
      .patch(`/api/v1/inspections/${created.body.id}/details`)
      .set('Authorization', `Bearer ${inspectorToken}`)
      .send({ siteAddress: 'Site A (updated), Sheikh Zayed Road' });
    expect(details.status).toBe(200);
    expect(details.body.siteAddress).toBe('Site A (updated), Sheikh Zayed Road');
    expect(details.body.status).toBe('IN_PROGRESS');

    const completed = await request(app)
      .patch(`/api/v1/inspections/${created.body.id}/complete`)
      .set('Authorization', `Bearer ${inspectorToken}`)
      .send({});
    expect(completed.status).toBe(200);
    expect(completed.body.status).toBe('COMPLETED');
    expect(completed.body.siteAddress).toBe('Site A (updated), Sheikh Zayed Road');

    const srAfter = await request(app).get(`/api/v1/service-requests/${serviceRequest.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(srAfter.body.status).toBe('INSPECTION_COMPLETED');
  });

  it('auto-calculates materialCost/laborCost/estimatedCost from the estimate arrays and falls back to previously-stored values on partial saves', async () => {
    const { serviceRequest } = await createCustomerAndRequest();
    const created = await request(app)
      .post('/api/v1/inspections')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ serviceRequestId: serviceRequest.id, inspectorId, scheduledAt: '2026-08-05T09:00:00Z' });

    const withEstimates = await request(app)
      .patch(`/api/v1/inspections/${created.body.id}/details`)
      .set('Authorization', `Bearer ${inspectorToken}`)
      .send({
        materialEstimate: [{ material: 'Aluminum Profile', quantity: '20 meter', estimatedCost: 300 }],
        laborEstimate: [{ task: 'Installation', estimatedHours: 10, cost: 200 }],
        transportationCost: 75,
      });
    expect(withEstimates.status).toBe(200);
    expect(Number(withEstimates.body.materialCost)).toBe(300);
    expect(Number(withEstimates.body.laborCost)).toBe(200);
    expect(Number(withEstimates.body.transportationCost)).toBe(75);
    expect(Number(withEstimates.body.estimatedCost)).toBe(575);

    // Completing with an empty body must retain the previously computed figures,
    // not wipe them out just because this call didn't resend the estimate arrays.
    const completed = await request(app)
      .patch(`/api/v1/inspections/${created.body.id}/complete`)
      .set('Authorization', `Bearer ${inspectorToken}`)
      .send({});
    expect(completed.status).toBe(200);
    expect(Number(completed.body.materialCost)).toBe(300);
    expect(Number(completed.body.laborCost)).toBe(200);
    expect(Number(completed.body.transportationCost)).toBe(75);
    expect(Number(completed.body.estimatedCost)).toBe(575);
  });

  it('GET /inspections/completed returns only COMPLETED inspections, shaped for the Quotation picker', async () => {
    const { serviceRequest, customer } = await createCustomerAndRequest('PHASE06F Completed-Only Customer');
    const scheduled = await request(app)
      .post('/api/v1/inspections')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ serviceRequestId: serviceRequest.id, inspectorId, scheduledAt: '2026-08-06T09:00:00Z' });

    const notYetCompletedList = await request(app).get('/api/v1/inspections/completed').set('Authorization', `Bearer ${adminToken}`);
    expect(notYetCompletedList.status).toBe(200);
    expect(notYetCompletedList.body.some((i: { id: string }) => i.id === scheduled.body.id)).toBe(false);

    await request(app)
      .patch(`/api/v1/inspections/${scheduled.body.id}/complete`)
      .set('Authorization', `Bearer ${inspectorToken}`)
      .send({
        materialEstimate: [{ material: 'Glass Panel', quantity: '5 units', estimatedCost: 450 }],
        laborEstimate: [{ task: 'Fitting', estimatedHours: 6, cost: 150 }],
        estimatedDuration: '3 days',
      });

    const completedList = await request(app).get('/api/v1/inspections/completed').set('Authorization', `Bearer ${adminToken}`);
    expect(completedList.status).toBe(200);
    const entry = completedList.body.find((i: { id: string }) => i.id === scheduled.body.id);
    expect(entry).toBeDefined();
    expect(entry.customer.name).toBe(customer.fullName);
    expect(entry.service).toHaveProperty('name');
    expect(entry.materialCost).toBe(450);
    expect(entry.laborCost).toBe(150);
    expect(entry.estimatedCost).toBe(600);
    expect(entry.estimatedDuration).toBe('3 days');
  });

  it('includes the seeded Ahmed Furniture demo inspection with its $1500 estimate', async () => {
    const res = await request(app).get('/api/v1/inspections/completed').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const demo = res.body.find((i: { customer: { name: string } }) => i.customer.name === 'Ahmed Furniture');
    expect(demo).toBeDefined();
    expect(demo.estimatedCost).toBe(1500);
  });

  it('rejects listing completed inspections without the required permission', async () => {
    const email = `si-cust-${randomUUID()}@sms.local`;
    const reg = await request(app)
      .post('/api/v1/auth/register')
      .send({ email, fullName: 'RBAC Test Customer', password: 'Password123!', phone: uniquePhone() });
    expect(reg.status).toBe(201);
    const custToken = await login(email, 'Password123!');

    const res = await request(app).get('/api/v1/inspections/completed').set('Authorization', `Bearer ${custToken}`);
    expect(res.status).toBe(403);
  });
});
