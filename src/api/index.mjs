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
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../../.env") });

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
app.disable("x-powered-by");

app.use(
	corsMiddleware({
		acceptedOrigins: [
			"http://localhost:8080",
			"http://localhost:3000",
			"http://localhost:5173",
			"http://localhost:1234",
		],
	})
);

app.use("/stores", createStoreRouter({ supabase }));
app.use("/stores/:id", createStoreRouter({ supabase }));

app.use("/products", createProductRouter({ meilisearch }));

server.listen(port, () => {
	console.log(`server open on http://localhost:${port}`);
});
