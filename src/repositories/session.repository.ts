import prisma from "../config/prisma.config.js";
import type { Session } from "@prisma/client";

export async function findSessionById({
  sessionId,
}: {
  sessionId: string;
}): Promise<Session | null> {
  return prisma.session.findUnique({ where: { id: sessionId } });
}

export async function upsertSession({
  sessionId,
  data,
}: {
  sessionId: string;
  data: Partial<Session> & { id?: string };
}): Promise<Session> {
  return prisma.session.upsert({
    where: { id: sessionId },
    update: data,
    create: { ...data, id: sessionId } as Session,
  });
}

export async function updateSession({
  sessionId,
  data,
}: {
  sessionId: string;
  data: Partial<Session>;
}): Promise<Session> {
  return prisma.session.update({
    where: { id: sessionId },
    data,
  });
}

export async function deleteSession({
  sessionId,
}: {
  sessionId: string;
}): Promise<Session> {
  return prisma.session.delete({ where: { id: sessionId } });
}

export async function listSessions(): Promise<Session[]> {
  return prisma.session.findMany();
}
