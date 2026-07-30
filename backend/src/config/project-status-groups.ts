import { ProjectStatus } from '@prisma/client';

export const ACTIVE_PROJECT_STATUSES: ProjectStatus[] = [
  ProjectStatus.PLANNING,
  ProjectStatus.SCHEDULED,
  ProjectStatus.IN_PROGRESS,
  ProjectStatus.ON_HOLD,
];
export const COMPLETED_PROJECT_STATUSES: ProjectStatus[] = [ProjectStatus.COMPLETED, ProjectStatus.CLOSED];
export const CANCELLED_PROJECT_STATUSES: ProjectStatus[] = [ProjectStatus.CANCELLED];
