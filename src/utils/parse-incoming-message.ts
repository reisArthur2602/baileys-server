import { jidDecode, type proto } from "@whiskeysockets/baileys";
import { saveMedia } from "./save-media.js";

export async function parseIncomingMessage(
  msg: proto.IWebMessageInfo,
  sessionId: string
) {
  const messageType = Object.keys(msg.message || {})[0] || "unknown";
  const from = msg.key.remoteJid || "";
  const fromDecoded = jidDecode(from || "");
  const fromUser = fromDecoded?.user || "";
  const pushName = msg.pushName || "";

  const forwarded =
    (msg.message?.extendedTextMessage?.contextInfo?.isForwarded ?? false) ||
    (msg.message?.extendedTextMessage?.contextInfo?.forwardingScore ?? 0) > 0 ||
    (msg.message?.imageMessage?.contextInfo?.isForwarded ?? false) ||
    (msg.message?.imageMessage?.contextInfo?.forwardingScore ?? 0) > 0;

  const momment = msg.messageTimestamp
    ? Number(msg.messageTimestamp) * 1000
    : Date.now();

  const base = {
    sessionId,
    messageId: msg.key.id || "",
    phone: fromUser,
    fromMe: msg.key.fromMe || false,
    momment,
    senderName: pushName || "",
    forwarded,
  };

  // Texto
  if (messageType === "conversation" || messageType === "extendedTextMessage") {
    return {
      ...base,
      text: {
        message:
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          "",
      },
    };
  }

  if (messageType === "locationMessage") {
    const locMsg = msg.message?.locationMessage;
    return {
      ...base,
      location: {
        longitude: locMsg?.degreesLongitude || 0,
        latitude: locMsg?.degreesLatitude || 0,
        name: locMsg?.name || null,
        address: locMsg?.address || "",
        url: "",
      },
    };
  }

  if (messageType === "documentMessage") {
    const docMsg = msg.message?.documentMessage;
    const url = await saveMedia(msg);

    // const buffer = await getMediaBuffer(msg);
    // const url = await uploadToFtp(buffer, docMsg?.fileName!);

    return {
      ...base,
      document: {
        caption: docMsg?.caption || null,
        documentUrl: url,
        mimeType: docMsg?.mimetype || "",
        title: docMsg?.title || "",
        pageCount: docMsg?.pageCount || 0,
        fileName: docMsg?.fileName || "",
      },
    };
  }

  if (messageType === "imageMessage") {
    const imgMsg = msg.message?.imageMessage;
    const url = await saveMedia(msg);
    // const buffer = await getMediaBuffer(msg);
    // const url = await uploadToFtp(buffer, crypto.randomUUID());

    return {
      ...base,
      image: {
        imageUrl: url,
        thumbnailUrl: url,
        caption: imgMsg?.caption || "",
        mimeType: imgMsg?.mimetype || "",
        viewOnce: imgMsg?.viewOnce || false,
        width: imgMsg?.width || 0,
        height: imgMsg?.height || 0,
      },
    };
  }

  return base;
}
