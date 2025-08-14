import { Readable } from "stream";
import { createFtpClient } from "../config/ftp-config.js";

export async function uploadToFtp(buffer: Buffer, fileName: string, path: string) {
  
  const client = await createFtpClient(path);
  
  
  const publicBaseUrl = "https://mastertelecom-claro.com.br/";

  try {
    const stream = Readable.from(buffer);
    await client.uploadFrom(stream, fileName);

   
    const relativePath = path.replace("/public_html", "").replace(/\/+$/, "");

  
    return `${publicBaseUrl}${relativePath}/${fileName}`;
  } catch (err) {
    console.error("Erro ao fazer upload FTP:", err);
    return null;
  } finally {
    client.close();
  }
}
