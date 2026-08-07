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

describe('Staff Registration module (Project <-> Staff assignment)', () => {
  let adminToken: string;
  let categoryId: string;

  beforeAll(async () => {
    adminToken = await login('superadmin@sms.local', 'ChangeMe123!');
    const categories = await request(app).get('/api/v1/service-categories').set('Authorization', `Bearer ${adminToken}`);
    categoryId = categories.body[0].id;
  });

  /** Builds a real Project through the full pre-sales -> approved-quotation pipeline, exactly as production would. */
  async function createApprovedProject() {
    const email = `staffreg-cust-${randomUUID()}@sms.local`;
    const reg = await request(app)
      .post('/api/v1/auth/register')
      .send({ email, fullName: 'Staff Reg Test Customer', password: 'Password123!', phone: uniquePhone() });
    expect(reg.status).toBe(201);
    const custToken = await login(email, 'Password123!');

    const custList = await request(app)
      .get('/api/v1/customers?search=Staff Reg Test Customer')
      .set('Authorization', `Bearer ${adminToken}`);
    const customerId = custList.body.items[0].id;

    const serviceRequest = await request(app)
      .post('/api/v1/service-requests')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customerId, serviceCategoryId: categoryId, description: 'Staff registration test request' });
    expect(serviceRequest.status).toBe(201);

    const quotation = await request(app)
      .post('/api/v1/quotations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        serviceRequestId: serviceRequest.body.id,
        lineItems: [{ category: 'MATERIAL', description: 'Item', quantity: 1, unit: 'unit', unitPrice: 100 }],
      });
    expect(quotation.status).toBe(201);

    await request(app).patch(`/api/v1/quotations/${quotation.body.id}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'SENT' });
    const approved = await request(app)
      .post(`/api/v1/quotations/${quotation.body.id}/respond`)
      .set('Authorization', `Bearer ${custToken}`)
      .send({ decision: 'APPROVED' });
    expect(approved.status).toBe(200);

    const project = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ quotationId: quotation.body.id, projectManagerId: (await getAdminId()) });
    expect(project.status).toBe(201);
    return project.body as { id: string };
  }

  let adminId: string | undefined;
  async function getAdminId() {
    if (adminId) return adminId;
    const me = await request(app).get('/api/v1/users/me').set('Authorization', `Bearer ${adminToken}`);
    adminId = me.body.id as string;
    return adminId;
  }

  async function createStaffUser(role: 'TECHNICIAN' | 'SUPERVISOR' = 'TECHNICIAN', employeeId?: string) {
    const email = `staffreg-staff-${randomUUID()}@sms.local`;
    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email, fullName: 'Staff Reg Test Staff', password: 'Password123!', role, employeeId, department: 'Installation' });
    expect(res.status).toBe(201);
    return res.body as { id: string; fullName: string };
  }

  it('assigns one or more staff members to a Project with a responsibility and date range', async () => {
    const project = await createApprovedProject();
    const staff1 = await createStaffUser();
    const staff2 = await createStaffUser('SUPERVISOR');

    const res = await request(app)
      .post(`/api/v1/projects/${project.id}/staff`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        userIds: [staff1.id, staff2.id],
        responsibility: 'TECHNICIAN',
        startDate: '2026-09-01',
        endDate: '2026-09-30',
        notes: 'Installation crew',
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveLength(2);

    const detail = await request(app).get(`/api/v1/projects/${project.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(detail.body.staffAssignments).toHaveLength(2);
    expect(detail.body.staffAssignments[0].user.fullName).toBe('Staff Reg Test Staff');
    expect(detail.body.staffAssignments[0].responsibility).toBe('TECHNICIAN');
  });

  it('rejects assigning the same staff member to the same Project twice (duplicate prevention)', async () => {
    const project = await createApprovedProject();
    const staff = await createStaffUser();

    const first = await request(app)
      .post(`/api/v1/projects/${project.id}/staff`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userIds: [staff.id], responsibility: 'ELECTRICIAN' });
    expect(first.status).toBe(201);

    const duplicate = await request(app)
      .post(`/api/v1/projects/${project.id}/staff`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userIds: [staff.id], responsibility: 'SUPERVISOR' });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.details.duplicates[0].userId).toBe(staff.id);
  });

  it('updates a staff assignment responsibility/dates and removes it', async () => {
    const project = await createApprovedProject();
    const staff = await createStaffUser();

    const assigned = await request(app)
      .post(`/api/v1/projects/${project.id}/staff`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userIds: [staff.id], responsibility: 'CARPENTER' });
    const assignmentId = assigned.body[0].id;

    const updated = await request(app)
      .patch(`/api/v1/projects/${project.id}/staff/${assignmentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ responsibility: 'SUPERVISOR', notes: 'Promoted' });
    expect(updated.status).toBe(200);
    expect(updated.body.responsibility).toBe('SUPERVISOR');
    expect(updated.body.notes).toBe('Promoted');

    const removed = await request(app)
      .delete(`/api/v1/projects/${project.id}/staff/${assignmentId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(removed.status).toBe(204);

    const detail = await request(app).get(`/api/v1/projects/${project.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(detail.body.staffAssignments).toHaveLength(0);
  });

  it('rejects assigning a non-existent staff member and a Customer-role account', async () => {
    const project = await createApprovedProject();

    const missing = await request(app)
      .post(`/api/v1/projects/${project.id}/staff`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userIds: [randomUUID()], responsibility: 'TECHNICIAN' });
    expect(missing.status).toBe(400);

    const custEmail = `staffreg-cust2-${randomUUID()}@sms.local`;
    await request(app).post('/api/v1/auth/register').send({ email: custEmail, fullName: 'Cannot Assign Me', password: 'Password123!', phone: uniquePhone() });
    const custMe = await request(app).post('/api/v1/auth/login').send({ email: custEmail, password: 'Password123!' });
    const customerUser = await request(app).get('/api/v1/users/me').set('Authorization', `Bearer ${custMe.body.accessToken}`);

    const rejected = await request(app)
      .post(`/api/v1/projects/${project.id}/staff`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userIds: [customerUser.body.id], responsibility: 'TECHNICIAN' });
    expect(rejected.status).toBe(400);
  });

  it('prevents a duplicate Employee ID across Users', async () => {
    const empId = `EMP-${randomUUID().slice(0, 8)}`;
    await createStaffUser('TECHNICIAN', empId);

    const email = `staffreg-dupemp-${randomUUID()}@sms.local`;
    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email, fullName: 'Duplicate Employee Id', password: 'Password123!', role: 'TECHNICIAN', employeeId: empId });
    expect(res.status).toBe(409);
  });

  it('denies staff assignment without projects.manage permission', async () => {
    const project = await createApprovedProject();
    const staff = await createStaffUser();

    const custEmail = `staffreg-noperm-${randomUUID()}@sms.local`;
    await request(app).post('/api/v1/auth/register').send({ email: custEmail, fullName: 'No Perm User', password: 'Password123!', phone: uniquePhone() });
    const custToken = await login(custEmail, 'Password123!');

    const res = await request(app)
      .post(`/api/v1/projects/${project.id}/staff`)
      .set('Authorization', `Bearer ${custToken}`)
      .send({ userIds: [staff.id], responsibility: 'TECHNICIAN' });
    expect(res.status).toBe(403);
  });
});
