import { WASocket } from "@whiskeysockets/baileys";

export interface SessionData {
  sock: WASocket;
  qrCode: string | null;
  webhookUrl: string | null;
}

export interface SessionStore {
  [sessionId: string]: SessionData;
}
