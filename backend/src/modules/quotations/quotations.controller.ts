import { Request, Response } from 'express';
import * as service from './quotations.service';
import * as customersService from '@/modules/customers/customers.service';
import { HttpError } from '@/utils/http-error';

export async function createQuotation(req: Request, res: Response) {
  const { quotation, requiresDiscountApproval } = await service.createQuotation(req.user!, req.body);
  res.status(201).json({ ...quotation, requiresDiscountApproval });
}

export async function reviseQuotation(req: Request, res: Response) {
  res.status(201).json(await service.reviseQuotation(req.user!, req.params.id, req.body));
}

export async function getPrefill(req: Request, res: Response) {
  res.status(200).json(await service.getQuotationPrefill(req.params.siteInspectionId));
}

export async function listQuotations(req: Request, res: Response) {
  res.status(200).json(await service.listQuotations(req.query as any));
}

export async function listOwnQuotations(req: Request, res: Response) {
  const customer = await customersService.getCustomerByUserId(req.user!.id);
  res.status(200).json(await service.listQuotations({ ...(req.query as any), customerId: customer.id }));
}

export async function listInspectorQuotations(req: Request, res: Response) {
  res.status(200).json(await service.listQuotationsForInspector(req.user!.id));
}

export async function getQuotation(req: Request, res: Response) {
  res.status(200).json(await service.getQuotationById(req.params.id));
}

export async function updateQuotation(req: Request, res: Response) {
  res.status(200).json(await service.updateQuotation(req.user!, req.params.id, req.body));
}

export async function updateQuotationStatus(req: Request, res: Response) {
  res.status(200).json(await service.updateQuotationStatus(req.user!, req.params.id, req.body.status));
}

export async function deleteQuotation(req: Request, res: Response) {
  await service.deleteQuotation(req.user!, req.params.id);
  res.status(204).send();
}

export async function approveDiscount(req: Request, res: Response) {
  res.status(200).json(await service.approveDiscount(req.user!, req.params.id));
}

export async function sendQuotation(req: Request, res: Response) {
  res.status(200).json(await service.sendQuotation(req.user!, req.params.id));
}

export async function respondToQuotation(req: Request, res: Response) {
  const customer = await customersService.getCustomerByUserId(req.user!.id);
  const quotation = await service.getQuotationById(req.params.id);
  if (quotation.customerId !== customer.id) throw HttpError.forbidden();
  res.status(200).json(await service.respondToQuotation(req.user!, req.params.id, req.body.decision, req.body.comments));
}

async function streamPdf(res: Response, quotationId: string) {
  const { quotation, pdf } = await service.getQuotationPdfBuffer(quotationId);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${quotation.quotationNo}.pdf"`);
  res.send(pdf);
}

export async function downloadPdf(req: Request, res: Response) {
  await streamPdf(res, req.params.id);
}

/** Customer self-service: download the PDF for their own Quotation only. */
export async function downloadOwnPdf(req: Request, res: Response) {
  const customer = await customersService.getCustomerByUserId(req.user!.id);
  const quotation = await service.getQuotationById(req.params.id);
  if (quotation.customerId !== customer.id) throw HttpError.forbidden();
  await streamPdf(res, req.params.id);
}

export async function emailQuotation(req: Request, res: Response) {
  res.status(200).json(await service.emailQuotation(req.user!, req.params.id));
}

export async function getStatistics(_req: Request, res: Response) {
  res.status(200).json(await service.getQuotationStatistics());
}
