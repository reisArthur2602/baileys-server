import { DisconnectReason, type WASocket } from "@whiskeysockets/baileys";
import qrcode from "qrcode";
import fs from "fs-extra";
import path from "path";
import crypto from "crypto";
import axios from "axios";
import * as sessionRepo from "../repositories/session.repository.js";
import { formatMessageOnReceive } from "../utils/format-message-on-receive.js";
import { NotFoundError } from "../utils/error-handlers.js";
import { createBaileysSession } from "../config/baileys.config.js";
import { formatMessageOnUpdate } from "../utils/format-message-on-update.js";

type SessionStoreItem = {
  sock?: WASocket;
  qrCode: string | null;
  onReceive_webhookUrl: string | null;
  onSend_webhookUrl: string | null;
  onUpdateStatus_webhookUrl: string | null;
  onChangeSession_webhookUrl: string | null;
  connecting?: boolean;
  deleting?: boolean;
};

const sessions: Record<string, SessionStoreItem> = {};
const reconnecting: Record<string, boolean> = {};

async function updateSessionAndNotify(
  sessionId: string,
  data: Record<string, any>
) {
  const updated = await sessionRepo.updateSession({ sessionId, data });

  const session = sessions[sessionId];
  if (session?.onChangeSession_webhookUrl) {
    await sendToWebhook(
      sessionId,
      {
        session: updated,
      },
      "changeSession"
    );
  }
}

// ---------------------
// Função de envio webhooks
// ---------------------
async function sendToWebhook(
  sessionId: string,
  payload: any,
  type: "receive" | "send" | "update" | "changeSession"
) {
  const session = sessions[sessionId];
  if (!session) throw new NotFoundError("Sessão do usuário não foi encontrada");

  let webhookUrl: string | null = null;
  switch (type) {
    case "receive":
      webhookUrl = session.onReceive_webhookUrl;
      break;
    case "send":
      webhookUrl = session.onSend_webhookUrl;
      break;
    case "update":
      webhookUrl = session.onUpdateStatus_webhookUrl;
      break;
    case "changeSession":
      webhookUrl = session.onChangeSession_webhookUrl;
      break;
  }

  if (!webhookUrl) return;
  try {
    await axios.post(webhookUrl, payload);
  } catch (err: any) {
    console.error(`Erro webhook (${type}):`, err.message);
  }
}

