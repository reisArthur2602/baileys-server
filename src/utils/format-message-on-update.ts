import {
  jidDecode,
  type WAMessageUpdate,
  type MessageUserReceiptUpdate,
} from "@whiskeysockets/baileys";

enum Status {
  ERROR = 0,
  PENDING = 1,
  SERVER_ACK = 2,
  DELIVERY_ACK = 3,
  READ = 4,
  PLAYED = 5,
}

function mapStatus(messageStatus?: number) {
  switch (messageStatus) {
    case Status.PENDING:
      return "PENDING";
    case Status.SERVER_ACK:
      return "SENT";
    case Status.DELIVERY_ACK:
      return "RECEIVED";
    case Status.READ:
      return "READ";
    case Status.PLAYED:
      return "PLAYED";
    default:
      return "RECEIVED";
  }
}

export function formatMessageOnUpdate(
  update: WAMessageUpdate | MessageUserReceiptUpdate,
  sessionId: string
) {
  const key = "key" in update ? update.key : (update as any).key;
  const status =
    "update" in update
      ? (update.update.status as number)
      : (update as any).receipt.type;

  const from = key?.remoteJid || "";
  const fromDecoded = jidDecode(from || "");
  const fromUser = fromDecoded?.user || "";

  return {
    sessionId: sessionId,
    status: mapStatus(status),
    ids: [key?.id || ""],
    momment: Date.now(),
    phone: fromUser,
  };
}
