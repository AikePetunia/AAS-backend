import express from "express";
import dotenv from "dotenv";
import { createServer } from "node:http";
import { createClient } from "@supabase/supabase-js";
import { corsMiddleware } from "./middlewares/cors.mjs";

// Front-end -> Express -> Guarda en Supabase -> copia a Meilisearch.

dotenv.config();
const app = express();
const server = createServer(app);
const ALLOWED_ORIGINS = ["http://localhost:5173"];

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);


app.use(json());
app.disable("x-powered-by");

app.use(
    corsMiddleware({acceptedOrigins = ALLOWED_ORIGINS})
);

app.use('/stores', createStoreRouter())

server.listen(process.env.PORT, () => {
	console.log(`server open on http://localhost:${process.env.PORT}`);
});

