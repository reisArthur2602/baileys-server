import "dotenv/config";

import express from "express";
import cors from "cors";
import "express-async-errors";
import { sessionRoutes } from "./routes/session.route.js";
import { loadSessionsOnStartup } from "./services/session.service.js";
import { errorsMiddleware } from "./middlewares/errors.midleware.js";

const PORT = Number(process.env.PORT) || 3031;

const app = express();

app.use(cors());
app.use(express.json());
app.use("/session", sessionRoutes);
app.use(errorsMiddleware);

app.listen(PORT, async () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  await loadSessionsOnStartup();
});
