import { jidDecode, type proto } from "@whiskeysockets/baileys";

type Location = {
  latitude: number;
  longitude: number;
  name: string | undefined;
  address: string | undefined;
  mode: "manual" | "current";
};

type Image = {
  url: string;
  mimetype: string;
  size: number;
  caption: string;
};

interface ParsedMessage {
  sessionId: string;
  from: string;
  fromUser: string;
  name: string;
  type: string;
  text: string;
  isForwarded: boolean;
  timestamp: string;
  location?: Location | undefined;
  image?: Image | undefined;
}

export function parseIncomingMessage(
  msg: proto.IWebMessageInfo,
  sessionId: string
): ParsedMessage {
  const messageType = Object.keys(msg.message || {})[0] || "unknown";
  const from = msg.key.remoteJid || "";
  const fromDecoded = jidDecode(from || "");
  const fromUser = fromDecoded?.user || "";
  const pushName = msg.pushName || "Desconhecido";

  const isForwarded =
    (msg.message?.extendedTextMessage?.contextInfo?.isForwarded ?? false) ||
    (msg.message?.extendedTextMessage?.contextInfo?.forwardingScore ?? 0) > 0 ||
    (msg.message?.imageMessage?.contextInfo?.isForwarded ?? false) ||
    (msg.message?.imageMessage?.contextInfo?.forwardingScore ?? 0) > 0;

  const timestamp = msg.messageTimestamp
    ? new Date(Number(msg.messageTimestamp) * 1000).toString()
    : new Date().toString();

  let parsed: ParsedMessage = {
    sessionId,
    from,
    fromUser,
    name: pushName,
    type: messageType,
    isForwarded,
    timestamp,
    text: "",
  };

  if (messageType === "conversation" || messageType === "extendedTextMessage") {
    parsed.text =
      msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
  }

  if (messageType === "locationMessage") {
    const locMsg = msg.message?.locationMessage;
    parsed.location = {
      latitude: locMsg?.degreesLatitude || 0,
      longitude: locMsg?.degreesLongitude || 0,
      name: locMsg?.name || undefined,
      address: locMsg?.address || undefined,
      mode:
        !locMsg?.name ||
        (!locMsg?.address &&
          locMsg?.degreesLatitude &&
          locMsg?.degreesLongitude)
          ? "current"
          : "manual",
    };
  }

  if (messageType === "imageMessage") {
    const imgMsg = msg.message?.imageMessage;
    parsed.image = {
      url: imgMsg?.url || "",
      mimetype: imgMsg?.mimetype || "",
      size: Number(imgMsg?.fileLength || 0),
      caption: imgMsg?.caption || "",
    };
  }

  return parsed;
}
