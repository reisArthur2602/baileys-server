import type { Request, Response } from "express";
import * as sessionService from "../services/session.service.js";
import {
  createSessionSchema,
  sendMessageSchema,
  setWebhookSchema,
  sessionIdSchema,
} from "../validations/session.validation.js";
import { StatusCodes } from "http-status-codes";
import { NotFoundError } from "../utils/error-handlers.js";

export async function createSession(req: Request, res: Response) {
  const data = createSessionSchema.parse(req.body);
  await sessionService.createSession(data.name);
  res.sendStatus(StatusCodes.CREATED);
}

export async function getQRCode(req: Request, res: Response) {
  const { sessionId } = sessionIdSchema.parse(req.params);
  const qr = await sessionService.getQRCode(sessionId);
  if (qr) return res.status(StatusCodes.OK).json({ qr });
  throw new NotFoundError("QR Code não disponível");
}

export async function sendMessage(req: Request, res: Response) {
  const data = sendMessageSchema.parse(req.body);
  await sessionService.sendMessage(data.sessionId, data.to, data.message);
  res.sendStatus(StatusCodes.OK);
}

export async function setWebhook(req: Request, res: Response) {
  const data = setWebhookSchema.parse(req.body);
  await sessionService.setWebhook(data.sessionId, data.webhookUrl);
  res.sendStatus(StatusCodes.OK);
}

export async function deleteSession(req: Request, res: Response) {
  const { sessionId } = sessionIdSchema.parse(req.params);
  await sessionService.deleteSession(sessionId);
  res.sendStatus(StatusCodes.OK);
}


export async function logoutSession(req: Request, res: Response) {
  const { sessionId } = sessionIdSchema.parse(req.params);
  await sessionService.logoutSession(sessionId);
  res.sendStatus(StatusCodes.OK);
}

export async function refreshQR(req: Request, res: Response) {
  const { sessionId } = sessionIdSchema.parse(req.body);
  await sessionService.refreshQR(sessionId);
  res.sendStatus(StatusCodes.OK);
}

export async function listSessions(req: Request, res: Response) {
  const sessions = await sessionService.listSessions();
  res.status(StatusCodes.OK).json(sessions);
}
