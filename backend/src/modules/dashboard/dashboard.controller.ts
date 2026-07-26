import { Request, Response } from 'express';
import * as service from './dashboard.service';
import * as customersService from '@/modules/customers/customers.service';
import * as paymentsService from '@/modules/payments/payments.service';

export async function summary(req: Request, res: Response) {
  res.status(200).json(await service.getSummary(req.user!, req.query as any));
}

export async function upcoming(req: Request, res: Response) {
  res.status(200).json(await service.getUpcomingSummary(req.user!));
}

export async function revenue(req: Request, res: Response) {
  res.status(200).json(await service.getRevenueSeries(req.query as any, (req.query.granularity as any) ?? 'day'));
}

export async function projects(req: Request, res: Response) {
  res.status(200).json(await service.getProjectStats(req.user!, req.query as any));
}

export async function expenses(req: Request, res: Response) {
  res.status(200).json(await service.getExpenseSeries(req.query as any, (req.query.granularity as any) ?? 'day'));
}

export async function services(_req: Request, res: Response) {
  res.status(200).json(await service.getServiceDistribution());
}

export async function activity(req: Request, res: Response) {
  const { page, pageSize } = req.query as any;
  res.status(200).json(await service.getActivityFeed(page, pageSize));
}

export async function customers(req: Request, res: Response) {
  const { page, pageSize, search } = req.query as any;
  res.status(200).json(await customersService.listCustomers({ page, pageSize, search, sort: 'newest' }));
}

export async function payments(req: Request, res: Response) {
  res.status(200).json(await paymentsService.listPaymentsPaged(req.query as any));
}

export async function loginActivity(req: Request, res: Response) {
  const { page, pageSize } = req.query as any;
  res.status(200).json(await service.getLoginActivity(page, pageSize));
}
