import { Router } from "express";

import {
  createSession,
  getQRCode,
  sendMessage,
  setWebhook,
  deleteSession,
  refreshQR,
  listSessions,
  logoutSession,
} from "../controllers/session.controller.js";

export const sessionRoutes = Router();

sessionRoutes.post("/session", createSession);
sessionRoutes.get("/qr/:sessionId", getQRCode);
sessionRoutes.post("/send", sendMessage);
sessionRoutes.post("/set-webhook", setWebhook);
sessionRoutes.delete("/session/:sessionId", deleteSession);
sessionRoutes.patch("/session/:sessionId/logout", logoutSession);
sessionRoutes.post("/session/refresh-qrcode", refreshQR);
sessionRoutes.get("/sessions", listSessions);
