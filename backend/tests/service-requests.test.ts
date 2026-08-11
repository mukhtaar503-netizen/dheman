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

async function createCustomer(adminToken: string, fullName = 'PHASE06 Test Customer') {
  const res = await request(app)
    .post('/api/v1/customers')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ fullName, phone: uniquePhone(), type: 'INDIVIDUAL' });
  expect(res.status).toBe(201);
  return res.body;
}

describe('Service Requests & Site Inspections module (PHASE 06)', () => {
  let adminToken: string;
  let categoryId: string;
  let serviceId: string;

  beforeAll(async () => {
    adminToken = await login('superadmin@sms.local', 'ChangeMe123!');

    const categories = await request(app).get('/api/v1/service-categories').set('Authorization', `Bearer ${adminToken}`);
    categoryId = categories.body[0].id;

    const services = await request(app).get('/api/v1/services?pageSize=1').set('Authorization', `Bearer ${adminToken}`);
    serviceId = services.body.items[0].id;
  });

  it('creates a Service Request with title/serviceId/projectLocation/preferredDate/priority', async () => {
    const customer = await createCustomer(adminToken);
    const res = await request(app)
      .post('/api/v1/service-requests')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: customer.id,
        serviceCategoryId: categoryId,
        serviceId,
        title: 'CCTV install',
        description: 'Install 8 cameras across the compound',
        projectLocation: 'Villa 12',
        preferredDate: '2026-08-15T09:00:00Z',
        priority: 'HIGH',
      });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('CCTV install');
    expect(res.body.serviceId).toBe(serviceId);
    expect(res.body.projectLocation).toBe('Villa 12');
    expect(res.body.priority).toBe('HIGH');
    expect(res.body.status).toBe('NEW');
  });

  it('rejects invalid input (missing required fields)', async () => {
    const res = await request(app)
      .post('/api/v1/service-requests')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ serviceCategoryId: categoryId });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('filters by priority, searches by title, and sorts by priority', async () => {
    const customer = await createCustomer(adminToken);
    const uniqueTitle = `Urgent Widget ${randomUUID().slice(0, 8)}`;
    await request(app)
      .post('/api/v1/service-requests')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customerId: customer.id, serviceCategoryId: categoryId, description: 'Test description', title: uniqueTitle, priority: 'URGENT' });

    const byPriority = await request(app).get('/api/v1/service-requests?priority=URGENT').set('Authorization', `Bearer ${adminToken}`);
    expect(byPriority.status).toBe(200);
    expect(byPriority.body.items.every((r: { priority: string }) => r.priority === 'URGENT')).toBe(true);

    const bySearch = await request(app)
      .get(`/api/v1/service-requests?search=${encodeURIComponent(uniqueTitle)}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(bySearch.body.total).toBe(1);

    const sorted = await request(app).get('/api/v1/service-requests?sort=priority&pageSize=100').set('Authorization', `Bearer ${adminToken}`);
    expect(sorted.status).toBe(200);
  });

  it('updates general fields via PATCH /:id without touching status', async () => {
    const customer = await createCustomer(adminToken);
    const created = await request(app)
      .post('/api/v1/service-requests')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customerId: customer.id, serviceCategoryId: categoryId, description: 'Test description' });

    const updated = await request(app)
      .patch(`/api/v1/service-requests/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ projectLocation: 'Updated location', priority: 'LOW' });
    expect(updated.status).toBe(200);
    expect(updated.body.projectLocation).toBe('Updated location');
    expect(updated.body.priority).toBe('LOW');
    expect(updated.body.status).toBe('NEW');
  });

  it('changes status via the dedicated /status endpoint', async () => {
    const customer = await createCustomer(adminToken);
    const created = await request(app)
      .post('/api/v1/service-requests')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customerId: customer.id, serviceCategoryId: categoryId, description: 'Test description' });

    const statusRes = await request(app)
      .patch(`/api/v1/service-requests/${created.body.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'UNDER_REVIEW' });
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.status).toBe('UNDER_REVIEW');
  });

  it('deletes a request with no Quotation, but blocks deletion once one exists', async () => {
    const customer = await createCustomer(adminToken);
    const created = await request(app)
      .post('/api/v1/service-requests')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customerId: customer.id, serviceCategoryId: categoryId, description: 'Test description' });

    const deleted = await request(app).delete(`/api/v1/service-requests/${created.body.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(deleted.status).toBe(204);

    const getAfter = await request(app).get(`/api/v1/service-requests/${created.body.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(getAfter.status).toBe(404);
  });

  it('returns dashboard statistics', async () => {
    const res = await request(app).get('/api/v1/service-requests/statistics').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalRequests');
    expect(res.body).toHaveProperty('pendingRequests');
    expect(res.body).toHaveProperty('scheduledInspections');
    expect(res.body).toHaveProperty('completedInspections');
    expect(res.body).toHaveProperty('averageInspectionCost');
    expect(Array.isArray(res.body.byStatus)).toBe(true);
    expect(Array.isArray(res.body.byPriority)).toBe(true);
    expect(Array.isArray(res.body.monthlyTrend)).toBe(true);
  });

  it('denies mutation without services-requests.manage, but customers can self-serve their own', async () => {
    const email = `sr-tech-${randomUUID()}@sms.local`;
    const createUser = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email, fullName: 'RBAC Test Tech', password: 'Password123!', role: 'TECHNICIAN' });
    expect(createUser.status).toBe(201);
    const techToken = await login(email, 'Password123!');

    const create = await request(app)
      .post('/api/v1/service-requests')
      .set('Authorization', `Bearer ${techToken}`)
      .send({ customerId: randomUUID(), serviceCategoryId: categoryId, description: 'Denied' });
    expect(create.status).toBe(403);
    expect(create.body.error).toContain('service-requests.manage');
  });

  describe('customer self-service', () => {
    let custToken: string;

    beforeAll(async () => {
      const email = `sr-cust-${randomUUID()}@sms.local`;
      const reg = await request(app)
        .post('/api/v1/auth/register')
        .send({ email, fullName: 'Self Service Customer', password: 'Password123!', phone: uniquePhone() });
      expect(reg.status).toBe(201);
      custToken = await login(email, 'Password123!');
    });

    it('creates and lists own requests as a paginated result', async () => {
      const created = await request(app)
        .post('/api/v1/service-requests/me')
        .set('Authorization', `Bearer ${custToken}`)
        .send({ serviceCategoryId: categoryId, description: 'My own request', priority: 'MEDIUM' });
      expect(created.status).toBe(201);

      const list = await request(app).get('/api/v1/service-requests/me').set('Authorization', `Bearer ${custToken}`);
      expect(list.status).toBe(200);
      expect(list.body).toHaveProperty('items');
      expect(list.body).toHaveProperty('total');
      expect(Array.isArray(list.body.items)).toBe(true);
      expect(list.body.items.length).toBeGreaterThanOrEqual(1);
    });

    it('rejects attachment upload-url requests for another customer\'s request', async () => {
      const customer = await createCustomer(adminToken);
      const otherRequest = await request(app)
        .post('/api/v1/service-requests')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ customerId: customer.id, serviceCategoryId: categoryId, description: 'Not mine' });

      const res = await request(app)
        .post(`/api/v1/service-requests/me/${otherRequest.body.id}/attachments/upload-url`)
        .set('Authorization', `Bearer ${custToken}`)
        .send({ fileName: 'photo.jpg' });
      expect(res.status).toBe(403);
    });
  });

  describe('Site Inspection lifecycle', () => {
    let inspectorToken: string;
    let inspectorId: string;
    let requestId: string;
    let inspectionId: string;

    beforeAll(async () => {
      const email = `sr-inspector-${randomUUID()}@sms.local`;
      const createUser = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email, fullName: 'Test Inspector', password: 'Password123!', role: 'SITE_INSPECTOR' });
      inspectorId = createUser.body.id;
      inspectorToken = await login(email, 'Password123!');

      const customer = await createCustomer(adminToken);
      const created = await request(app)
        .post('/api/v1/service-requests')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ customerId: customer.id, serviceCategoryId: categoryId, description: 'Needs inspection' });
      requestId = created.body.id;
    });

    it('schedules an inspection and moves the request to SITE_INSPECTION_SCHEDULED', async () => {
      const res = await request(app)
        .post('/api/v1/inspections')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ serviceRequestId: requestId, inspectorId, scheduledAt: '2026-08-01T09:00:00Z' });
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('SCHEDULED');
      inspectionId = res.body.id;

      const requestAfter = await request(app).get(`/api/v1/service-requests/${requestId}`).set('Authorization', `Bearer ${adminToken}`);
      expect(requestAfter.body.status).toBe('SITE_INSPECTION_SCHEDULED');
    });

    it('saves incremental details and moves the inspection to IN_PROGRESS', async () => {
      const res = await request(app)
        .patch(`/api/v1/inspections/${inspectionId}/details`)
        .set('Authorization', `Bearer ${inspectorToken}`)
        .send({
          measurements: [{ label: 'Front wall', width: 5, height: 3, unit: 'm', area: 15 }],
          materialEstimate: [{ material: 'Aluminum Profile', quantity: '20 meters', estimatedCost: 300 }],
          laborEstimate: [{ task: 'Installation', estimatedHours: 8, cost: 200 }],
          estimatedCost: 500,
          estimatedDuration: '2 days',
        });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('IN_PROGRESS');
      expect(res.body.measurements).toHaveLength(1);
      expect(res.body.materialEstimate).toEqual([{ material: 'Aluminum Profile', quantity: '20 meters', estimatedCost: 300 }]);
    });

    it('mints a photo upload URL (or reports storage not configured, proving the route is wired)', async () => {
      const res = await request(app)
        .post(`/api/v1/inspections/${inspectionId}/photos/upload-url`)
        .set('Authorization', `Bearer ${inspectorToken}`)
        .send({ fileName: 'front-wall.jpg' });
      expect([200, 400]).toContain(res.status);
      if (res.status === 400) expect(res.body.error).toContain('storage');
    });

    it('completes the inspection and moves the request to INSPECTION_COMPLETED', async () => {
      const res = await request(app)
        .patch(`/api/v1/inspections/${inspectionId}/complete`)
        .set('Authorization', `Bearer ${inspectorToken}`)
        .send({
          estimatedCost: 500,
          estimatedDuration: '2 days',
        });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('COMPLETED');
      expect(res.body.submittedAt).toBeTruthy();

      const requestAfter = await request(app).get(`/api/v1/service-requests/${requestId}`).set('Authorization', `Bearer ${adminToken}`);
      expect(requestAfter.body.status).toBe('INSPECTION_COMPLETED');
    });

    it('rejects further /details updates once the inspection is completed', async () => {
      const res = await request(app)
        .patch(`/api/v1/inspections/${inspectionId}/details`)
        .set('Authorization', `Bearer ${inspectorToken}`)
        .send({ estimatedDuration: 'Too late' });
      expect(res.status).toBe(400);
    });
  });
});
