import { Readable } from "stream";
import { createFtpClient } from "../config/ftp-config.js";

export async function uploadToFtp(buffer: Buffer, fileName: string) {
  const path = "/media";
  const client = await createFtpClient(path);
  const host = process.env.FTP_HOST as string;

  try {
    const stream = Readable.from(buffer);
    await client.uploadFrom(stream, fileName);
    return `ftp://${host}/media/${fileName}`;
    // return `https://${host}/${path}/${fileName}`;
  } finally {
    client.close();
  }
}
