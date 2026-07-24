import { Request, Response } from 'express';
import * as service from './materials.service';

export async function createEntry(req: Request, res: Response) {
  res.status(201).json(await service.createMaterialEntry(req.user!, req.body));
}

export async function getForProject(req: Request, res: Response) {
  res.status(200).json(await service.getMaterialsForProject(req.params.projectId));
}
