import type { Request, Response } from "express";
import * as sessionService from "../services/session.service.js";
import {
  createSessionSchema,
  sendMessageSchema,
  setWebhookSchema,
} from "../validations/session.validation.js";
import { StatusCodes } from "http-status-codes";
import { NotFoundError } from "../utils/error-handlers.js";
import { getSessionFromHeader } from "../utils/get-session-from-header.js";

export async function createSession(request: Request, response: Response) {
  const data = createSessionSchema.parse(request.body);
  const { sessionId } = await sessionService.createSession({ name: data.name });
  response.status(StatusCodes.CREATED).json({ sessionId });
}

export async function getQR(request: Request, response: Response) {
  const sessionId = await getSessionFromHeader(request);
  const qr = await sessionService.getQR({ sessionId });
  if (!qr) throw new NotFoundError("QR Code não disponível");
  return response.status(StatusCodes.OK).json({ qr });
}

export async function sendMessage(request: Request, response: Response) {
  const { to, message } = sendMessageSchema.parse(request.body);
  const sessionId = await getSessionFromHeader(request);
  await sessionService.sendMessage({ sessionId, to, message });
  response.sendStatus(StatusCodes.OK);
}

export async function updateWebhook(request: Request, response: Response) {
  const sessionId = await getSessionFromHeader(request);
  const { webhookUrl } = setWebhookSchema.parse(request.body);
  await sessionService.updateWebhook({ sessionId, webhookUrl });
  response.sendStatus(StatusCodes.OK);
}

export async function deleteSession(request: Request, response: Response) {
  const sessionId = await getSessionFromHeader(request);
  await sessionService.deleteSession({ sessionId });
  response.sendStatus(StatusCodes.OK);
}

export async function logoutSession(request: Request, response: Response) {
  const sessionId = await getSessionFromHeader(request);
  await sessionService.logoutSession({ sessionId });
  response.sendStatus(StatusCodes.OK);
}

export async function refreshQR(request: Request, response: Response) {
  const sessionId = await getSessionFromHeader(request);
  await sessionService.refreshQR({ sessionId });
  response.sendStatus(StatusCodes.OK);
}

export async function listSessions(request: Request, response: Response) {
  const sessions = await sessionService.listSessions();
  response.status(StatusCodes.OK).json(sessions);
}
