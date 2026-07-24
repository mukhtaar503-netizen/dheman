import { prisma } from '@/lib/prisma';
import { HttpError } from '@/utils/http-error';

export async function listForUser(userId: string, unreadOnly = false) {
  return prisma.notification.findMany({
    where: { userId, ...(unreadOnly ? { isRead: false } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
}

export async function markRead(userId: string, id: string) {
  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification || notification.userId !== userId) throw HttpError.notFound('Notification not found');
  return prisma.notification.update({ where: { id }, data: { isRead: true } });
}

export async function markAllRead(userId: string) {
  const result = await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
  return result.count;
}
