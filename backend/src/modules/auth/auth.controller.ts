import { Request, Response } from 'express';
import * as authService from './auth.service';

export async function register(req: Request, res: Response) {
  const result = await authService.registerCustomer(req.body);
  res.status(201).json(result);
}

export async function login(req: Request, res: Response) {
  const result = await authService.login(req.body);
  res.status(200).json(result);
}

export async function refresh(req: Request, res: Response) {
  const result = await authService.refreshTokens(req.body.refreshToken);
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

export async function me(req: Request, res: Response) {
  res.status(200).json({ user: req.user });
}
