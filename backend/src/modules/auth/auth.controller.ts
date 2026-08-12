import { Request, Response } from 'express';
import * as authService from './auth.service';

function sessionContext(req: Request) {
  return { userAgent: req.get('user-agent') ?? undefined, ipAddress: req.ip };
}

export async function register(req: Request, res: Response) {
  const result = await authService.registerCustomer(req.body, sessionContext(req));
  res.status(201).json(result);
}

export async function login(req: Request, res: Response) {
  const result = await authService.login(req.body, sessionContext(req));
  res.status(200).json(result);
}

export async function refresh(req: Request, res: Response) {
  const result = await authService.refreshTokens(req.body.refreshToken, sessionContext(req));
  res.status(200).json(result);
}

export async function logout(req: Request, res: Response) {
  await authService.logout(req.body.refreshToken);
  res.status(204).send();
}

export async function forgotPassword(req: Request, res: Response) {
  await authService.requestPasswordReset(req.body.email);
  res.status(200).json({ message: 'If an account exists for this email, a reset link has been sent.' });
}

export async function resetPassword(req: Request, res: Response) {
  await authService.resetPassword(req.body.token, req.body.password);
  res.status(200).json({ message: 'Password has been reset successfully.' });
}

export async function changePassword(req: Request, res: Response) {
  await authService.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
  res.status(200).json({ message: 'Password changed successfully. Please log in again.' });
}

export async function me(req: Request, res: Response) {
  const user = await authService.getCurrentUser(req.user!.id);
  res.status(200).json({ user });
}

export async function listSessions(req: Request, res: Response) {
  res.status(200).json(await authService.listSessions(req.user!.id));
}

export async function revokeSession(req: Request, res: Response) {
  await authService.revokeSession(req.user!.id, req.params.id);
  res.status(204).send();
}

export async function revokeAllSessions(req: Request, res: Response) {
  await authService.revokeAllSessions(req.user!.id);
  res.status(204).send();
}
