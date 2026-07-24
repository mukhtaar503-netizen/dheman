import { Request, Response } from 'express';
import * as service from './quotations.service';
import * as customersService from '@/modules/customers/customers.service';

export async function createQuotation(req: Request, res: Response) {
  const { quotation, requiresDiscountApproval } = await service.createQuotation(req.user!, req.body);
  res.status(201).json({ ...quotation, requiresDiscountApproval });
}

export async function reviseQuotation(req: Request, res: Response) {
  res.status(201).json(await service.reviseQuotation(req.user!, req.params.id, req.body));
}

export async function listQuotations(req: Request, res: Response) {
  res.status(200).json(await service.listQuotations(req.query as any));
}

export async function listOwnQuotations(req: Request, res: Response) {
  const customer = await customersService.getCustomerByUserId(req.user!.id);
  res.status(200).json(await service.listQuotations({ ...(req.query as any), customerId: customer.id }));
}

export async function getQuotation(req: Request, res: Response) {
  res.status(200).json(await service.getQuotationById(req.params.id));
}

export async function approveDiscount(req: Request, res: Response) {
  res.status(200).json(await service.approveDiscount(req.user!, req.params.id));
}

export async function sendQuotation(req: Request, res: Response) {
  res.status(200).json(await service.sendQuotation(req.user!, req.params.id));
}

export async function respondToQuotation(req: Request, res: Response) {
  res.status(200).json(await service.respondToQuotation(req.user!, req.params.id, req.body.decision, req.body.comment));
}
