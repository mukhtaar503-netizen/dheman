import { Request, Response } from 'express';
import * as service from './expenses.service';

export async function createExpense(req: Request, res: Response) {
  res.status(201).json(await service.createExpense(req.user!, req.body));
}

export async function listExpenses(req: Request, res: Response) {
  res.status(200).json(await service.listExpenses(req.query as any));
}

export async function getExpense(req: Request, res: Response) {
  res.status(200).json(await service.getExpenseById(req.params.id));
}

export async function decideExpense(req: Request, res: Response) {
  res.status(200).json(await service.decideExpense(req.user!, req.params.id, req.body.decision, req.body.rejectionReason));
}
