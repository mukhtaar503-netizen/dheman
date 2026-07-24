import { Request, Response } from 'express';
import * as service from './invoices.service';
import * as customersService from '@/modules/customers/customers.service';

export async function createInvoice(req: Request, res: Response) {
  res.status(201).json(await service.createInvoice(req.user!, req.body));
}

export async function listInvoices(req: Request, res: Response) {
  res.status(200).json(await service.listInvoices(req.query as any));
}

export async function listOwnInvoices(req: Request, res: Response) {
  const customer = await customersService.getCustomerByUserId(req.user!.id);
  res.status(200).json(await service.listInvoices({ ...(req.query as any), customerId: customer.id }));
}

export async function getInvoice(req: Request, res: Response) {
  res.status(200).json(await service.getInvoiceById(req.params.id));
}

export async function sendInvoice(req: Request, res: Response) {
  res.status(200).json(await service.sendInvoice(req.user!, req.params.id));
}

export async function voidInvoice(req: Request, res: Response) {
  res.status(200).json(await service.voidInvoice(req.user!, req.params.id, req.body.reason));
}
