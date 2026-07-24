import { Request, Response } from 'express';
import { toCsv } from '@/utils/csv';
import * as service from './reports.service';

function respond(req: Request, res: Response, rows: Record<string, unknown>[]) {
  if (req.query.format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="report.csv"');
    return res.status(200).send(toCsv(rows));
  }
  res.status(200).json(rows);
}

export async function revenue(req: Request, res: Response) {
  const from = req.query.from ? new Date(String(req.query.from)) : new Date(new Date().getFullYear(), 0, 1);
  const to = req.query.to ? new Date(String(req.query.to)) : new Date();
  const granularity = req.query.granularity === 'day' ? 'day' : 'month';
  respond(req, res, await service.getRevenueReport(from, to, granularity));
}

export async function profitability(req: Request, res: Response) {
  respond(req, res, await service.getProjectProfitabilityReport({ projectId: req.query.projectId as string | undefined }));
}

export async function technicianProductivity(req: Request, res: Response) {
  respond(req, res, await service.getTechnicianProductivityReport());
}

export async function receivables(req: Request, res: Response) {
  respond(req, res, await service.getOutstandingReceivablesReport());
}

export async function quotationConversion(req: Request, res: Response) {
  res.status(200).json(await service.getQuotationConversionReport());
}

export async function customerSatisfaction(req: Request, res: Response) {
  res.status(200).json(await service.getCustomerSatisfactionReport());
}

export async function dashboard(req: Request, res: Response) {
  res.status(200).json(await service.getDashboardSummary(req.user!.id, req.user!.role));
}
