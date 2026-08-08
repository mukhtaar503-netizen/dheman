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

describe('Employee Management module', () => {
  let adminToken: string;

  beforeAll(async () => {
    adminToken = await login('superadmin@sms.local', 'ChangeMe123!');
  });

  async function createEmployee(overrides: Record<string, unknown> = {}) {
    const email = `emp-${randomUUID()}@sms.local`;
    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Employee Mgmt Test',
        email,
        password: 'Password123!',
        role: 'TECHNICIAN',
        ...overrides,
      });
    expect(res.status).toBe(201);
    return res.body;
  }

  it('registers an employee with full profile fields', async () => {
    const employeeId = `EMP-${randomUUID().slice(0, 8)}`;
    const employee = await createEmployee({
      employeeId,
      department: 'Operations',
      jobTitle: 'Field Supervisor',
      address: '12 Main St',
      hireDate: '2026-01-15',
      phone: `+1555${randomUUID().replace(/-/g, '').slice(0, 7)}`,
      role: 'SUPERVISOR',
    });
    expect(employee.employeeId).toBe(employeeId);
    expect(employee.department).toBe('Operations');
    expect(employee.jobTitle).toBe('Field Supervisor');
    expect(employee.role).toBe('SUPERVISOR');
    expect(employee.status).toBe('ACTIVE');
  });

  it('rejects duplicate email, Employee ID, and phone number', async () => {
    const phone = `+1555${randomUUID().replace(/-/g, '').slice(0, 7)}`;
    const employeeId = `EMP-${randomUUID().slice(0, 8)}`;
    const employee = await createEmployee({ employeeId, phone });

    const dupEmail = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fullName: 'Dup Email', email: employee.email, password: 'Password123!', role: 'TECHNICIAN' });
    expect(dupEmail.status).toBe(409);

    const dupEmployeeId = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fullName: 'Dup Emp Id', email: `x-${randomUUID()}@sms.local`, password: 'Password123!', role: 'TECHNICIAN', employeeId });
    expect(dupEmployeeId.status).toBe(409);

    const dupPhone = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fullName: 'Dup Phone', email: `y-${randomUUID()}@sms.local`, password: 'Password123!', role: 'TECHNICIAN', phone });
    expect(dupPhone.status).toBe(409);
  });

  it('lists employees with search, role/status filters, sorting, and pagination', async () => {
    const uniqueTag = randomUUID().slice(0, 8);
    await createEmployee({ fullName: `Searchable ${uniqueTag}`, role: 'ACCOUNTANT' });

    const searchRes = await request(app).get(`/api/v1/users?search=${uniqueTag}`).set('Authorization', `Bearer ${adminToken}`);
    expect(searchRes.status).toBe(200);
    expect(searchRes.body.items).toHaveLength(1);

    const roleRes = await request(app).get('/api/v1/users?role=ACCOUNTANT').set('Authorization', `Bearer ${adminToken}`);
    expect(roleRes.status).toBe(200);
    expect(roleRes.body.items.every((u: { role: string }) => u.role === 'ACCOUNTANT')).toBe(true);

    // Scope to just these two records (via search) so the ordering check doesn't depend on
    // Postgres's collation agreeing with JS localeCompare across every other test file's data,
    // or get cut off by pagination once the shared test DB accumulates many users.
    const suffix = randomUUID().slice(0, 8);
    await createEmployee({ fullName: `AAA_First_${suffix}` });
    await createEmployee({ fullName: `ZZZ_Last_${suffix}` });
    const sortedRes = await request(app)
      .get(`/api/v1/users?sort=alphabetical&search=${suffix}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(sortedRes.status).toBe(200);
    const names = sortedRes.body.items.map((u: { fullName: string }) => u.fullName);
    expect(names.indexOf(`AAA_First_${suffix}`)).toBeLessThan(names.indexOf(`ZZZ_Last_${suffix}`));
  });

  it('updates status to ON_LEAVE / INACTIVE and reflects it in statistics', async () => {
    const employee = await createEmployee();

    const before = await request(app).get('/api/v1/users/statistics').set('Authorization', `Bearer ${adminToken}`);
    expect(before.status).toBe(200);

    const onLeave = await request(app)
      .patch(`/api/v1/users/${employee.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ON_LEAVE' });
    expect(onLeave.status).toBe(200);
    expect(onLeave.body.status).toBe('ON_LEAVE');

    const after = await request(app).get('/api/v1/users/statistics').set('Authorization', `Bearer ${adminToken}`);
    expect(after.body.onLeaveEmployees).toBe(before.body.onLeaveEmployees + 1);

    const deactivated = await request(app)
      .patch(`/api/v1/users/${employee.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'INACTIVE' });
    expect(deactivated.status).toBe(200);
    expect(deactivated.body.status).toBe('INACTIVE');
  });

  it('records, lists, and deletes an Employee document, and includes it on the detail endpoint', async () => {
    const employee = await createEmployee();

    const added = await request(app)
      .post(`/api/v1/users/${employee.id}/documents`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ category: 'ID_CARD', fileName: 'id.png', fileUrl: 'https://example.com/id.png' });
    expect(added.status).toBe(201);

    const detail = await request(app).get(`/api/v1/users/${employee.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(detail.status).toBe(200);
    expect(detail.body.employeeDocuments).toHaveLength(1);
    expect(detail.body.employeeDocuments[0].category).toBe('ID_CARD');

    const removed = await request(app)
      .delete(`/api/v1/users/${employee.id}/documents/${added.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(removed.status).toBe(204);

    const detailAfter = await request(app).get(`/api/v1/users/${employee.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(detailAfter.body.employeeDocuments).toHaveLength(0);
  });

  it('records CREATE/UPDATE audit log entries retrievable by entityId', async () => {
    const employee = await createEmployee();
    await request(app).patch(`/api/v1/users/${employee.id}`).set('Authorization', `Bearer ${adminToken}`).send({ jobTitle: 'Updated Title' });

    const logs = await request(app)
      .get(`/api/v1/audit-logs?entityType=User&entityId=${employee.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(logs.status).toBe(200);
    expect(logs.body.items.length).toBeGreaterThanOrEqual(2);
    expect(logs.body.items.every((l: { entityId: string }) => l.entityId === employee.id)).toBe(true);
  });

  it('denies employee management endpoints without users.manage permission', async () => {
    const custEmail = `emp-noperm-${randomUUID()}@sms.local`;
    await request(app).post('/api/v1/auth/register').send({ email: custEmail, fullName: 'No Perm', password: 'Password123!', phone: `+1555${randomUUID().replace(/-/g, '').slice(0, 7)}` });
    const custToken = await login(custEmail, 'Password123!');

    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${custToken}`)
      .send({ fullName: 'Should Fail', email: `z-${randomUUID()}@sms.local`, password: 'Password123!', role: 'TECHNICIAN' });
    expect(res.status).toBe(403);
  });
});
