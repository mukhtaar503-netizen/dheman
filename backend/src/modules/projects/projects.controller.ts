import { Request, Response } from 'express';
import * as service from './projects.service';
import * as customersService from '@/modules/customers/customers.service';

export async function createProject(req: Request, res: Response) {
  res.status(201).json(await service.createProjectFromQuotation(req.user!, req.body));
}

export async function listProjects(req: Request, res: Response) {
  res.status(200).json(await service.listProjects(req.query as any));
}

export async function listOwnProjects(req: Request, res: Response) {
  const customer = await customersService.getCustomerByUserId(req.user!.id);
  res.status(200).json(await service.listProjects({ ...(req.query as any), customerId: customer.id }));
}

export async function getProject(req: Request, res: Response) {
  res.status(200).json(await service.getProjectById(req.params.id));
}

export async function updateProject(req: Request, res: Response) {
  res.status(200).json(await service.updateProject(req.user!, req.params.id, req.body));
}

export async function addSupervisor(req: Request, res: Response) {
  res.status(201).json(await service.addSupervisor(req.user!, req.params.id, req.body.userId));
}

export async function assignStaff(req: Request, res: Response) {
  res.status(201).json(await service.assignStaff(req.user!, req.params.id, req.body));
}

export async function updateStaffAssignment(req: Request, res: Response) {
  res.status(200).json(await service.updateStaffAssignment(req.user!, req.params.id, req.params.staffId, req.body));
}

export async function removeStaffAssignment(req: Request, res: Response) {
  await service.removeStaffAssignment(req.user!, req.params.id, req.params.staffId);
  res.status(204).send();
}

export async function addMilestone(req: Request, res: Response) {
  res.status(201).json(await service.addMilestone(req.user!, req.params.id, req.body));
}

export async function completeMilestone(req: Request, res: Response) {
  res.status(200).json(await service.completeMilestone(req.user!, req.params.milestoneId));
}

export async function addDocument(req: Request, res: Response) {
  res.status(201).json(await service.addDocument(req.user!, req.params.id, req.body));
}

export async function completeProject(req: Request, res: Response) {
  res.status(200).json(await service.completeProject(req.user!, req.params.id));
}

export async function closeProject(req: Request, res: Response) {
  res.status(200).json(await service.closeProject(req.user!, req.params.id, req.query.allowUnpaidOverride === 'true'));
}

export async function holdProject(req: Request, res: Response) {
  res.status(200).json(await service.holdProject(req.user!, req.params.id, req.body.reason));
}

export async function cancelProject(req: Request, res: Response) {
  res.status(200).json(await service.cancelProject(req.user!, req.params.id, req.body.reason));
}

export async function customerSignOff(req: Request, res: Response) {
  res.status(200).json(await service.customerSignOff(req.params.id));
}
