import { z } from "zod";

export const createSessionSchema = z.object({
  name: z.string().min(2),
});

export const sendMessageSchema = z.object({
  sessionId: z.string().uuid(),
  to: z.string().regex(/^\d{13}$/),
  message: z.string().min(3),
});

export const setWebhookSchema = z.object({
  sessionId: z.string().uuid(),
  webhookUrl: z.string().url(),
});

export const sessionIdSchema = z.object({
  sessionId: z.string().uuid(),
});
