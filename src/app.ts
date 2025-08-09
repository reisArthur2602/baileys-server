import express from "express";
import cors from "cors";
import sessionRoutes from "./routes/session.routes.js";
import { loadSessionsOnStartup } from "./services/session.service.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/", sessionRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, async() => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
   await loadSessionsOnStartup();
});
