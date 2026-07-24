import { Request, Response } from 'express';
import * as service from './tasks.service';

export async function createTask(req: Request, res: Response) {
  res.status(201).json(await service.createTask(req.user!, req.body));
}

export async function listTasks(req: Request, res: Response) {
  res.status(200).json(await service.listTasks(req.query as any));
}

export async function listMyTasks(req: Request, res: Response) {
  res.status(200).json(await service.listTasks({ technicianId: req.user!.id }));
}

export async function getTask(req: Request, res: Response) {
  res.status(200).json(await service.getTaskById(req.params.id));
}

export async function assignTechnicians(req: Request, res: Response) {
  res.status(200).json(await service.assignTechnicians(req.user!, req.params.id, req.body.technicianIds, req.query.override === 'true'));
}

export async function startTask(req: Request, res: Response) {
  res.status(200).json(await service.startTask(req.user!, req.params.id));
}

export async function completeTask(req: Request, res: Response) {
  res.status(200).json(await service.completeTask(req.user!, req.params.id, req.body.note));
}

export async function verifyTask(req: Request, res: Response) {
  res.status(200).json(await service.verifyTask(req.user!, req.params.id));
}

export async function reopenTask(req: Request, res: Response) {
  res.status(200).json(await service.reopenTask(req.user!, req.params.id, req.body.reason));
}

export async function addPhoto(req: Request, res: Response) {
  res.status(201).json(await service.addPhoto(req.user!, req.params.id, req.body));
}

export async function logTime(req: Request, res: Response) {
  res.status(201).json(await service.logTime(req.user!, req.params.id, req.body));
}
