import { Request, Response } from 'express';
import * as customersService from './customers.service';

export async function createCustomer(req: Request, res: Response) {
  const allowDuplicate = (req.query as { allowDuplicate?: boolean }).allowDuplicate === true;
  const customer = await customersService.createCustomer(req.user, req.body, allowDuplicate);
  res.status(201).json(customer);
}

export async function listCustomers(req: Request, res: Response) {
  res.status(200).json(await customersService.listCustomers(req.query as never));
}

export async function getCustomer(req: Request, res: Response) {
  const includeDeleted = req.query.includeDeleted === 'true';
  res.status(200).json(await customersService.getCustomerById(req.params.id, { includeDeleted }));
}

export async function updateCustomer(req: Request, res: Response) {
  res.status(200).json(await customersService.updateCustomer(req.user, req.params.id, req.body));
}

export async function deactivateCustomer(req: Request, res: Response) {
  res.status(200).json(await customersService.deactivateCustomer(req.user!, req.params.id));
}

export async function softDeleteCustomer(req: Request, res: Response) {
  res.status(200).json(await customersService.softDeleteCustomer(req.user!, req.params.id));
}

export async function restoreCustomer(req: Request, res: Response) {
  res.status(200).json(await customersService.restoreCustomer(req.user!, req.params.id));
}

export async function bulkSoftDelete(req: Request, res: Response) {
  res.status(200).json(await customersService.bulkSoftDelete(req.user!, req.body.ids));
}

export async function bulkRestore(req: Request, res: Response) {
  res.status(200).json(await customersService.bulkRestore(req.user!, req.body.ids));
}

export async function bulkUpdateStatus(req: Request, res: Response) {
  res.status(200).json(await customersService.bulkUpdateStatus(req.user!, req.body.ids, req.body.status));
}

export async function exportCustomers(req: Request, res: Response) {
  const csv = await customersService.exportCustomersCsv(req.query as never);
  res.status(200).header('Content-Type', 'text/csv').header('Content-Disposition', 'attachment; filename="customers.csv"').send(csv);
}

export async function getStatistics(_req: Request, res: Response) {
  res.status(200).json(await customersService.getCustomerStatistics());
}

export async function addSiteAddress(req: Request, res: Response) {
  res.status(201).json(await customersService.addSiteAddress(req.user, req.params.id, req.body));
}

export async function updateSiteAddress(req: Request, res: Response) {
  res.status(200).json(await customersService.updateSiteAddress(req.user, req.params.id, req.params.addressId, req.body));
}

export async function deleteSiteAddress(req: Request, res: Response) {
  await customersService.deleteSiteAddress(req.user, req.params.id, req.params.addressId);
  res.status(204).send();
}

export async function addContact(req: Request, res: Response) {
  res.status(201).json(await customersService.addContact(req.user, req.params.id, req.body));
}

export async function updateContact(req: Request, res: Response) {
  res.status(200).json(await customersService.updateContact(req.user, req.params.id, req.params.contactId, req.body));
}

export async function deleteContact(req: Request, res: Response) {
  await customersService.deleteContact(req.user, req.params.id, req.params.contactId);
  res.status(204).send();
}

export async function addNote(req: Request, res: Response) {
  res.status(201).json(await customersService.addNote(req.user, req.params.id, req.body));
}

export async function updateNote(req: Request, res: Response) {
  res.status(200).json(await customersService.updateNote(req.user, req.params.id, req.params.noteId, req.body));
}

export async function deleteNote(req: Request, res: Response) {
  await customersService.deleteNote(req.user, req.params.id, req.params.noteId);
  res.status(204).send();
}

export async function requestDocumentUploadUrl(req: Request, res: Response) {
  res.status(200).json(await customersService.requestDocumentUploadUrl(req.params.id, req.body.fileName));
}

export async function addDocument(req: Request, res: Response) {
  res.status(201).json(await customersService.addDocument(req.user, req.params.id, req.body));
}

export async function renameDocument(req: Request, res: Response) {
  res.status(200).json(await customersService.renameDocument(req.user, req.params.id, req.params.documentId, req.body.fileName));
}

export async function deleteDocument(req: Request, res: Response) {
  await customersService.deleteDocument(req.user, req.params.id, req.params.documentId);
  res.status(204).send();
}

export async function getDocumentVersionHistory(req: Request, res: Response) {
  res.status(200).json(await customersService.getDocumentVersionHistory(req.params.id, req.params.documentId));
}
