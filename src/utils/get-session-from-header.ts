import type { Request } from "express";

export async function getSessionFromHeader(request: Request) {
  const sessionId = request.headers.authorization;
  if (!sessionId) throw new Error("O identificador da sessão é obrigatório");
  return sessionId;
}
