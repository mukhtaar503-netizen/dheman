import { Request, Response } from 'express';
import * as service from './inspections.service';

export async function scheduleInspection(req: Request, res: Response) {
  res.status(201).json(await service.scheduleInspection(req.user!, req.body));
}

export async function listInspections(req: Request, res: Response) {
  res.status(200).json(await service.listInspections(req.query as any));
}

export async function listMyInspections(req: Request, res: Response) {
  res.status(200).json(await service.listInspections({ inspectorId: req.user!.id }));
}

export async function getInspection(req: Request, res: Response) {
  res.status(200).json(await service.getInspectionById(req.params.id));
}

export async function reschedule(req: Request, res: Response) {
  res.status(200).json(await service.reschedule(req.user!, req.params.id, req.body));
}

export async function submitInspection(req: Request, res: Response) {
  res.status(200).json(await service.submitInspection(req.user!, req.params.id, req.body));
}
