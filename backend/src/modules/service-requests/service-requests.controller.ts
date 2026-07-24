import { Request, Response } from 'express';
import * as serviceRequestsService from './service-requests.service';
import * as customersService from '@/modules/customers/customers.service';

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
