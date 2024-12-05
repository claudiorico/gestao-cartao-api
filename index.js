import express from 'express';
import route from './Routers/routers.js';
import cors from 'cors';
import bodyParser from "body-parser";
import { configDotenv } from 'dotenv';
import swaggerUi from "swagger-ui-express";
import swaggerDocument from "./swagger.json" assert { type: 'json' };
import fs from "fs";

const app = express();
const port = process.env.PORT || 3080;
configDotenv();

const customCss = fs.readFileSync(process.cwd() + "/swagger.css", "utf8");
console.log(customCss);

// Lista de origens permitidas
const allowedOrigins = ["http://localhost:3080","http://localhost:5173"];

// Configuração do CORS
const corsOptions = {
  origin: (origin, callback) => {
    // Verifica se a origem está na lista ou permite se for undefined (como em clientes locais)
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Não permitido pelo CORS'));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE"] // Métodos permitidos
};

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument, { customCss })
);

app.use("/Cart", route);

app.listen(port, () => {
    console.log(`Servidor escutando a porta::::::${port}`);
});