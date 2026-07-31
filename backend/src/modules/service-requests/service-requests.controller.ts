import { Request, Response } from 'express';
import * as serviceRequestsService from './service-requests.service';
import * as customersService from '@/modules/customers/customers.service';
import { HttpError } from '@/utils/http-error';

export async function createServiceRequest(req: Request, res: Response) {
  res.status(201).json(await serviceRequestsService.createServiceRequest(req.user, req.body));
}

/** FR-SR-01: Customers submit requests against their own profile. */
export async function createOwnServiceRequest(req: Request, res: Response) {
  const customer = await customersService.getCustomerByUserId(req.user!.id);
  res.status(201).json(await serviceRequestsService.createServiceRequest(req.user, { ...req.body, customerId: customer.id }));
}

export async function listServiceRequests(req: Request, res: Response) {
  res.status(200).json(await serviceRequestsService.listServiceRequests(req.query as any));
}

/** FR-SR-08: Customers view only their own requests. */
export async function listOwnServiceRequests(req: Request, res: Response) {
  const customer = await customersService.getCustomerByUserId(req.user!.id);
  res.status(200).json(await serviceRequestsService.listServiceRequests({ ...(req.query as any), customerId: customer.id }));
}

export async function getServiceRequest(req: Request, res: Response) {
  res.status(200).json(await serviceRequestsService.getServiceRequestById(req.params.id));
}

export async function updateServiceRequest(req: Request, res: Response) {
  res.status(200).json(await serviceRequestsService.updateServiceRequest(req.user!, req.params.id, req.body));
}

export async function updateServiceRequestStatus(req: Request, res: Response) {
  res.status(200).json(await serviceRequestsService.updateServiceRequestStatus(req.user!, req.params.id, req.body.status));
}

export async function deleteServiceRequest(req: Request, res: Response) {
  await serviceRequestsService.deleteServiceRequest(req.user!, req.params.id);
  res.status(204).send();
}

export async function requestAttachmentUploadUrl(req: Request, res: Response) {
  res.status(200).json(await serviceRequestsService.requestAttachmentUploadUrl(req.params.id, req.body.fileName));
}

export async function addAttachment(req: Request, res: Response) {
  res.status(201).json(await serviceRequestsService.addAttachment(req.user, req.params.id, req.body));
}

/** Customer self-service: mint an upload URL for their own request's attachment. */
export async function requestOwnAttachmentUploadUrl(req: Request, res: Response) {
  const customer = await customersService.getCustomerByUserId(req.user!.id);
  const request = await serviceRequestsService.getServiceRequestById(req.params.id);
  if (request.customerId !== customer.id) throw HttpError.forbidden();
  res.status(200).json(await serviceRequestsService.requestAttachmentUploadUrl(req.params.id, req.body.fileName));
}

/** Customer self-service: record an attachment on their own request. */
export async function addOwnAttachment(req: Request, res: Response) {
  const customer = await customersService.getCustomerByUserId(req.user!.id);
  const request = await serviceRequestsService.getServiceRequestById(req.params.id);
  if (request.customerId !== customer.id) throw HttpError.forbidden();
  res.status(201).json(await serviceRequestsService.addAttachment(req.user, req.params.id, req.body));
}

export async function getStatistics(_req: Request, res: Response) {
  res.status(200).json(await serviceRequestsService.getServiceRequestStatistics());
}
