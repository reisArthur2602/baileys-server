import { Router } from "express";
import {
  createSession,
  getQRCode,
  sendMessage,
  setWebhook,
  deleteSession,
  refreshQR,
  listSessions,
} from "../controllers/session.controller.js";

export const sessionRoutes = Router();

sessionRoutes.post("/session", createSession);
sessionRoutes.get("/qr/:sessionId", getQRCode);
sessionRoutes.post("/send", sendMessage);
sessionRoutes.post("/set-webhook", setWebhook);
sessionRoutes.delete("/session/:sessionId", deleteSession);
sessionRoutes.post("/session/refresh-qrcode", refreshQR);
sessionRoutes.get("/sessions", listSessions);
