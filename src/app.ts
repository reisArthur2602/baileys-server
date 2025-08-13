import "dotenv/config";

import express from "express";
import cors from "cors";
import "express-async-errors";
import { sessionRoutes } from "./routes/session.route.js";
import { loadSessionsOnStartup } from "./services/session.service.js";
import { errorsMiddleware } from "./middlewares/errors.midleware.js";

const PORT = process.env.PORT || 3000;

const app = express();

app.use(cors());
app.use(express.json());

app.use("/", sessionRoutes);

app.use(errorsMiddleware);

app.get("/file/:id", (req, res) => {
  const messageId = req.params.id;


  const originalUrl = req.query.url as string;

  if (!originalUrl) return res.status(400).send("URL não informada");


  res.redirect(originalUrl);
});








app.listen(PORT, async () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  await loadSessionsOnStartup();
});
