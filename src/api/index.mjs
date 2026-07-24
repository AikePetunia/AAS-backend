import express from "express";
import { createServer } from "node:http";
import { createClient } from "@supabase/supabase-js";
import { corsMiddleware } from "./middlewares/cors.mjs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { Meilisearch } from "meilisearch";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../../.env") });

// Front-end -> Express -> Guarda en Supabase -> copia a Meilisearch.
export const meilisearch = new Meilisearch({
	host: process.env.MEILISEARCH_URL,
	apiKey: process.env.MEILISEARCH_ADMIN_API_KEY,
});

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const app = express();
const server = createServer(app);

const port = process.env.PORT || 3000;
app.use(express.json());
app.disable("x-powered-by");

app.use(
	corsMiddleware({
		acceptedOrigins: ["http://localhost:8080", "http://localhost:5173", "http://localhost:1234"],
	})
);

// ==========================
// STORES
// ==========================
// SEARCH
app.get("/stores", async (req, res) => {
	try {
		console.log("TRYING GETTING STORES");
		const userQ = req.query.q;

		const index = meilisearch.index("stores");
		const currentOffset = parseInt(req.query.offset) || 0;
		const searchResults = await index.search(userQ, {
			limit: 999,
			attributesToRetrieve: ["store_id", "store_name", "store_image", "trust_factor"],
			offset: currentOffset,
		});
		res.json(searchResults);
	} catch (e) {
		res.status(500).json({ error: "Error interno del servidor" });
	}
});

// Stores completo + Productos
// detalle de la tienda, contiene sus productos + paginado
//http://localhost:3000/stores/armytech?page=1 ... http://localhost:3000/stores/armytech?page=2
app.get("/stores/:id", async (req, res) => {
	try {
		const storeId = req.params.id;
		console.log("id leido", storeId);
		//paginado
		const page = parseInt(req.query.page) || 1;
		const limit = 10;
		const from = (page - 1) * limit;
		const to = from + limit - 1;

		//fecha para stock
		const dateLimit = new Date();
		dateLimit.setDate(dateLimit.getDate() - 3);
		const dateLimitIso = dateLimit.toISOString();

		// dame los datos completos de la tienda y sus productos relacionados.
		// limitado a 10 productos.
		const { data, error } = await supabase
			.from("stores")
			.select(
				`*,
                products (
                    listing_id,
                    product_url,
                    image_url,
                    title_raw,
                    last_price
                )
            `
			)
			.eq("store_id", storeId)
			.lt("products.missing", 5) // producto 5 veces que no se vio, "no existe".
			.gte("products.last_scraped_at", dateLimitIso)
			.range(from, to, { foreignTable: "products" })
			.single();

		if (error) throw error;
		res.json(data);
	} catch (e) {
		console.error("ERROR REAL DE SUPABASE:", e);
		res.status(500).json({ error: "error interno del servidor" });
	}
});

// ==========================
// Products
// ==========================

// SEARCH
//localhost:3000/products?q=${product}offset=${offset}
app.get("/products", async (req, res) => {
	try {
		console.log("TRYING GETTING products");
		const userQ = req.query.q;
		console.log("userq", userQ);
		const currentOffset = parseInt(req.query.offset) || 0;

		const index = meilisearch.index("products123");
		const searchResults = await index.search(userQ, {
			limit: 999,
			attributesToRetrieve: [
				"listing_id",
				"store_id",
				"trust_factor",
				"store_url",
				"product_url",
				"image_url",
				"title_raw",
				"last_price",
			],
			offset: currentOffset,
		});
		res.json(searchResults);
	} catch (e) {
		res.status(500).json({ error: "Error interno del servidor" });
	}
});

// Todo: complete product info.
// app.get("/products/:id")

server.listen(port, () => {
	console.log(`server open on http://localhost:${port}`);
});
