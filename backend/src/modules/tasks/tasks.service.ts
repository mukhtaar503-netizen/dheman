import { NotificationType, PhotoType, TaskStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { HttpError } from '@/utils/http-error';
import { recordAudit } from '@/utils/audit';
import { notify } from '@/utils/notify';
import { recalculateCompletion } from '@/modules/projects/projects.service';
import { AuthUser } from '@/middleware/auth';

export async function createTask(
  actor: AuthUser,
  input: { projectId: string; title: string; description?: string; priority?: any; dueDate?: Date; dependsOnTaskId?: string },
) {
  const task = await prisma.task.create({ data: { ...input, createdById: actor.id } });
  await recordAudit({ actorId: actor.id, action: 'CREATE', entityType: 'Task', entityId: task.id, after: task });
  await recalculateCompletion(input.projectId);
  return task;
}

export async function getTaskById(id: string) {
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      project: { select: { id: true, projectNo: true, customerId: true } },
      assignments: { include: { technician: { select: { id: true, fullName: true } } } },
      photos: true,
      timeLogs: true,
      dependsOn: { select: { id: true, title: true, status: true } },
    },
  });
  if (!task) throw HttpError.notFound('Task not found');
  return task;
}

export async function listTasks(filters: { projectId?: string; technicianId?: string; status?: TaskStatus }) {
  return prisma.task.findMany({
    where: {
      ...(filters.projectId ? { projectId: filters.projectId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.technicianId ? { assignments: { some: { technicianId: filters.technicianId } } } : {}),
    },
    include: { assignments: { include: { technician: { select: { id: true, fullName: true } } } }, project: { select: { projectNo: true } } },
    orderBy: { dueDate: 'asc' },
    take: 200, // defensive bound — this endpoint has no pagination UI; a call with no filters at all should not return the whole table
  });
}

/** FR-TASK-03, FR-SCHED-02: block double-booking any Technician on overlapping windows unless overridden — one batched query for the whole list, not one per technician. */
async function assertNoSchedulingConflict(technicianIds: string[], dueDate: Date | null, override: boolean) {
  if (!dueDate || override || technicianIds.length === 0) return;
  const conflict = await prisma.task.findFirst({
    where: {
      dueDate,
      assignments: { some: { technicianId: { in: technicianIds } } },
      status: { notIn: [TaskStatus.COMPLETED, TaskStatus.VERIFIED] },
    },
  });
  if (conflict) {
    throw HttpError.conflict('Technician already has a Task scheduled for this date; pass override=true to force it', {
      conflictingTaskId: conflict.id,
    });
  }
}

export async function assignTechnicians(actor: AuthUser, id: string, technicianIds: string[], override = false) {
  const task = await getTaskById(id);

  await assertNoSchedulingConflict(technicianIds, task.dueDate, override);

  const assignments = await prisma.$transaction(async (tx) => {
    await tx.taskAssignment.deleteMany({ where: { taskId: id } });
    await tx.taskAssignment.createMany({ data: technicianIds.map((technicianId) => ({ taskId: id, technicianId })) });
    return tx.task.update({ where: { id }, data: { status: TaskStatus.ASSIGNED } });
  });

  await Promise.all(
    technicianIds.map((technicianId) =>
      notify({ userId: technicianId, type: NotificationType.TASK_ASSIGNED, title: 'New Task assigned to you', body: task.title, entityType: 'Task', entityId: id }),
    ),
  );

  await recordAudit({ actorId: actor.id, action: 'ASSIGN', entityType: 'Task', entityId: id, before: task, after: assignments });
  return getTaskById(id);
}

export async function startTask(actor: AuthUser, id: string) {
  const task = await getTaskById(id);
  if (task.dependsOn && task.dependsOn.status !== TaskStatus.VERIFIED) {
    throw HttpError.badRequest('This Task depends on another Task that has not yet been completed and verified');
  }
  const updated = await prisma.task.update({ where: { id }, data: { status: TaskStatus.IN_PROGRESS } });
  await recordAudit({ actorId: actor.id, action: 'START', entityType: 'Task', entityId: id, before: task, after: updated });
  return updated;
}

/** FR-TASK-04/05: Technician marks work Completed; requires at least one photo as evidence. */
export async function completeTask(actor: AuthUser, id: string, note?: string) {
  const task = await getTaskById(id);
  if (task.photos.length === 0) {
    throw HttpError.badRequest('At least one progress/after photo is required before marking a Task Completed');
  }
  const updated = await prisma.task.update({ where: { id }, data: { status: TaskStatus.COMPLETED } });
  await recalculateCompletion(task.projectId);
  await recordAudit({ actorId: actor.id, action: 'COMPLETE', entityType: 'Task', entityId: id, before: task, after: { ...updated, note } });
  return updated;
}

/** FR-TASK-06: Supervisor verification is required before a Task counts toward Project completion. */
export async function verifyTask(actor: AuthUser, id: string) {
  const task = await getTaskById(id);
  if (task.status !== TaskStatus.COMPLETED) {
    throw HttpError.badRequest('Only a Completed Task can be Verified');
  }
  const updated = await prisma.task.update({ where: { id }, data: { status: TaskStatus.VERIFIED } });
  await recalculateCompletion(task.projectId);
  await recordAudit({ actorId: actor.id, action: 'VERIFY', entityType: 'Task', entityId: id, before: task, after: updated });
  return updated;
}

/** FR-TASK-09: reopening requires a mandatory reason. */
export async function reopenTask(actor: AuthUser, id: string, reason: string) {
  const task = await getTaskById(id);
  if (task.status !== TaskStatus.COMPLETED && task.status !== TaskStatus.VERIFIED) {
    throw HttpError.badRequest('Only a Completed or Verified Task can be reopened');
  }
  const updated = await prisma.task.update({ where: { id }, data: { status: TaskStatus.REOPENED, reopenReason: reason } });
  await recalculateCompletion(task.projectId);
  await recordAudit({ actorId: actor.id, action: 'REOPEN', entityType: 'Task', entityId: id, before: task, after: updated });
  return updated;
}

export async function addPhoto(actor: AuthUser, id: string, input: { fileUrl: string; caption?: string; type?: PhotoType }) {
  await getTaskById(id);
  return prisma.taskPhoto.create({ data: { taskId: id, uploadedById: actor.id, ...input } });
}

export async function logTime(actor: AuthUser, id: string, input: { startedAt: Date; endedAt?: Date; note?: string }) {
  await getTaskById(id);
  const minutes = input.endedAt ? Math.round((input.endedAt.getTime() - input.startedAt.getTime()) / 60000) : undefined;
  return prisma.taskTimeLog.create({ data: { taskId: id, technicianId: actor.id, ...input, minutes } });
}
