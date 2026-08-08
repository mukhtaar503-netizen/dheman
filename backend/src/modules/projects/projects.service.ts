import { InvoiceStatus, NotificationType, ProjectStatus, QuotationStatus, StaffResponsibility, TaskStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { HttpError } from '@/utils/http-error';
import { recordAudit } from '@/utils/audit';
import { notify } from '@/utils/notify';
import { generateReferenceNumber } from '@/utils/numbering';
import { AuthUser } from '@/middleware/auth';

/** BR-PROJ-01: a Project may only be created from an Approved Quotation. */
export async function createProjectFromQuotation(actor: AuthUser, input: { quotationId: string; projectManagerId: string; startDate?: Date; targetEndDate?: Date }) {
  const quotation = await prisma.quotation.findUnique({ where: { id: input.quotationId } });
  if (!quotation) throw HttpError.notFound('Quotation not found');
  if (quotation.status !== QuotationStatus.APPROVED) {
    throw HttpError.badRequest('A Project can only be created from an Approved Quotation');
  }

  const existing = await prisma.project.findUnique({ where: { quotationId: input.quotationId } });
  if (existing) throw HttpError.conflict('A Project already exists for this Quotation');

  const projectNo = await generateReferenceNumber('PRJ', 'project');

  const project = await prisma.$transaction(async (tx) => {
    const created = await tx.project.create({
      data: {
        projectNo,
        quotationId: input.quotationId,
        customerId: quotation.customerId,
        projectManagerId: input.projectManagerId,
        startDate: input.startDate,
        targetEndDate: input.targetEndDate,
        status: ProjectStatus.PLANNING,
      },
    });
    await tx.serviceRequest.update({ where: { id: quotation.serviceRequestId }, data: { status: 'CONVERTED_TO_PROJECT' } });
    return created;
  });

  await notify({
    userId: input.projectManagerId,
    type: NotificationType.PROJECT_STATUS_CHANGED,
    title: 'New Project assigned to you',
    body: project.projectNo,
    entityType: 'Project',
    entityId: project.id,
  });

  await recordAudit({ actorId: actor.id, action: 'CREATE', entityType: 'Project', entityId: project.id, after: project });
  return project;
}

export async function getProjectById(id: string) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, fullName: true, companyName: true, email: true, phone: true } },
      quotation: { include: { lineItems: true } },
      projectManager: { select: { id: true, fullName: true, email: true } },
      supervisors: { include: { user: { select: { id: true, fullName: true } } } },
      staffAssignments: {
        include: {
          user: { select: { id: true, fullName: true, employeeId: true, role: true, phone: true, department: true } },
          assignedBy: { select: { id: true, fullName: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
      milestones: true,
      documents: true,
      tasks: { include: { assignments: { include: { technician: { select: { id: true, fullName: true } } } } } },
      invoices: true,
    },
  });
  if (!project) throw HttpError.notFound('Project not found');
  return project;
}

