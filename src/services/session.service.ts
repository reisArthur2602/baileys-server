import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  type WASocket,
} from "@whiskeysockets/baileys";
import qrcode from "qrcode";
import fs from "fs-extra";
import path from "path";
import crypto from "crypto";
import axios from "axios";

import * as sessionRepo from "../repositories/session.repository.js";
import { parseIncomingMessage } from "../utils/parse-incoming-message.js";
import { NotFoundError, BadRequestError } from "../utils/error-handlers.js";

type SessionStoreItem = {
  sock: WASocket;
  qrCode: string | null;
  webhookUrl: string | null;
  connecting?: boolean;
  deleting?: boolean;
};

const sessions: Record<string, SessionStoreItem> = {};
const reconnecting: Record<string, boolean> = {};

export async function createSession(name: string) {
  if (!name) throw new BadRequestError("Nome da sessão é obrigatório");
  const sessionId = crypto.randomUUID();
  await startSession(sessionId, name);
}

export async function startSession(sessionId: string, name?: string) {
  if (sessions[sessionId]?.connecting) {
    console.log(`⚠️ Sessão ${sessionId} já está conectando...`);
    return;
  }

  sessions[sessionId] = {
    sock: undefined as unknown as WASocket,
    qrCode: null,
    webhookUrl: null,
    connecting: true,
  };

  const sessionPath = path.resolve(`./sessions/${sessionId}`);
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

  const dbSession = await sessionRepo.findSessionById(sessionId);
  sessions[sessionId].webhookUrl = dbSession?.webhookUrl || null;

  if (sessions[sessionId]?.sock) {
    try {
      sessions[sessionId].sock.end(undefined);
      sessions[sessionId].sock.ws?.close();
    } catch (err) {
      console.error(`Erro ao fechar socket da sessão ${sessionId}:`, err);
    }
  }

  const sock = makeWASocket({ auth: state });
  sessions[sessionId].sock = sock;

  await sessionRepo.upsertSession({
    id: sessionId,
    name: name || dbSession?.name || null,
    webhookUrl: dbSession?.webhookUrl || null,
    connected: false,
    qrCode: null,
  });

  sock.ev.on(
    "connection.update",
    async ({ connection, lastDisconnect, qr }) => {
      if (qr && qr !== sessions[sessionId]!.qrCode) {
        sessions[sessionId]!.qrCode = qr;
        await sessionRepo.updateSession(sessionId, {
          qrCode: qr,
          connected: false,
        });
      }

      switch (connection) {
        case "close":
          if (sessions[sessionId]?.deleting) return;

          const error = lastDisconnect?.error as any;
          const statusCode = error?.output?.statusCode;

          if (statusCode === DisconnectReason.loggedOut) {
            console.log(
              `⚠️ Logout detectado na sessão ${sessionId}. Limpando credenciais...`
            );
            try {
              sock.end(undefined);
              sock.ws?.close();
            } catch (err) {
              console.error("Erro ao fechar socket:", err);
            }

            await fs.remove(sessionPath);
            await fs.ensureDir(sessionPath);

            await sessionRepo.updateSession(sessionId, {
              connected: false,
              qrCode: null,
            });

            console.log(`✅ Sessão ${sessionId} limpa. Aguardando novo QR...`);
          } else if (!reconnecting[sessionId]) {
            reconnecting[sessionId] = true;
            console.log(`♻️ Reconectando sessão ${sessionId}...`);

            await startSession(sessionId, name);
            reconnecting[sessionId] = false;
          }
          break;
        case "open":
          sessions[sessionId]!.qrCode = null;
          await sessionRepo.updateSession(sessionId, {
            connected: true,
            qrCode: null,
          });
          console.log(`✅ Sessão ${sessionId} conectada`);
          break;
      }
    }
  );

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg?.message || msg.key.fromMe) return;

    const parsedMessage = parseIncomingMessage(msg, sessionId);
    console.log(parsedMessage);

    const webhookUrl = sessions[sessionId]!.webhookUrl;
    if (webhookUrl) {
      try {
        await axios.post(webhookUrl, parsedMessage);
      } catch (err: any) {
        console.error("Erro webhook:", err?.message);
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);

  sessions[sessionId].connecting = false;
}

export async function getQRCode(sessionId: string): Promise<string | null> {
  const session = sessions[sessionId];
  if (session?.qrCode) return await qrcode.toDataURL(session.qrCode);

  const dbSession = await sessionRepo.findSessionById(sessionId);
  return dbSession?.qrCode ? await qrcode.toDataURL(dbSession.qrCode) : null;
}

export async function sendMessage(
  sessionId: string,
  to: string,
  message: string
) {
  const session = sessions[sessionId];
  if (!session || !session.sock)
    throw new NotFoundError("Sessão do usuário não foi encontrada");

  await session.sock.sendMessage(`${to}@s.whatsapp.net`, { text: message });
}

export async function setWebhook(sessionId: string, webhookUrl: string) {
  const session = sessions[sessionId];
  if (!session) throw new NotFoundError("Sessão do usuário não foi encontrada");

  session.webhookUrl = webhookUrl;
  await sessionRepo.updateSession(sessionId, { webhookUrl });
}

export async function deleteSession(sessionId: string) {
  const session = sessions[sessionId];
  if (!session || !session.sock)
    throw new NotFoundError("Sessão do usuário não foi encontrada");
  session.deleting = true;
  await session.sock.logout();
  const sessionPath = path.resolve(`./sessions/${sessionId}`);
  await fs.remove(sessionPath);
  await sessionRepo.deleteSession(sessionId);
}

export async function refreshQR(sessionId: string) {
  const sessionPath = path.resolve(`./sessions/${sessionId}`);

  if (sessions[sessionId]?.sock) {
    sessions[sessionId].sock.end(undefined);
    sessions[sessionId].sock.ws?.close();
  }

  await fs.remove(sessionPath);
  await fs.ensureDir(sessionPath);

  await sessionRepo.updateSession(sessionId, {
    connected: false,
    qrCode: null,
  });

  await startSession(sessionId);
}

export async function listSessions() {
  return sessionRepo.listSessions();
}

export async function loadSessionsOnStartup() {
  const savedSessions = await sessionRepo.listSessions();
  for (const session of savedSessions) {
    await startSession(session.id, session.name || undefined);
    sessions[session.id]!.webhookUrl = session.webhookUrl || null;
    console.log(`✅ Sessão restaurada: ${session.id}`);
  }
}
