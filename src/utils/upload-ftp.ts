import { Readable } from "stream";
import { createFtpClient } from "../config/ftp-config.js";

export async function uploadToFtp(buffer: Buffer, remoteFileName: string) {
  const client = await createFtpClient();
  const host = process.env.FTP_HOST as string;

  try {
    const stream = Readable.from(buffer);
    await client.uploadFrom(stream, remoteFileName);
    return `https://${host}/${remoteFileName}`;
  } finally {
    client.close();
  }
}
