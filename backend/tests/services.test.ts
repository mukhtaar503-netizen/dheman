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

function uniqueName(prefix: string) {
  return `${prefix} ${randomUUID().slice(0, 8)}`;
}

describe('Services module', () => {
  let adminToken: string;

  beforeAll(async () => {
    adminToken = await login('superadmin@sms.local', 'ChangeMe123!');
  });

  it('lists the seeded catalog (18 services across 4 categories)', async () => {
    const res = await request(app).get('/api/v1/services?pageSize=50').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThanOrEqual(18);
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

  it('returns aggregate statistics with a category breakdown', async () => {
    const res = await request(app).get('/api/v1/services/statistics').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalServices');
    expect(res.body).toHaveProperty('byCategory');
    expect(Array.isArray(res.body.byCategory)).toBe(true);
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
