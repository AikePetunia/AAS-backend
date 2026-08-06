import express from "express";
import { createServer } from "node:http";
import { corsMiddleware } from "./middlewares/cors.mjs";
import { createClient } from "@supabase/supabase-js";
import { createStoreRouter } from "./router/store.mjs";
import { createProductRouter } from "./router/product.mjs";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Meilisearch } from "meilisearch";
import { limiter } from "./middlewares/rate-limit.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../../.env") });
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS;
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
// Front-end -> Express -> Guarda en supabase -> copia a Meilisearch.
const meilisearch = new Meilisearch({
	host: process.env.MEILISEARCH_URL,
	apiKey: process.env.MEILISEARCH_ADMIN_API_KEY,
});

const app = express();
const server = createServer(app);
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(limiter);
app.disable("x-powered-by");

app.use(
	corsMiddleware({
		acceptedOrigins: ALLOWED_ORIGINS,
	})
);

app.use("/stores", createStoreRouter({ supabase }));

app.use("/products", createProductRouter({ meilisearch }));

server.listen(port, () => {
	console.log(`server open on http://localhost:${port}`);
});
