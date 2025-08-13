import { downloadMediaMessage, type proto } from "@whiskeysockets/baileys";
import fs from "fs";
import path from "path";
import mime from "mime-types";

export async function saveMedia(msg: proto.IWebMessageInfo) {
  // Descobre a mensagem de mídia real
  const messageType = Object.keys(msg.message || {})[0] || "";
  const mediaMessage = (msg.message as any)[messageType];
  if (!mediaMessage) return null;

  const buffer = await downloadMediaMessage(msg, "buffer", {});

  const mimeType = mediaMessage.mimetype || "application/octet-stream";
  const ext = mime.extension(mimeType) || "bin";

  const fileName = `${msg.key.id || Date.now()}.${ext}`;

  const mediaPath = path.join(process.cwd(), "media");
  if (!fs.existsSync(mediaPath)) {
    fs.mkdirSync(mediaPath);
  }

  const filePath = path.join(mediaPath, fileName);
  fs.writeFileSync(filePath, buffer);

  return filePath;
}
