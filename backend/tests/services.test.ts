import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'crypto';
// Relative import: tsconfig path aliases (@/...) only resolve for files under
// src/ (this test file lives outside it); everything app.ts imports internally
// still resolves via the alias as normal.
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';

const app = createApp();

async function login(email: string, password: string) {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password });
  expect(res.status).toBe(200);
  return res.body.accessToken as string;
}

function uniqueName(prefix: string) {
  return `${prefix} ${randomUUID().slice(0, 8)}`;
}

describe('Services module', () => {
  let adminToken: string;

  beforeAll(async () => {
    adminToken = await login('superadmin@sms.local', 'ChangeMe123!');
  });

  it('lists the seeded catalog (26 services across 5 categories)', async () => {
    const res = await request(app).get('/api/v1/services?pageSize=50').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThanOrEqual(26);
  });

  it('creates a service and rejects a duplicate name within the same category', async () => {
    const serviceName = uniqueName('Alpha Service');
    const created = await request(app)
      .post('/api/v1/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ serviceName, category: 'FURNITURE', description: 'Test', durationMinutes: 60, estimatedCost: 100, requiredMaterials: ['Screws'] });
    expect(created.status).toBe(201);
    expect(created.body.requiredMaterials).toEqual(['Screws']);

    const duplicate = await request(app)
      .post('/api/v1/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ serviceName, category: 'FURNITURE' });
    expect(duplicate.status).toBe(409);

    const differentCategory = await request(app)
      .post('/api/v1/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ serviceName, category: 'CCTV' });
    expect(differentCategory.status).toBe(201);
  });

  it('rejects invalid input (bad category enum, short name)', async () => {
    const res = await request(app)
      .post('/api/v1/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ serviceName: 'X', category: 'NOT_REAL' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('filters by category and searches by name', async () => {
    const serviceName = uniqueName('Searchable Widget');
    await request(app)
      .post('/api/v1/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ serviceName, category: 'PVC' });

    const byCategory = await request(app).get('/api/v1/services?category=PVC').set('Authorization', `Bearer ${adminToken}`);
    expect(byCategory.body.items.every((s: { category: string }) => s.category === 'PVC')).toBe(true);

    const bySearch = await request(app)
      .get(`/api/v1/services?search=${encodeURIComponent(serviceName)}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(bySearch.body.total).toBe(1);
    expect(bySearch.body.items[0].serviceName).toBe(serviceName);
  });

  it('creates and filters a service in the MOVING category', async () => {
    const serviceName = uniqueName('House Moving Extra');
    const created = await request(app)
      .post('/api/v1/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ serviceName, category: 'MOVING', description: 'Test move', durationMinutes: 240, estimatedCost: 300 });
    expect(created.status).toBe(201);
    expect(created.body.category).toBe('MOVING');

    const byCategory = await request(app).get('/api/v1/services?category=MOVING&pageSize=50').set('Authorization', `Bearer ${adminToken}`);
    expect(byCategory.status).toBe(200);
    expect(byCategory.body.total).toBeGreaterThanOrEqual(7);
    expect(byCategory.body.items.every((s: { category: string }) => s.category === 'MOVING')).toBe(true);
  });

  it('round-trips features, imageUrl, displayOrder and notes through create and update', async () => {
    const created = await request(app)
      .post('/api/v1/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        serviceName: uniqueName('Feature Rich Service'),
        category: 'PVC',
        features: ['High-Quality PVC Materials', 'Modern Interior Designs'],
        imageUrl: 'https://example.com/service.png',
        displayOrder: 3,
        notes: 'Internal note about this service',
      });
    expect(created.status).toBe(201);
    expect(created.body.features).toEqual(['High-Quality PVC Materials', 'Modern Interior Designs']);
    expect(created.body.imageUrl).toBe('https://example.com/service.png');
    expect(created.body.displayOrder).toBe(3);
    expect(created.body.notes).toBe('Internal note about this service');

    const updated = await request(app)
      .patch(`/api/v1/services/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ features: ['Durable & Easy-to-Maintain Solutions'], displayOrder: 9, notes: null });
    expect(updated.status).toBe(200);
    expect(updated.body.features).toEqual(['Durable & Easy-to-Maintain Solutions']);
    expect(updated.body.displayOrder).toBe(9);
    expect(updated.body.notes).toBeNull();
  });

  it('sorts by display_order ascending', async () => {
    const first = await request(app)
      .post('/api/v1/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ serviceName: uniqueName('Order First'), category: 'ALUMINUM', displayOrder: 1 });
    const second = await request(app)
      .post('/api/v1/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ serviceName: uniqueName('Order Second'), category: 'ALUMINUM', displayOrder: 2 });

    const sorted = await request(app)
      .get('/api/v1/services?sort=display_order&pageSize=100')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(sorted.status).toBe(200);
    const ids = sorted.body.items.map((s: { id: string }) => s.id);
    expect(ids.indexOf(first.body.id)).toBeLessThan(ids.indexOf(second.body.id));
  });

  it('updates a service', async () => {
    const created = await request(app)
      .post('/api/v1/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ serviceName: uniqueName('Update Target'), category: 'ALUMINUM', estimatedCost: 200 });

    const updated = await request(app)
      .patch(`/api/v1/services/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ estimatedCost: 350, requiredMaterials: ['Panel', 'Sealant'] });
    expect(updated.status).toBe(200);
    expect(updated.body.estimatedCost).toBe('350');
    expect(updated.body.requiredMaterials).toEqual(['Panel', 'Sealant']);
  });

  it('activates and deactivates a service, and status filtering reflects it', async () => {
    const created = await request(app)
      .post('/api/v1/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ serviceName: uniqueName('Toggle Target'), category: 'CCTV' });
    const id = created.body.id;

    const deactivated = await request(app).post(`/api/v1/services/${id}/deactivate`).set('Authorization', `Bearer ${adminToken}`);
    expect(deactivated.body.status).toBe('INACTIVE');

    const inactiveList = await request(app).get('/api/v1/services?status=INACTIVE&pageSize=100').set('Authorization', `Bearer ${adminToken}`);
    expect(inactiveList.body.items.some((s: { id: string }) => s.id === id)).toBe(true);

    const reactivated = await request(app).post(`/api/v1/services/${id}/activate`).set('Authorization', `Bearer ${adminToken}`);
    expect(reactivated.body.status).toBe('ACTIVE');
  });

  it('deletes a service with no active-project linkage', async () => {
    const created = await request(app)
      .post('/api/v1/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ serviceName: uniqueName('Delete Target'), category: 'FURNITURE' });

    const deleted = await request(app).delete(`/api/v1/services/${created.body.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(deleted.status).toBe(204);

    const getAfter = await request(app).get(`/api/v1/services/${created.body.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(getAfter.status).toBe(404);
  });

  it('returns aggregate statistics with a category breakdown and recently added services', async () => {
    const created = await request(app)
      .post('/api/v1/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ serviceName: uniqueName('Freshly Added'), category: 'MOVING' });
    expect(created.status).toBe(201);

    const res = await request(app).get('/api/v1/services/statistics').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalServices');
    expect(res.body).toHaveProperty('activeServices');
    expect(res.body).toHaveProperty('inactiveServices');
    expect(res.body).toHaveProperty('byCategory');
    expect(Array.isArray(res.body.byCategory)).toBe(true);
    expect(Array.isArray(res.body.recentlyAdded)).toBe(true);
    expect(res.body.recentlyAdded.length).toBeLessThanOrEqual(5);
    expect(res.body.recentlyAdded.some((s: { id: string }) => s.id === created.body.id)).toBe(true);
  });

  it('surfaces mostFrequentlyUsed services based on real quotation line item usage', async () => {
    const serviceA = await request(app)
      .post('/api/v1/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ serviceName: uniqueName('Heavily Used Service'), category: 'CCTV' });
    const serviceB = await request(app)
      .post('/api/v1/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ serviceName: uniqueName('Rarely Used Service'), category: 'CCTV' });
    expect(serviceA.status).toBe(201);
    expect(serviceB.status).toBe(201);

    const customer = await prisma.customer.create({
      data: {
        customerCode: `CUST-STAT-${randomUUID().slice(0, 8)}`,
        fullName: 'Statistics Test Customer',
        phone: `055${randomUUID().slice(0, 7)}`,
      },
    });
    const serviceCategory = await prisma.serviceCategory.findFirstOrThrow({ where: { code: 'CCTV' } });
    const serviceRequest = await prisma.serviceRequest.create({
      data: {
        referenceNo: `SR-STAT-${randomUUID().slice(0, 8)}`,
        customerId: customer.id,
        serviceCategoryId: serviceCategory.id,
        description: 'Statistics test service request',
      },
    });

    async function createLineItemsFor(serviceId: string, count: number) {
      for (let i = 0; i < count; i += 1) {
        const quotation = await prisma.quotation.create({
          data: {
            quotationNo: `QT-STAT-${randomUUID().slice(0, 8)}`,
            serviceRequestId: serviceRequest.id,
            customerId: customer.id,
          },
        });
        await prisma.quotationLineItem.create({
          data: {
            quotationId: quotation.id,
            serviceId,
            description: 'Statistics test line item',
            quantity: 1,
            unit: 'unit',
            unitPrice: 100,
            subtotal: 100,
          },
        });
      }
    }

    await createLineItemsFor(serviceA.body.id, 3);
    await createLineItemsFor(serviceB.body.id, 1);

    const res = await request(app).get('/api/v1/services/statistics').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.mostFrequentlyUsed)).toBe(true);

    const entryA = res.body.mostFrequentlyUsed.find((s: { id: string }) => s.id === serviceA.body.id);
    const entryB = res.body.mostFrequentlyUsed.find((s: { id: string }) => s.id === serviceB.body.id);
    expect(entryA).toBeDefined();
    expect(entryA.usageCount).toBe(3);
    if (entryB) {
      expect(res.body.mostFrequentlyUsed.indexOf(entryA)).toBeLessThan(res.body.mostFrequentlyUsed.indexOf(entryB));
    }
  });

  it('allows any authenticated user to read, but denies mutation without services.manage', async () => {
    const email = `svc-tech-${randomUUID()}@sms.local`;
    const createUser = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email, fullName: 'RBAC Test Tech', password: 'Password123!', role: 'TECHNICIAN' });
    expect(createUser.status).toBe(201);

    const techToken = await login(email, 'Password123!');

    const list = await request(app).get('/api/v1/services').set('Authorization', `Bearer ${techToken}`);
    expect(list.status).toBe(200);

    const create = await request(app)
      .post('/api/v1/services')
      .set('Authorization', `Bearer ${techToken}`)
      .send({ serviceName: 'Denied Service', category: 'CCTV' });
    expect(create.status).toBe(403);
    expect(create.body.error).toContain('services.manage');
  });
});