// ---------------------
// Iniciar sessão
// ---------------------
export async function startSession({
  sessionId,
  name,
}: {
  sessionId: string;
  name?: string | undefined;
}) {
  if (sessions[sessionId]?.connecting) {
    console.log(`⚠️ Sessão ${sessionId} já está conectando...`);
    return;
  }

  sessions[sessionId] = {
    sock: undefined as unknown as WASocket,
    qrCode: null,
    onReceive_webhookUrl: null,
    onSend_webhookUrl: null,
    onUpdateStatus_webhookUrl: null,
    onChangeSession_webhookUrl: null,
    connecting: true,
  };

  const dbSession = await sessionRepo.findSessionById({ sessionId });
  sessions[sessionId].onReceive_webhookUrl =
    dbSession?.onReceive_webhookUrl || null;
  sessions[sessionId].onSend_webhookUrl = dbSession?.onSend_webhookUrl || null;
  sessions[sessionId].onUpdateStatus_webhookUrl =
    dbSession?.onUpdateStatus_webhookUrl || null;
  sessions[sessionId].onChangeSession_webhookUrl =
    dbSession?.onChangeSession_webhookUrl || null;

  if (sessions[sessionId].sock) {
    sessions[sessionId].sock.end(undefined);
    sessions[sessionId].sock.ws?.close();
  }

  const { sock, saveCreds } = await createBaileysSession(sessionId);
  sessions[sessionId].sock = sock;

  await sessionRepo.upsertSession({
    sessionId,
    data: {
      ...(name !== undefined ? { name } : {}),
      onReceive_webhookUrl: dbSession?.onReceive_webhookUrl || null,
      onSend_webhookUrl: dbSession?.onSend_webhookUrl || null,
      onUpdateStatus_webhookUrl: dbSession?.onUpdateStatus_webhookUrl || null,
      onChangeSession_webhookUrl: dbSession?.onChangeSession_webhookUrl || null,
      connected: false,
      qrCode: null,
    },
  });

  sock.ev.on(
    "connection.update",
    async ({ connection, lastDisconnect, qr }) => {
      if (qr && qr !== sessions[sessionId]!.qrCode) {
        sessions[sessionId]!.qrCode = qr;
        await updateSessionAndNotify(sessionId, {
          qrCode: qr,
          connected: false,
        });
      }

      switch (connection) {
        case "close":
          if (sessions[sessionId]!.deleting) return;
          const error = lastDisconnect?.error as any;
          const statusCode = error?.output?.statusCode;

          if (statusCode === DisconnectReason.loggedOut) {
            await updateSessionAndNotify(sessionId, {
              connected: false,
              qrCode: null,
            });
            sessions[sessionId]!.qrCode = null;
            console.log(`ℹ️ Sessão ${sessionId} desconectada.`);
            await sendToWebhook(
              sessionId,
              { event: "logout" },
              "changeSession"
            );
          } else if (!reconnecting[sessionId]) {
            reconnecting[sessionId] = true;
            console.log(`♻️ Reconectando sessão ${sessionId}...`);
            await sendToWebhook(
              sessionId,
              { event: "reconnecting" },
              "changeSession"
            );
            await startSession({ sessionId, ...(name ? { name } : {}) });
            reconnecting[sessionId] = false;
          }
          break;

        case "open":
          sessions[sessionId]!.qrCode = null;
          await updateSessionAndNotify(sessionId, {
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

    const ignoredTypes = [
      "senderKeyDistributionMessage",
      "status@broadcast",
      "protocolMessage",
      "reactionMessage",
      "ephemeralMessage",
    ];
    const messageType = Object.keys(msg.message)[0];

    if (
      ignoredTypes.includes(messageType!) ||
      msg.key.remoteJid?.endsWith("@g.us") ||
      msg.key.remoteJid?.endsWith("@newsletter")
    )
      return;

    const parsedMessage = await formatMessageOnReceive(msg, sessionId);
    console.log(parsedMessage);
    await sendToWebhook(sessionId, parsedMessage, "receive");
  });

  sock.ev.on("messages.update", async (updates) => {
    for (const update of updates) {
      if (update.update.status !== undefined) {
        const formatted = formatMessageOnUpdate(update, sessionId);
        const status = formatted.status;
        const session = sessions[sessionId];

        if (session?.onSend_webhookUrl && status === "RECEIVED") {
          await sendToWebhook(sessionId, formatted, "send");
          return;
        }

        if (session?.onUpdateStatus_webhookUrl) {
          await sendToWebhook(sessionId, formatted, "update");
          return;
        }
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);
  sessions[sessionId]!.connecting = false;
}

// ---------------------
// Enviar mensagem
// ---------------------
export async function sendMessage({
  sessionId,
  to,
  message,
}: {
  sessionId: string;
  to: string;
  message: string;
}) {
  const session = sessions[sessionId]!;
  if (!session || !session.sock)
    throw new NotFoundError("Sessão do usuário não foi encontrada");

  await session.sock.sendMessage(`${to}@s.whatsapp.net`, { text: message });
  await sendToWebhook(sessionId, { to, message }, "send");
}

// ---------------------
// Atualizar webhooks
// ---------------------
export async function updateWebhook({
  sessionId,
  onReceive_webhookUrl,
  onSend_webhookUrl,
  onUpdateStatus_webhookUrl,
  onChangeSession_webhookUrl,
}: {
  sessionId: string;
  onReceive_webhookUrl?: string | undefined;
  onSend_webhookUrl?: string | undefined;
  onUpdateStatus_webhookUrl?: string | undefined;
  onChangeSession_webhookUrl?: string | undefined;
}) {
  const session = sessions[sessionId];
  if (!session) throw new NotFoundError("Sessão do usuário não foi encontrada");

  if (onReceive_webhookUrl !== undefined)
    session.onReceive_webhookUrl = onReceive_webhookUrl ?? null;
  if (onSend_webhookUrl !== undefined)
    session.onSend_webhookUrl = onSend_webhookUrl ?? null;
  if (onUpdateStatus_webhookUrl !== undefined)
    session.onUpdateStatus_webhookUrl = onUpdateStatus_webhookUrl ?? null;
  if (onChangeSession_webhookUrl !== undefined)
    session.onChangeSession_webhookUrl = onChangeSession_webhookUrl ?? null;

  await updateSessionAndNotify(sessionId, {
    onReceive_webhookUrl: onReceive_webhookUrl ?? null,
    onSend_webhookUrl: onSend_webhookUrl ?? null,
    onUpdateStatus_webhookUrl: onUpdateStatus_webhookUrl ?? null,
    onChangeSession_webhookUrl: onChangeSession_webhookUrl ?? null,
  });
}

// ---------------------
// Criar sessão
// ---------------------
export async function createSession({ name }: { name: string }) {
  const sessionId = crypto.randomUUID();
  await startSession({ sessionId, name });
  return { sessionId };
}

// ---------------------
// Buscar QR
// ---------------------
export async function getQR({ sessionId }: { sessionId: string }) {
  const session = sessions[sessionId]!;
  if (session?.qrCode) return await qrcode.toDataURL(session.qrCode);

  const dbSession = await sessionRepo.findSessionById({ sessionId });
  return dbSession?.qrCode ? await qrcode.toDataURL(dbSession.qrCode) : null;
}

// ---------------------
// Deletar sessão
// ---------------------
export async function deleteSession({ sessionId }: { sessionId: string }) {
  const session = sessions[sessionId]!;
  if (!session || !session.sock)
    throw new NotFoundError("Sessão do usuário não foi encontrada");

  session.deleting = true;
  try {
    await session.sock.logout();
  } catch (err) {
    console.error(`Erro ao deslogar sessão ${sessionId}:`, err);
  }

  const sessionPath = path.resolve(`./sessions/${sessionId}`);
  await fs.remove(sessionPath);

  await sessionRepo.deleteSession({ sessionId });
  delete sessions[sessionId];

  console.log(`✅ Sessão ${sessionId} removida completamente.`);
}

// ---------------------
// Logout sessão
// ---------------------
export async function logoutSession({ sessionId }: { sessionId: string }) {
  const session = sessions[sessionId];
  if (!session || !session.sock)
    throw new NotFoundError("Sessão do usuário não foi encontrada");

  await session.sock.logout();

  const sessionPath = path.resolve(`./sessions/${sessionId}`);
  await fs.remove(sessionPath);
  await updateSessionAndNotify(sessionId, { connected: false, qrCode: null });

  delete sessions[sessionId];
  await startSession({ sessionId });

  console.log(`✅ Sessão ${sessionId} deslogada e pronta para novo login.`);
}

// ---------------------
// Refresh QR
// ---------------------
export async function refreshQR({ sessionId }: { sessionId: string }) {
  const session = sessions[sessionId];
  if (!session || !session.sock)
    throw new NotFoundError("Sessão do usuário não foi encontrada");

  const sessionPath = path.resolve(`./sessions/${sessionId}`);
  if (session.sock) {
    session.sock.end(undefined);
    session.sock.ws?.close();
  }

  await fs.remove(sessionPath);
  await fs.ensureDir(sessionPath);
  await updateSessionAndNotify(sessionId, { connected: false, qrCode: null });

  await startSession({ sessionId });
}

// ---------------------
// Listar sessões
// ---------------------
export async function listSessions() {
  return sessionRepo.listSessions();
}

// ---------------------
// Restaurar sessões
// ---------------------
export async function loadSessionsOnStartup() {
  const savedSessions = await sessionRepo.listSessions();
  for (const session of savedSessions) {
    await startSession({
      sessionId: session.id,
      name: session.name || undefined,
    });

    sessions[session.id]!.onReceive_webhookUrl =
      session.onReceive_webhookUrl ?? null;
    sessions[session.id]!.onSend_webhookUrl = session.onSend_webhookUrl ?? null;
    sessions[session.id]!.onUpdateStatus_webhookUrl =
      session.onUpdateStatus_webhookUrl ?? null;
    sessions[session.id]!.onChangeSession_webhookUrl =
      session.onChangeSession_webhookUrl ?? null;

    await updateSessionAndNotify(session.id, {
      onReceive_webhookUrl: session.onReceive_webhookUrl ?? null,
      onSend_webhookUrl: session.onSend_webhookUrl ?? null,
      onUpdateStatus_webhookUrl: session.onUpdateStatus_webhookUrl ?? null,
      onChangeSession_webhookUrl: session.onChangeSession_webhookUrl ?? null,
    });

    console.log(`✅ Sessão restaurada: ${session.id}`);
  }
}
