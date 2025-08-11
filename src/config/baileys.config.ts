import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  type WASocket,
} from "@whiskeysockets/baileys";
import path from "path";

export async function createBaileysSession(sessionId: string): Promise<{
  sock: WASocket;
  saveCreds: () => Promise<void>;
}> {
  const sessionPath = path.resolve(`./sessions/${sessionId}`);

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

  const sock = makeWASocket({ auth: state });

  return { sock, saveCreds };
}

export { DisconnectReason };
