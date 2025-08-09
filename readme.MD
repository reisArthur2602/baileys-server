# 📱 WhatsApp API v1 - Baileys

<h1 align="center" style="font-weight: bold;">WhatsApp API v1 🚀</h1>

<p align="center">
  <a href="#tech">Tecnologias</a> •
  <a href="#started">Primeiros passos</a> •
  <a href="#session-routes">Session Endpoints</a> •
  <a href="#message-routes">Message Endpoints</a> •
  <a href="#webhook-routes">Webhook Endpoints</a>
</p>

---

## 💻 Tecnologias

- Node.js
- Express
- @whiskeysockets/baileys
- qrcode
- axios

---

## 🚀 Primeiros Passos

### Pré-requisitos

- [Node.js](https://nodejs.org/pt)
- [Git](https://git-scm.com/)

### Instalação

```bash
npm init -y
npm install express @whiskeysockets/baileys qrcode axios
```

### Iniciar o servidor

```bash
npm run dev
```

---

## 📍 Endpoints

| Rota                                  | Descrição                                 |
| ------------------------------------- | ----------------------------------------- |
| `POST /session`                       | Iniciar uma nova sessão                   |
| `GET /qr/:sessionId`                  | Obter QR code para autenticação           |
| `DELETE /session/:sessionId`          | Encerrar uma sessão                       |
| `POST /session/:sessionId/refresh-qr` | Gerar novo QR code                        |
| `POST /send`                          | Enviar mensagem                           |
| `POST /set-webhook`                   | Configurar webhook para receber mensagens |

### POST /session

**Request:**

```json
{
  "sessionId": "minha-sessao-123"
}
```

**Response:**

```json
{
  "message": "Sessão minha-sessao-123 iniciada. Escaneie o QR code via /qr/minha-sessao-123"
}
```

---

### GET /qr/:sessionId

**Response:**

```json
{
  "qr": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

---

### DELETE /session/:sessionId

**Response:**

```json
{
  "message": "Sessão minha-sessao-123 desconectada com sucesso"
}
```

---

### POST /session/:sessionId/refresh-qr

**Response:**

```json
{
  "message": "Sessão minha-sessao-123 reiniciada. Novo QR code gerado."
}
```

---

### POST /send

**Request:**

```json
{
  "sessionId": "minha-sessao-123",
  "to": "5511999999999",
  "message": "Olá, isso é um teste!"
}
```

**Response:**

```json
{
  "success": true,
  "to": "5511999999999",
  "message": "Olá, isso é um teste!"
}
```

### POST /set-webhook

**Request:**

```json
{
  "sessionId": "minha-sessao-123",
  "webhookUrl": "https://meu-webhook.com/receber-mensagens"
}
```

**Response:**

```json
{
  "message": "Webhook definido para sessão minha-sessao-123"
}
```

---

### Estrutura do Webhook

Quando configurado, o webhook receberá mensagens no seguinte formato:

```json
{
  "sessionId": "minha-sessao-123",
  "messageId": "3EB0C1D95A5B8",
  "from": "5521975140550@s.whatsapp.net",
  "fromUser": "5521975140550",
  "name": "Arthur",
  "text": "Olá, como vai?",
  "type": "conversation",
  "timestamp": 1634567890
}
```

---

⚠️ **Observações Importantes**

- As sessões são armazenadas na pasta `./sessions/`
- Mantenha o `sessionId` consistente para reutilizar a mesma sessão
- Mensagens só serão enviadas/recebidas após a sessão estar autenticada
