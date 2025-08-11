import prisma from "../config/prisma.config.js";
import type { Session } from "@prisma/client";

export async function findSessionById(id: string): Promise<Session | null> {
  return prisma.session.findUnique({ where: { id } });
}

export async function upsertSession(
  data: Partial<Session> & { id: string }
): Promise<Session> {
  return prisma.session.upsert({
    where: { id: data.id },
    update: data,
    create: data as Session,
  });
}

export async function updateSession(
  id: string,
  data: Partial<Session>
): Promise<Session> {
  return prisma.session.update({
    where: { id },
    data,
  });
}

export async function deleteSession(id: string): Promise<Session> {
  return prisma.session.delete({ where: { id } });
}

export async function listSessions(): Promise<Session[]> {
  return prisma.session.findMany();
}
