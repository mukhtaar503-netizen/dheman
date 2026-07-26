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

describe('Customers module', () => {
  let adminToken: string;

  beforeAll(async () => {
    adminToken = await login('superadmin@sms.local', 'ChangeMe123!');
  });

  it('creates a customer with an auto-generated customer code, addresses, and contacts', async () => {
    const phone = uniquePhone();
    const res = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Test Customer Alpha',
        type: 'CORPORATE',
        phone,
        email: `alpha-${randomUUID()}@example.test`,
        siteAddresses: [{ label: 'HQ', addressLine: '1 Test St', isDefault: true }],
        contacts: [{ name: 'Primary Contact', isPrimary: true }],
      });

    expect(res.status).toBe(201);
    expect(res.body.customerCode).toMatch(/^CUS-\d{6}$/);
    expect(res.body.siteAddresses).toHaveLength(1);
    expect(res.body.contacts).toHaveLength(1);
  });

  it('rejects a duplicate phone number, then allows it with allowDuplicate=true', async () => {
    const phone = uniquePhone();
    const first = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fullName: 'Original Owner', phone });
    expect(first.status).toBe(201);

    const duplicate = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fullName: 'Duplicate Attempt', phone });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.details.existingCustomerId).toBe(first.body.id);

    const overridden = await request(app)
      .post('/api/v1/customers?allowDuplicate=true')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fullName: 'Duplicate Attempt', phone });
    expect(overridden.status).toBe(201);
  });

  it('rejects invalid input with a 400 and field-level details', async () => {
    const res = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fullName: 'X', phone: '123456', email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('searches customers by name and by generated customer code', async () => {
    const phone = uniquePhone();
    const created = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fullName: 'Zephyr Search Target', phone });

    const byName = await request(app)
      .get('/api/v1/customers?search=Zephyr Search Target')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(byName.body.items.some((c: { id: string }) => c.id === created.body.id)).toBe(true);

    const byCode = await request(app)
      .get(`/api/v1/customers?search=${created.body.customerCode}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(byCode.body.items).toHaveLength(1);
    expect(byCode.body.items[0].id).toBe(created.body.id);
  });

  it('soft-deletes and restores a customer, excluding/including it from the default list', async () => {
    const phone = uniquePhone();
    const created = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fullName: 'Soft Delete Target', phone });
    const id = created.body.id;

    const del = await request(app).delete(`/api/v1/customers/${id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(del.status).toBe(200);
    expect(del.body.deletedAt).not.toBeNull();

    const getDefault = await request(app).get(`/api/v1/customers/${id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(getDefault.status).toBe(404);

    const getIncluded = await request(app)
      .get(`/api/v1/customers/${id}?includeDeleted=true`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(getIncluded.status).toBe(200);

    const restore = await request(app).post(`/api/v1/customers/${id}/restore`).set('Authorization', `Bearer ${adminToken}`);
    expect(restore.status).toBe(200);
    expect(restore.body.deletedAt).toBeNull();

    const getAfterRestore = await request(app).get(`/api/v1/customers/${id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(getAfterRestore.status).toBe(200);
  });

  it('bulk-updates status for multiple customers', async () => {
    const c1 = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fullName: 'Bulk One', phone: uniquePhone() });
    const c2 = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fullName: 'Bulk Two', phone: uniquePhone() });

    const bulk = await request(app)
      .post('/api/v1/customers/bulk/status')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ids: [c1.body.id, c2.body.id], status: 'INACTIVE' });
    expect(bulk.status).toBe(200);
    expect(bulk.body.updated).toBe(2);

    const check = await request(app).get(`/api/v1/customers/${c1.body.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(check.body.status).toBe('INACTIVE');
  });

  it('manages notes with pinning, ordering pinned notes first', async () => {
    const created = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fullName: 'Note Target', phone: uniquePhone() });
    const id = created.body.id;

    await request(app).post(`/api/v1/customers/${id}/notes`).set('Authorization', `Bearer ${adminToken}`).send({ note: 'unpinned note' });
    await request(app)
      .post(`/api/v1/customers/${id}/notes`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ note: 'pinned note', isPinned: true });

    const detail = await request(app).get(`/api/v1/customers/${id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(detail.body.notes[0].isPinned).toBe(true);
    expect(detail.body.notes[0].note).toBe('pinned note');
  });

  it('enforces a single default site address per customer', async () => {
    const created = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Address Target',
        phone: uniquePhone(),
        siteAddresses: [{ label: 'First', addressLine: '1 First St', isDefault: true }],
      });
    const id = created.body.id;
    const firstAddressId = created.body.siteAddresses[0].id;

    await request(app)
      .post(`/api/v1/customers/${id}/site-addresses`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ label: 'Second', addressLine: '2 Second St', isDefault: true });

    const detail = await request(app).get(`/api/v1/customers/${id}`).set('Authorization', `Bearer ${adminToken}`);
    const defaults = detail.body.siteAddresses.filter((a: { isDefault: boolean }) => a.isDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].label).toBe('Second');

    const originalStillThere = detail.body.siteAddresses.find((a: { id: string }) => a.id === firstAddressId);
    expect(originalStillThere.isDefault).toBe(false);
  });

  it('supports document versioning via replacesId', async () => {
    const created = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fullName: 'Document Target', phone: uniquePhone() });
    const id = created.body.id;

    const v1 = await request(app)
      .post(`/api/v1/customers/${id}/documents`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fileName: 'doc-v1.pdf', fileUrl: 'https://example.test/doc-v1.pdf' });
    expect(v1.body.version).toBe(1);

    const v2 = await request(app)
      .post(`/api/v1/customers/${id}/documents`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fileName: 'doc-v2.pdf', fileUrl: 'https://example.test/doc-v2.pdf', replacesId: v1.body.id });
    expect(v2.body.version).toBe(2);

    const history = await request(app)
      .get(`/api/v1/customers/${id}/documents/${v2.body.id}/versions`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(history.body.map((d: { version: number }) => d.version)).toEqual([2, 1]);
  });

  it('denies customer access to a user without the customers.read permission', async () => {
    const email = `tech-${randomUUID()}@sms.local`;
    const createUser = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email, fullName: 'RBAC Test Tech', password: 'Password123!', role: 'TECHNICIAN' });
    expect(createUser.status).toBe(201);

    const techToken = await login(email, 'Password123!');

    const res = await request(app).get('/api/v1/customers').set('Authorization', `Bearer ${techToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('customers.read');
  });

  it('returns aggregate statistics', async () => {
    const res = await request(app).get('/api/v1/customers/statistics').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalCustomers');
    expect(res.body).toHaveProperty('monthlyRegistrations');
    expect(typeof res.body.totalCustomers).toBe('number');
  });
});
