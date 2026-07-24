import { Request, Response } from 'express';
import * as service from './technicians.service';

export async function listTechnicians(req: Request, res: Response) {
  res.status(200).json(await service.listTechnicians(req.query as any));
}

export async function getTechnician(req: Request, res: Response) {
  res.status(200).json(await service.getTechnicianProfile(req.params.id));
}

export async function updateTechnician(req: Request, res: Response) {
  res.status(200).json(await service.updateTechnicianProfile(req.user!, req.params.id, req.body));
}

export async function getHistory(req: Request, res: Response) {
  res.status(200).json(await service.getTechnicianHistory(req.params.id));
}

export async function getProductivity(req: Request, res: Response) {
  res.status(200).json(await service.getTechnicianProductivity(req.params.id));
}

export async function requestLeave(req: Request, res: Response) {
  res.status(201).json(await service.requestLeave(req.user!, req.body));
}

export async function decideLeave(req: Request, res: Response) {
  res.status(200).json(await service.decideLeave(req.user!, req.params.leaveId, req.body.decision));
}

export async function getSchedule(req: Request, res: Response) {
  res.status(200).json(await service.getSchedule(req.query as any));
}
