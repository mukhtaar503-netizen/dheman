import { Request, Response } from 'express';
import * as service from './notifications.service';

export async function list(req: Request, res: Response) {
  res.status(200).json(await service.listForUser(req.user!.id, req.query.unreadOnly === 'true'));
}

export async function markRead(req: Request, res: Response) {
  res.status(200).json(await service.markRead(req.user!.id, req.params.id));
}

export async function markAllRead(req: Request, res: Response) {
  res.status(200).json({ updated: await service.markAllRead(req.user!.id) });
}