export async function listProjects(filters: { status?: ProjectStatus; projectManagerId?: string; customerId?: string; page: number; pageSize: number }) {
  const where = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.projectManagerId ? { projectManagerId: filters.projectManagerId } : {}),
    ...(filters.customerId ? { customerId: filters.customerId } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.project.findMany({
      where,
      include: { customer: true, projectManager: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    prisma.project.count({ where }),
  ]);
  return { items, total, page: filters.page, pageSize: filters.pageSize };
}

export async function updateProject(actor: AuthUser, id: string, input: { projectManagerId?: string; startDate?: Date; targetEndDate?: Date }) {
  const before = await getProjectById(id);
  const project = await prisma.project.update({ where: { id }, data: input });
  await recordAudit({ actorId: actor.id, action: 'UPDATE', entityType: 'Project', entityId: id, before, after: project });
  return project;
}

export async function addSupervisor(actor: AuthUser, id: string, userId: string) {
  await getProjectById(id);
  const supervisor = await prisma.projectSupervisor.create({ data: { projectId: id, userId } });
  await notify({ userId, type: NotificationType.PROJECT_STATUS_CHANGED, title: 'You have been added as Supervisor', body: id, entityType: 'Project', entityId: id });
  await recordAudit({ actorId: actor.id, action: 'ADD_SUPERVISOR', entityType: 'Project', entityId: id, after: supervisor });
  return supervisor;
}

/** Staff Registration: assign one or more staff Users to a Project with a shared responsibility/date range. */
export async function assignStaff(
  actor: AuthUser,
  id: string,
  input: { userIds: string[]; responsibility: StaffResponsibility; startDate?: Date; endDate?: Date; notes?: string },
) {
  await getProjectById(id);

  const uniqueUserIds = Array.from(new Set(input.userIds));
  const users = await prisma.user.findMany({ where: { id: { in: uniqueUserIds } }, select: { id: true, fullName: true, role: true } });
  const missing = uniqueUserIds.filter((userId) => !users.some((u) => u.id === userId));
  if (missing.length > 0) throw HttpError.badRequest('One or more selected staff members were not found', { missing });
  if (users.some((u) => u.role === 'CUSTOMER')) throw HttpError.badRequest('A Customer account cannot be assigned as Project staff');

  const existing = await prisma.projectStaffAssignment.findMany({
    where: { projectId: id, userId: { in: uniqueUserIds } },
    include: { user: { select: { fullName: true } } },
  });
  if (existing.length > 0) {
    throw HttpError.conflict('One or more selected staff members are already assigned to this Project', {
      duplicates: existing.map((e) => ({ userId: e.userId, fullName: e.user.fullName })),
    });
  }

  const created = await prisma.$transaction(
    uniqueUserIds.map((userId) =>
      prisma.projectStaffAssignment.create({
        data: {
          projectId: id,
          userId,
          responsibility: input.responsibility,
          startDate: input.startDate,
          endDate: input.endDate,
          notes: input.notes,
          assignedById: actor.id,
        },
      }),
    ),
  );

  for (const userId of uniqueUserIds) {
    await notify({
      userId,
      type: NotificationType.PROJECT_STATUS_CHANGED,
      title: 'You have been assigned to a Project',
      body: id,
      entityType: 'Project',
      entityId: id,
    });
  }

  await recordAudit({ actorId: actor.id, action: 'ASSIGN_STAFF', entityType: 'Project', entityId: id, after: created });
  return created;
}

export async function updateStaffAssignment(
  actor: AuthUser,
  id: string,
  staffId: string,
  input: { responsibility?: StaffResponsibility; startDate?: Date | null; endDate?: Date | null; notes?: string | null },
) {
  const before = await prisma.projectStaffAssignment.findUnique({ where: { id: staffId } });
  if (!before || before.projectId !== id) throw HttpError.notFound('Staff assignment not found for this Project');

  const updated = await prisma.projectStaffAssignment.update({
    where: { id: staffId },
    data: input,
    include: { user: { select: { id: true, fullName: true, employeeId: true, role: true, phone: true, department: true } } },
  });
  await recordAudit({ actorId: actor.id, action: 'UPDATE_STAFF_ASSIGNMENT', entityType: 'Project', entityId: id, before, after: updated });
  return updated;
}

export async function removeStaffAssignment(actor: AuthUser, id: string, staffId: string) {
  const before = await prisma.projectStaffAssignment.findUnique({ where: { id: staffId } });
  if (!before || before.projectId !== id) throw HttpError.notFound('Staff assignment not found for this Project');

  await prisma.projectStaffAssignment.delete({ where: { id: staffId } });
  await recordAudit({ actorId: actor.id, action: 'REMOVE_STAFF_ASSIGNMENT', entityType: 'Project', entityId: id, before });
}

export async function addMilestone(actor: AuthUser, id: string, input: { name: string; targetDate?: Date }) {
  await getProjectById(id);
  const milestone = await prisma.projectMilestone.create({ data: { projectId: id, ...input } });
  await recordAudit({ actorId: actor.id, action: 'CREATE', entityType: 'ProjectMilestone', entityId: milestone.id, after: milestone });
  return milestone;
}

export async function completeMilestone(actor: AuthUser, milestoneId: string) {
  const milestone = await prisma.projectMilestone.update({ where: { id: milestoneId }, data: { status: 'COMPLETED', completedAt: new Date() } });
  await recordAudit({ actorId: actor.id, action: 'COMPLETE', entityType: 'ProjectMilestone', entityId: milestoneId, after: milestone });
  return milestone;
}

export async function addDocument(actor: AuthUser, id: string, input: { fileUrl: string; fileName: string }) {
  await getProjectById(id);
  return prisma.projectDocument.create({ data: { projectId: id, uploadedById: actor.id, ...input } });
}

/** Recomputes completionPercent from Verified tasks; called after any Task status change. */
export async function recalculateCompletion(projectId: string) {
  const tasks = await prisma.task.findMany({ where: { projectId } });
  if (tasks.length === 0) return;
  const verified = tasks.filter((t) => t.status === TaskStatus.VERIFIED).length;
  const completionPercent = Math.round((verified / tasks.length) * 10000) / 100;
  await prisma.project.update({ where: { id: projectId }, data: { completionPercent } });
}

/** BR-PROJ-03: cannot complete a Project while any Task is not yet Verified. */
export async function completeProject(actor: AuthUser, id: string) {
  const project = await getProjectById(id);
  const incomplete = project.tasks.filter((t) => t.status !== TaskStatus.VERIFIED);
  if (incomplete.length > 0) {
    throw HttpError.badRequest('Project has incomplete Tasks', { incompleteTaskIds: incomplete.map((t) => t.id) });
  }

  const updated = await prisma.project.update({ where: { id }, data: { status: ProjectStatus.COMPLETED, actualEndDate: new Date() } });

  const customer = await prisma.customer.findUnique({ where: { id: project.customerId } });
  if (customer?.userId) {
    await notify({
      userId: customer.userId,
      type: NotificationType.FEEDBACK_REQUEST,
      title: 'Your project is complete — we would love your feedback',
      body: project.projectNo,
      entityType: 'Project',
      entityId: id,
    });
  }

  await recordAudit({ actorId: actor.id, action: 'COMPLETE', entityType: 'Project', entityId: id, before: project, after: updated });
  return updated;
}

/** BR-PROJ-04: cannot close until all Invoices are Paid (or explicitly written off — not modeled at V1, handled via Admin override). */
export async function closeProject(actor: AuthUser, id: string, allowUnpaidOverride = false) {
  const project = await getProjectById(id);
  if (project.status !== ProjectStatus.COMPLETED) {
    throw HttpError.badRequest('Only a Completed Project can be Closed');
  }
  const unpaid = project.invoices.filter((inv) => inv.status !== InvoiceStatus.PAID && inv.status !== InvoiceStatus.CANCELLED);
  if (unpaid.length > 0 && !allowUnpaidOverride) {
    throw HttpError.badRequest('Project has unpaid Invoices', { unpaidInvoiceIds: unpaid.map((i) => i.id) });
  }

  const updated = await prisma.project.update({ where: { id }, data: { status: ProjectStatus.CLOSED } });
  await recordAudit({ actorId: actor.id, action: 'CLOSE', entityType: 'Project', entityId: id, before: project, after: updated });
  return updated;
}

/** BR-PROJ-05: On Hold / Cancelled require a documented reason. */
export async function holdProject(actor: AuthUser, id: string, reason: string) {
  const before = await getProjectById(id);
  const updated = await prisma.project.update({ where: { id }, data: { status: ProjectStatus.ON_HOLD, holdReason: reason } });
  await recordAudit({ actorId: actor.id, action: 'HOLD', entityType: 'Project', entityId: id, before, after: updated });
  return updated;
}

export async function cancelProject(actor: AuthUser, id: string, reason: string) {
  const before = await getProjectById(id);
  const updated = await prisma.project.update({ where: { id }, data: { status: ProjectStatus.CANCELLED, cancelReason: reason } });
  await recordAudit({ actorId: actor.id, action: 'CANCEL', entityType: 'Project', entityId: id, before, after: updated });
  return updated;
}

export async function customerSignOff(id: string) {
  const project = await getProjectById(id);
  if (project.status !== ProjectStatus.COMPLETED) {
    throw HttpError.badRequest('Sign-off can only be recorded once the Project is Completed');
  }
  return prisma.project.update({ where: { id }, data: { customerSignOffAt: new Date() } });
}
