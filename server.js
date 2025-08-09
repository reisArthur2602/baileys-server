const express = require("express");
const cors = require("cors");
const {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  jidDecode,
} = require("@whiskeysockets/baileys");
const qrcode = require("qrcode");
const axios = require("axios");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const app = express();
app.use(express.json());
app.use(cors());
const sessions = {};

// Salva ou atualiza sessão no banco
async function saveSessionToDB(sessionId, data) {
  await prisma.session.upsert({
    where: { id: sessionId },
    update: data,
    create: {
      id: sessionId,
      ...data,
    },
  });
}

// Remove sessão do banco
async function deleteSessionFromDB(sessionId) {
  await prisma.session.deleteMany({
    where: { id: sessionId },
  });
}

async function startSession(sessionId, name) {
  const { state, saveCreds } = await useMultiFileAuthState(
    `./sessions/${sessionId}`
  );

  // Busca sessão atual no banco para preservar webhookUrl
  const sessionInDB = await prisma.session.findUnique({
    where: { id: sessionId },
  });

  sessions[sessionId] = {
    qrCode: null,
    webhookUrl: sessionInDB?.webhookUrl || null,
  };

  const sock = makeWASocket({ auth: state });
  sessions[sessionId].sock = sock;

  // Atualiza no banco sem perder webhookUrl
  await saveSessionToDB(sessionId, {
    name: name || sessionInDB?.name || null,
    qrCode: null,
    webhookUrl: sessionInDB?.webhookUrl || null,
    connected: false,
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      sessions[sessionId].qrCode = qr;
      await saveSessionToDB(sessionId, { qrCode: qr, connected: false });
    }

    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode;
      if (reason === DisconnectReason.loggedOut) {
        console.log(`❌ Sessão ${sessionId} encerrada`);
        delete sessions[sessionId];
        await deleteSessionFromDB(sessionId);
      } else {
        console.log(`🔄 Reconectando sessão ${sessionId}...`);
        await startSession(sessionId, name);
      }
    } else if (connection === "open") {
      console.log(`✅ Sessão ${sessionId} conectada!`);
      sessions[sessionId].qrCode = null;
      await saveSessionToDB(sessionId, { qrCode: null, connected: true });
    }
  });

  sock.ev.on("messages.upsert", async (msg) => {
    const mensagem = msg.messages[0];
    if (!mensagem.message || mensagem.key.fromMe) return;

    const remetente = mensagem.key.remoteJid;
    const texto =
      mensagem.message.conversation ||
      mensagem.message.extendedTextMessage?.text ||
      mensagem.message.imageMessage?.caption ||
      null;

    const pushName = mensagem.pushName || "Desconhecido";
    const timestamp = mensagem.messageTimestamp;
    const messageId = mensagem.key.id;
    const tipoMensagem = Object.keys(mensagem.message)[0];

    const dadosMensagem = {
      sessionId,
      messageId,
      from: remetente,
      fromUser: jidDecode(remetente)?.user || remetente.split("@")[0],
      name: pushName,
      text: texto,
      type: tipoMensagem,
      timestamp: timestamp,
    };

    console.log("📩 Mensagem recebida:", dadosMensagem);

    const webhookUrl = sessions[sessionId].webhookUrl;
    if (webhookUrl) {
      try {
        await axios.post(webhookUrl, dadosMensagem);
        console.log(`✅ Enviado para webhook ${webhookUrl}`);
      } catch (error) {
        console.error(
          `❌ Erro enviando webhook para ${webhookUrl}`,
          error.message
        );
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);
}

// Carrega sessões salvas no banco ao iniciar o servidor
async function loadSessionsOnStartup() {
  const savedSessions = await prisma.session.findMany();

  for (const session of savedSessions) {
    if (session.connected) {
      try {
        await startSession(session.id, session.name);
        sessions[session.id].webhookUrl = session.webhookUrl || null;
      } catch (err) {
        console.error(`Erro ao carregar sessão ${session.id}`, err);
      }
    }
  }
}
loadSessionsOnStartup();

app.post("/session", async (req, res) => {
  const sessionId = crypto.randomUUID();
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: "O campo 'name' é obrigatório" });
  }

  try {
    await startSession(sessionId, name);

    res.json({
      sessionId,
      name,
      message: "Sessão criada e iniciada com sucesso!",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao iniciar a sessão" });
  }
});

app.get("/qr/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  const session = sessions[sessionId];

  if (!session) return res.status(404).json({ error: "Sessão não encontrada" });

  if (!session.qrCode)
    return res
      .status(400)
      .json({ error: "QR Code não disponível ou sessão já conectada" });

  try {
    const qrDataUrl = await qrcode.toDataURL(session.qrCode);
    res.json({ qr: qrDataUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao gerar QR Code" });
  }
});

app.post("/send", async (req, res) => {
  const { sessionId, to, message } = req.body;

  if (!sessionId || !to || !message) {
    return res.status(400).json({ error: "Informe sessionId, to e message" });
  }

  const session = sessions[sessionId];
  if (!session) return res.status(404).json({ error: "Sessão não encontrada" });

  try {
    await session.sock.sendMessage(`${to}@s.whatsapp.net`, { text: message });
    res.json({ success: true, to, message });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao enviar mensagem" });
  }
});

app.post("/set-webhook", async (req, res) => {
  const { sessionId, webhookUrl } = req.body;
  if (!sessionId || !webhookUrl) {
    return res.status(400).json({ error: "Informe sessionId e webhookUrl" });
  }

  const session = sessions[sessionId];
  if (!session) return res.status(404).json({ error: "Sessão não encontrada" });

  session.webhookUrl = webhookUrl;

  await saveSessionToDB(sessionId, { webhookUrl });

  res.json({ message: `Webhook definido para sessão ${sessionId}` });
});

app.delete("/session/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  const session = sessions[sessionId];

  if (!session) return res.status(404).json({ error: "Sessão não encontrada" });

  try {
    await session.sock.logout();
    delete sessions[sessionId];
    await deleteSessionFromDB(sessionId);

    res.json({ message: `Sessão ${sessionId} desconectada com sucesso` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao desconectar sessão" });
  }
});

app.post("/session/:sessionId/refresh-qr", async (req, res) => {
  const { sessionId } = req.params;
  const session = sessions[sessionId];

  if (!session) return res.status(404).json({ error: "Sessão não encontrada" });

  try {
    await session.sock.logout();

    await startSession(sessionId);

    res.json({
      message: `Sessão ${sessionId} reiniciada. Novo QR code gerado.`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao reiniciar sessão" });
  }
});

app.get("/sessions", async (req, res) => {
  const allSessions = await prisma.session.findMany();

  const lista = allSessions.map((s) => ({
    sessionId: s.id,
    name: s.name,
    connected: s.connected,
    webhookUrl: s.webhookUrl,
  }));

  res.json(lista);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
