import { Request, Response } from 'express';
import * as customersService from './customers.service';

export async function createCustomer(req: Request, res: Response) {
  const allowDuplicate = req.query.allowDuplicate === 'true';
  const customer = await customersService.createCustomer(req.user, req.body, allowDuplicate);
  res.status(201).json(customer);
}

export async function listCustomers(req: Request, res: Response) {
  res.status(200).json(await customersService.listCustomers(req.query as any));
}

export async function getCustomer(req: Request, res: Response) {
  res.status(200).json(await customersService.getCustomerById(req.params.id));
}

export async function updateCustomer(req: Request, res: Response) {
  res.status(200).json(await customersService.updateCustomer(req.user, req.params.id, req.body));
}

export async function deactivateCustomer(req: Request, res: Response) {
  res.status(200).json(await customersService.deactivateCustomer(req.user!, req.params.id));
}

export async function addSiteAddress(req: Request, res: Response) {
  res.status(201).json(await customersService.addSiteAddress(req.params.id, req.body));
}

export async function addNote(req: Request, res: Response) {
  res.status(201).json(await customersService.addNote(req.user, req.params.id, req.body.note));
}
