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

const router = Router();

router.post("/session", createSession);
router.get("/qr/:sessionId", getQRCode);
router.post("/send", sendMessage);
router.post("/set-webhook", setWebhook);
router.delete("/session/:sessionId", deleteSession);
router.post("/session/refresh-qrcode", refreshQR);
router.get("/sessions", listSessions);

export default router;
