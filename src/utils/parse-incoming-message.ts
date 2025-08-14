import { jidDecode, type proto } from "@whiskeysockets/baileys";
import { getMediaBuffer } from "./get-media-buffer.js";
import { uploadToFtp } from "./upload-ftp.js";

type Sequence = { low: number; high: number; unsigned: boolean };

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

  switch (messageType) {
    case "conversation":
    case "extendedTextMessage":
      return {
        ...base,
        text: {
          message:
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            "",
        },
      };

    case "locationMessage": {
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

    case "liveLocationMessage": {
      const liveMsg = msg.message?.liveLocationMessage;
      return {
        ...base,
        liveLocation: {
          longitude: liveMsg?.degreesLongitude || 0,
          latitude: liveMsg?.degreesLatitude || 0,
          sequence: liveMsg?.sequenceNumber
            ? (liveMsg.sequenceNumber as unknown as Sequence)
            : { low: 0, high: 0, unsigned: false },
          caption: liveMsg?.caption || "",
        },
      };
    }

    case "documentMessage": {
      const docMsg = msg.message?.documentMessage;
      const fileBuffer = await getMediaBuffer(msg);
      if (!fileBuffer) return;
      const url = await uploadToFtp(fileBuffer.buffer, fileBuffer.fileName);

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

    case "imageMessage": {
      const imgMsg = msg.message?.imageMessage;
      const fileBuffer = await getMediaBuffer(msg);
      if (!fileBuffer) return;
      const url = await uploadToFtp(fileBuffer.buffer, fileBuffer.fileName);

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

    case "audioMessage": {
      const audioMsg = msg.message?.audioMessage;
      const fileBuffer = await getMediaBuffer(msg);
      if (!fileBuffer) return;
      const url = await uploadToFtp(fileBuffer.buffer, fileBuffer.fileName);

      return {
        ...base,
        audio: {
          ptt: audioMsg?.ptt || false,
          seconds: audioMsg?.seconds || 0,
          audioUrl: url,
          mimeType: audioMsg?.mimetype || "",
          viewOnce: audioMsg?.viewOnce || false,
        },
      };
    }

    case "contactMessage": {
      const contactMsg = msg.message?.contactMessage;
      return {
        ...base,
        contact: {
          displayName: contactMsg?.displayName || "",
          vCard: contactMsg?.vcard || "",
          phones: [],
        },
      };
    }

    case "contactsArrayMessage": {
      const contactsArray = msg.message?.contactsArrayMessage?.contacts || [];
      return {
        ...base,
        contact:
          contactsArray.length > 0
            ? {
                displayName: contactsArray[0]?.displayName || "",
                vCard: contactsArray[0]?.vcard || "",
                phones: [],
              }
            : {
                displayName: "",
                vCard: "",
                phones: [],
              },
      };
    }

    default:
      return base;
  }
}
