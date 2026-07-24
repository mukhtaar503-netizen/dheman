import { Request, Response } from 'express';
import * as service from './payments.service';
import * as customersService from '@/modules/customers/customers.service';

export async function recordPayment(req: Request, res: Response) {
  res.status(201).json(await service.recordPayment(req.user!, req.body));
}

export async function listPayments(req: Request, res: Response) {
  res.status(200).json(await service.listPayments(req.query as any));
}

export async function listOwnPayments(req: Request, res: Response) {
  const customer = await customersService.getCustomerByUserId(req.user!.id);
  res.status(200).json(await service.listPayments({ customerId: customer.id }));
}

export async function getPayment(req: Request, res: Response) {
  res.status(200).json(await service.getPaymentById(req.params.id));
}

export async function reversePayment(req: Request, res: Response) {
  res.status(200).json(await service.reversePayment(req.user!, req.params.id, req.body.reason));
}
