import { LeaveStatus, TaskStatus, UserStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { HttpError } from '@/utils/http-error';
import { recordAudit } from '@/utils/audit';
import { AuthUser } from '@/middleware/auth';

/** FR-TECH-03: filter assignable Technicians by skill and current availability. */
export async function listTechnicians(filters: { skill?: string; availableOnly?: boolean }) {
  const now = new Date();
  const onLeaveIds = filters.availableOnly
    ? (
        await prisma.technicianLeave.findMany({
          where: { status: LeaveStatus.APPROVED, startDate: { lte: now }, endDate: { gte: now } },
          select: { technicianId: true },
        })
      ).map((l) => l.technicianId)
    : [];

  const profiles = await prisma.technicianProfile.findMany({
    where: {
      ...(filters.skill ? { skills: { has: filters.skill } } : {}),
      status: UserStatus.ACTIVE,
      ...(filters.availableOnly ? { id: { notIn: onLeaveIds } } : {}),
    },
    include: {
      user: { select: { id: true, fullName: true, email: true, phone: true, status: true } },
      _count: { select: { leaves: true } },
    },
  });

  // FR-TECH-02: current workload = count of active (not yet Verified) Task assignments.
  const workloads = await prisma.taskAssignment.groupBy({
    by: ['technicianId'],
    _count: { _all: true },
    where: { task: { status: { notIn: [TaskStatus.VERIFIED] } } },
  });
  const workloadMap = new Map(workloads.map((w) => [w.technicianId, w._count._all]));

  return profiles.map((p) => ({ ...p, currentWorkload: workloadMap.get(p.userId) ?? 0 }));
}

export async function getTechnicianProfile(userId: string) {
  const profile = await prisma.technicianProfile.findUnique({
    where: { userId },
    include: { user: { select: { id: true, fullName: true, email: true, phone: true, status: true } }, leaves: true },
  });
  if (!profile) throw HttpError.notFound('Technician profile not found');
  return profile;
}

export async function updateTechnicianProfile(actor: AuthUser, userId: string, input: { skills?: string[]; employmentType?: string }) {
  const before = await getTechnicianProfile(userId);
  const profile = await prisma.technicianProfile.update({ where: { userId }, data: input });
  await recordAudit({ actorId: actor.id, action: 'UPDATE', entityType: 'TechnicianProfile', entityId: profile.id, before, after: profile });
  return profile;
}

/** FR-TECH-04: full Task/Project history for performance review. */
export async function getTechnicianHistory(userId: string) {
  return prisma.taskAssignment.findMany({
    where: { technicianId: userId },
    include: { task: { include: { project: { select: { id: true, projectNo: true } } } } },
    orderBy: { assignedAt: 'desc' },
  });
}

/** FR-TECH-06: on-time completion rate as a simple productivity proxy. */
export async function getTechnicianProductivity(userId: string) {
  const assignments = await prisma.taskAssignment.findMany({ where: { technicianId: userId }, include: { task: true } });
  const total = assignments.length;
  const completed = assignments.filter((a) => a.task.status === TaskStatus.VERIFIED).length;
  const onTime = assignments.filter((a) => a.task.status === TaskStatus.VERIFIED && a.task.dueDate && a.task.updatedAt <= a.task.dueDate).length;
  return {
    totalTasks: total,
    completedTasks: completed,
    onTimeRate: completed > 0 ? Math.round((onTime / completed) * 10000) / 100 : null,
  };
}

export async function requestLeave(actor: AuthUser, input: { startDate: Date; endDate: Date; reason?: string }) {
  const profile = await getTechnicianProfile(actor.id);
  const leave = await prisma.technicianLeave.create({ data: { technicianId: profile.id, ...input } });
  await recordAudit({ actorId: actor.id, action: 'REQUEST_LEAVE', entityType: 'TechnicianLeave', entityId: leave.id, after: leave });
  return leave;
}

export async function decideLeave(actor: AuthUser, leaveId: string, decision: 'APPROVED' | 'REJECTED') {
  const leave = await prisma.technicianLeave.findUnique({ where: { id: leaveId } });
  if (!leave) throw HttpError.notFound('Leave request not found');

  const status = decision === 'APPROVED' ? LeaveStatus.APPROVED : LeaveStatus.REJECTED;
  const updated = await prisma.technicianLeave.update({ where: { id: leaveId }, data: { status } });

  if (decision === 'APPROVED') {
    await prisma.technicianProfile.update({ where: { id: leave.technicianId }, data: { status: UserStatus.ON_LEAVE } });
  }

  await recordAudit({ actorId: actor.id, action: decision, entityType: 'TechnicianLeave', entityId: leaveId, before: leave, after: updated });
  return updated;
}

/** FR-SCHED-01: unified calendar of Site Inspections + Task assignments across Technicians. */
export async function getSchedule(filters: { from: Date; to: Date; technicianId?: string }) {
  const [inspections, tasks] = await Promise.all([
    prisma.siteInspection.findMany({
      where: {
        scheduledAt: { gte: filters.from, lte: filters.to },
        ...(filters.technicianId ? { inspectorId: filters.technicianId } : {}),
      },
      include: { serviceRequest: { include: { customer: true } }, inspector: { select: { id: true, fullName: true } } },
    }),
    prisma.task.findMany({
      where: {
        dueDate: { gte: filters.from, lte: filters.to },
        ...(filters.technicianId ? { assignments: { some: { technicianId: filters.technicianId } } } : {}),
      },
      include: { assignments: { include: { technician: { select: { id: true, fullName: true } } } }, project: { select: { projectNo: true } } },
    }),
  ]);

  return {
    inspections: inspections.map((i) => ({ type: 'INSPECTION' as const, at: i.scheduledAt, ...i })),
    tasks: tasks.map((t) => ({ type: 'TASK' as const, at: t.dueDate, ...t })),
  };
}
