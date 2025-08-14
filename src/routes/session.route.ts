import { Router } from "express";

import {
  createSession,
  getQR,
  sendMessage,
  updateWebhook,
  deleteSession,
  refreshQR,
  listSessions,
  logoutSession,
} from "../controllers/session.controller.js";

export const sessionRoutes = Router();

sessionRoutes.post("/", createSession);

sessionRoutes.post("/send", sendMessage);
sessionRoutes.patch("/webhook", updateWebhook);
sessionRoutes.delete("/", deleteSession);
sessionRoutes.patch("/disconnect", logoutSession);
sessionRoutes.get("/qr", getQR);
sessionRoutes.patch("/qr/refresh", refreshQR);
sessionRoutes.get("/all", listSessions);
