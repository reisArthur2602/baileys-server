import type { Request, Response } from "express";
import * as sessionService from "../services/session.service.js";
import {
  createSessionSchema,
  sendMessageSchema,
  setWebhookSchema,
  sessionIdSchema,
} from "../validations/session.validation.js";

export async function createSession(req: Request, res: Response) {
  const result = createSessionSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.format() });
  }

  try {
    const data = await sessionService.createSession(result.data.name);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Erro ao iniciar a sessão" });
  }
}

export async function getQRCode(req: Request, res: Response) {
  const result = sessionIdSchema.safeParse(req.params);
  if (!result.success) {
    return res.status(400).json({ error: result.error.format() });
  }

  const qr = await sessionService.getQRCode(result.data.sessionId);
  if (qr) res.json({ qr });
  else res.status(404).json({ error: "QR Code não disponível" });
}

export async function sendMessage(req: Request, res: Response) {
  const result = sendMessageSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.format() });
  }

  try {
    const { sessionId, to, message } = result.data;
    await sessionService.sendMessage(sessionId, to, message);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Erro ao enviar mensagem" });
  }
}

export async function setWebhook(req: Request, res: Response) {
  const result = setWebhookSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.format() });
  }

  const { sessionId, webhookUrl } = result.data;
  await sessionService.setWebhook(sessionId, webhookUrl);
  res.json({ message: "Webhook atualizado" });
}

export async function deleteSession(req: Request, res: Response) {
  const result = sessionIdSchema.safeParse(req.params);
  if (!result.success) {
    return res.status(400).json({ error: result.error.format() });
  }

  try {
    await sessionService.deleteSession(result.data.sessionId);
    res.json({ message: "Sessão desconectada" });
  } catch {
    res.status(500).json({ error: "Erro ao desconectar sessão" });
  }
}

export async function refreshQR(req: Request, res: Response) {
  const result = sessionIdSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.format() });
  }

  await sessionService.refreshQR(result.data.sessionId);
  res.json({ message: "QR atualizado" });
}

export async function listSessions(req: Request, res: Response) {
  const sessions = await sessionService.listSessions();
  res.json(sessions);
}
