import { z } from "zod";


export const createSessionSchema = z.object({
  name: z.string().min(1, "O nome é obrigatório"),
});


export const sendMessageSchema = z.object({
  sessionId: z.string().uuid("sessionId inválido"),
  to: z.string().min(3),
  message: z.string().min(1),
});


export const setWebhookSchema = z.object({
  sessionId: z.string().uuid("sessionId inválido"),
  webhookUrl: z.string().url("URL inválida"),
});


export const sessionIdSchema = z.object({
  sessionId: z.string().uuid("sessionId inválido"),
});
