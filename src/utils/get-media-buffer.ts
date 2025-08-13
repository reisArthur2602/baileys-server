import { downloadMediaMessage, type proto } from "@whiskeysockets/baileys";

export async function getMediaBuffer(
  msg: proto.IWebMessageInfo
): Promise<Buffer> {
  return await downloadMediaMessage(msg, "buffer", {});
}
