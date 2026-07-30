import { Request, Response } from 'express';
import * as servicesService from './services.service';

export async function createService(req: Request, res: Response) {
  res.status(201).json(await servicesService.createService(req.user, req.body));
}

export async function listServices(req: Request, res: Response) {
  res.status(200).json(await servicesService.listServices(req.query as never));
}

export async function getService(req: Request, res: Response) {
  res.status(200).json(await servicesService.getServiceById(req.params.id));
}

export async function updateService(req: Request, res: Response) {
  res.status(200).json(await servicesService.updateService(req.user, req.params.id, req.body));
}

export async function deleteService(req: Request, res: Response) {
  await servicesService.deleteService(req.user!, req.params.id);
  res.status(204).send();
}

export async function activateService(req: Request, res: Response) {
  res.status(200).json(await servicesService.setServiceStatus(req.user!, req.params.id, 'ACTIVE'));
}

export async function deactivateService(req: Request, res: Response) {
  res.status(200).json(await servicesService.setServiceStatus(req.user!, req.params.id, 'INACTIVE'));
}

export async function getStatistics(_req: Request, res: Response) {
  res.status(200).json(await servicesService.getServiceStatistics());
}
