import { Request, Response } from 'express';
import * as usersService from './users.service';

export async function createUser(req: Request, res: Response) {
  const user = await usersService.createUser(req.user!, req.body);
  res.status(201).json(user);
}

export async function listUsers(req: Request, res: Response) {
  const result = await usersService.listUsers(req.query as any);
  res.status(200).json(result);
}

export async function getUser(req: Request, res: Response) {
  const user = await usersService.getUserById(req.params.id);
  res.status(200).json(user);
}

export async function updateUser(req: Request, res: Response) {
  const user = await usersService.updateUser(req.user!, req.params.id, req.body);
  res.status(200).json(user);
}
