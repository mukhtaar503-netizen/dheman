import { Request, Response } from 'express';
import * as service from './rbac.service';

export async function listRoles(_req: Request, res: Response) {
  res.status(200).json(await service.listRoles());
}

export async function listPermissions(_req: Request, res: Response) {
  res.status(200).json(await service.listPermissions());
}

export async function createRole(req: Request, res: Response) {
  res.status(201).json(await service.createRole(req.user!, req.body));
}

export async function setRolePermissions(req: Request, res: Response) {
  res.status(200).json(await service.setRolePermissions(req.user!, req.params.id, req.body.permissionKeys));
}

export async function getUserRoles(req: Request, res: Response) {
  res.status(200).json(await service.getUserRoles(req.params.id));
}

export async function assignRoleToUser(req: Request, res: Response) {
  res.status(201).json(await service.assignRoleToUser(req.user!, req.params.id, req.body.roleId));
}

export async function removeRoleFromUser(req: Request, res: Response) {
  await service.removeRoleFromUser(req.user!, req.params.id, req.params.roleId);
  res.status(204).send();
}
