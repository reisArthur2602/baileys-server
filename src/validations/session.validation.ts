import { z } from "zod";

export const createSessionSchema = z.object({
  name: z
    .string({ error: "O nome da sessão é obrigatório." })
    .min(2, { message: "O nome da sessão deve ter pelo menos 2 caracteres." }),
});

export const sendMessageSchema = z.object({
  sessionId: z
    .string({ error: "O identificador da sessão é obrigatório." })
    .uuid({ message: "O identificador da sessão é inválido." }),
  to: z
    .string({ error: "O número de telefone é obrigatório." })
    .regex(/^\d{13}$/, {
      message: "O número de telefone deve conter exatamente 13 dígitos.",
    }),
  message: z
    .string({ error: "A mensagem é obrigatória." })
    .min(3, { message: "A mensagem deve ter pelo menos 3 caracteres." }),
});

export const setWebhookSchema = z.object({
  sessionId: z
    .string({ error: "O identificador da sessão é obrigatório." })
    .uuid({ message: "O identificador da sessão é inválido." }),
  webhookUrl: z
    .string({ error: "A URL do webhook é obrigatória." })
    .url({ message: "A URL do webhook é inválida." }),
});

export const sessionIdSchema = z.object({
  sessionId: z
    .string({ error: "O identificador da sessão é obrigatório." })
    .uuid({ message: "O identificador da sessão é inválido." }),
});
