import { NotificationType } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/**
 * Creates an in-app notification (FR-NOTIF-01). Email/SMS/WhatsApp dispatch is
 * intentionally not wired here — the Notifications module (Phase 5) adds a
 * provider-agnostic dispatcher per FR-NOTIF-05 without changing this call site.
 */
export async function notify(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
}) {
  return prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      entityType: params.entityType,
      entityId: params.entityId,
    },
  });
}
