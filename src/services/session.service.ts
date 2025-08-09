import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  jidDecode,
type WASocket,
} from "@whiskeysockets/baileys";

import qrcode from "qrcode";
import crypto from "crypto";
import axios from "axios";
import path from "path";
import prisma from "../config/prisma.js";

import type { SessionStore } from "../types/index.js";
import type { Boom } from "@hapi/boom"

const sessions: SessionStore = {};

export async function createSession(name: string) {
  const sessionId = crypto.randomUUID();
  await startSession(sessionId, name);
  return { sessionId, name, message: "Sessão criada" };
}

export async function startSession(sessionId: string, name?: string) {
  const sessionPath = path.resolve(`./sessions/${sessionId}`);
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

  const dbSession = await prisma.session.findUnique({ where: { id: sessionId } });

  sessions[sessionId] = {
    sock: undefined as unknown as WASocket, 
    qrCode: null,
    webhookUrl: dbSession?.webhookUrl || null,
  };

  const sock = makeWASocket({ auth: state });
  sessions[sessionId].sock = sock;

  await prisma.session.upsert({
    where: { id: sessionId },
    update: {
    webhookUrl: dbSession?.webhookUrl || null,
    connected: false,
  
},
    create: {
      id: sessionId,
      name: name || null,
      connected: false,
      qrCode: null,
      webhookUrl: dbSession?.webhookUrl || null,
    },
  });

  sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      sessions[sessionId]!.qrCode = qr;
      await prisma.session.update({
        where: { id: sessionId },
        data: { qrCode: qr, connected: false },
      });
    }

    if (connection === "close") {
      const error = lastDisconnect?.error as Boom | undefined;
    const statusCode = (error as any)?.output?.statusCode;

      if (statusCode === DisconnectReason.loggedOut) {
        delete sessions[sessionId];
        await prisma.session.delete({ where: { id: sessionId } });
      } else {
        await startSession(sessionId, name);
      }
    } else if (connection === "open") {
      sessions[sessionId]!.qrCode = null;
      await prisma.session.update({
        where: { id: sessionId },
        data: { connected: true, qrCode: null },
      });
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg?.message || msg.key.fromMe) return;

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      msg.message.imageMessage?.caption ||
      "";

    const webhookUrl = sessions[sessionId]!.webhookUrl;
    const data = {
      sessionId,
      from: msg.key.remoteJid,
      fromUser: jidDecode(msg.key.remoteJid || "")?.user || "",
      name: msg.pushName || "Desconhecido",
      message: text,
      type: Object.keys(msg.message)[0],
      timestamp: msg.messageTimestamp,
    };

    if (webhookUrl) {
      try {
        await axios.post(webhookUrl, data);
      } catch (err: any) {
        console.error("Erro webhook:", err?.message);
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);
}

export async function getQRCode(sessionId: string): Promise<string | null> {
  const session = sessions[sessionId];


  if (session?.qrCode) {
    return await qrcode.toDataURL(session.qrCode);
  }

 
  const dbSession = await prisma.session.findUnique({ where: { id: sessionId } });

  if (dbSession?.qrCode) {
    return await qrcode.toDataURL(dbSession.qrCode);
  }

  return null;
}

export async function sendMessage(sessionId: string, to: string, message: string) {
  const session = sessions[sessionId];
  if (!session || !session.sock) throw new Error("Sessão não encontrada");
 
  await session.sock.sendMessage(`${to}@s.whatsapp.net`, { text: message });
}

export async function setWebhook(sessionId: string, webhookUrl: string) {
  const session = sessions[sessionId];
  if (!session) throw new Error("Sessão não encontrada");
  session.webhookUrl = webhookUrl;
  await prisma.session.update({ where: { id: sessionId }, data: { webhookUrl } });
}

export async function deleteSession(sessionId: string) {
  const session = sessions[sessionId];
  if (!session || !session.sock) throw new Error("Sessão não encontrada");
  await session.sock.logout();
  delete sessions[sessionId];
  await prisma.session.delete({ where: { id: sessionId } });
}

export async function refreshQR(sessionId: string) {
  const session = sessions[sessionId];

  if (session && session.sock) {
    try {
    
      session.sock.ws.close();
    } catch (err) {
      console.error("Erro ao fechar socket:", err);
    }
  }

  await startSession(sessionId);
}


export async function listSessions() {
  return await prisma.session.findMany();
}

export async function loadSessionsOnStartup() {
  const savedSessions = await prisma.session.findMany();

  for (const session of savedSessions) {
    if (session.connected) {
      try {
        await startSession(session.id, session.name || undefined);
        sessions[session.id]!.webhookUrl = session.webhookUrl || null;
        console.log(`✅ Sessão restaurada: ${session.id}`);
      } catch (err) {
        console.error(`❌ Erro ao restaurar sessão ${session.id}:`, err);
      }
    }
  }
}
