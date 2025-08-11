### Pré-requisitos

- [Node.js](https://nodejs.org/pt)
- [Git](https://git-scm.com/)

### Instalação

```bash
npm init -y
npm install
```

### Iniciar o servidor

```bash
npm run dev
```

## 📍 Endpoints

| Rota                                  | Descrição                                 |
| ------------------------------------- | ----------------------------------------- |
| `POST /session`                       | Iniciar uma nova sessão                   |
| `GET /qr/:sessionId`                  | Obter QR code para autenticação           |
| `DELETE /session/:sessionId`          | Encerrar uma sessão                       |
| `POST /session/:sessionId/refresh-qr` | Gerar novo QR code                        |
| `PATCH /session/:sessionId/logout`    | Realizar logout da sessão                 |
| `POST /send`                          | Enviar mensagem                           |
| `POST /set-webhook`                   | Configurar webhook para receber mensagens |

### POST /session

**Request:**

```json
body: {
  "name": "minha-sessao"
}
```

**Response: 201 Created**

### GET /qr/:sessionId

**Request:**

```json
params: {
  "sessionId": "minha-sessao"
}
```

### DELETE /session/:sessionId

**Request:**

```json
params: {
  "sessionId": "minha-sessao"
}
```

**Response: 200 OK**

### POST /session/:sessionId/refresh-qr

**Request:**

```json
params: {
  "sessionId": "minha-sessao"
}
```

**Response: 200 OK**

### POST /send

**Request:**

```json
{
  "sessionId": "minha-sessao",
  "to": "5511999999999",
  "message": "Olá, isso é um teste!"
}
```

**Response: : 200 OK**

### POST /set-webhook

**Request:**

```json
body:{
  "sessionId": "minha-sessao",
  "webhookUrl": "https://meu-webhook.com/receber-mensagens"
}
```

**Response: 200 OK**

### Estrutura do Webhook

Quando configurado, o webhook receberá mensagens no seguinte formato:

**Mensagem de texto:**

```json
{
  "sessionId": "minha-sessao-123",
  "messageId": "3EB0C1D95A5B8",
  "from": "5521975140550@s.whatsapp.net",
  "fromUser": "5521975140550",
  "name": "Arthur",
  "text": "Olá, como vai?",
  "type": "conversation",
  "isForwarded": false,
  "timestamp": "Mon Aug 11 2025 11:16:42 GMT-0300 (Brasilia Standard Time)"
}
```

**Imagem:**

```json
{
  "sessionId": "minha-sessao",
  "messageId": "3EB0C1D95A5B8",
  "from": "5521975140550@s.whatsapp.net",
  "fromUser": "5521975140550",
  "name": "Arthur",
  "text": "",
  "type": "imageMessage",
  "isForwarded": false,
  "timestamp": "Mon Aug 11 2025 11:16:42 GMT-0300 (Brasilia Standard Time)",
  "image": {
    "url": "https://example.com/image.jpg",
    "mimetype": "image/jpeg",
    "size": 102400,
    "caption": "Foto da reunião"
  }
}
```

**Localização:**

```json
{
  "sessionId": "minha-sessao",
  "messageId": "3EB0C1D95A5B8",
  "from": "5521975140550@s.whatsapp.net",
  "fromUser": "5521975140550",
  "name": "Arthur",
  "text": "",
  "type": "locationMessage",
  "isForwarded": false,
  "timestamp": "Mon Aug 11 2025 11:16:42 GMT-0300 (Brasilia Standard Time)",
  "location": {
    "latitude": -23.55052,
    "longitude": -46.633308,
    "name": "São Gonçalo",
    "address": "Rua Laureano Rosa",
    "mode": "manual"
  }
}
```

⚠️ **Observações Importantes**

- As sessões são armazenadas na pasta `./sessions/`
- Mantenha o `sessionId` consistente para reutilizar a mesma sessão
