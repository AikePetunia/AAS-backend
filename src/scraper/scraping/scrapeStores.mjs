import pLimit from "p-limit";
import { cheerioAxiosScraping } from "./cheerioAxiosScraping.mjs";
import { fetchScraping } from "./fetchScraping.mjs";
import { storesInformation } from "../config/storesInformation.mjs";
import fs from "fs/promises";
import { all } from "axios";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { meilisearchConfig } from "../config/meilisearchConfig.mjs";
import { PlaywrightScraping } from "./playwrightScraping.mjs";
import { Meilisearch } from "meilisearch";

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
	connectTimeout: 30000,
	headersTimeout: 30000,
	bodyTimeout: 30000,
});
const meilisearch = new Meilisearch({
	host: process.env.MEILISEARCH_URL,
	apiKey: process.env.MEILISEARCH_ADMIN_API_KEY,
});

async function loadFailedStores() {
	try {
		const content = await fs.readFile("./data/failedStores.json", "utf-8");
		return JSON.parse(content);
	} catch (error) {
		console.log("failed to load failed stores", error);
		return [];
	}
}

const limit = pLimit(5);
const storesEntries = Object.entries(storesInformation); // esto es el nombre de la tienda en su config (armyTech: new SiteConfig)
const allProducts = [];
const storeRuns = [];
const storeToTest = "compragamer"; // it's by entry name. Use null for ignoring
const storeAmountToTest = 1;
const storePagesToTest = 1;
const failedStores = await loadFailedStores();
const globalSeen = new Set();
let i = 0;

// entra tienda por tienda, y dentro de cada tienda entra categoría por categoría
export async function scrapeStores() {
	for (const [storeName, config] of storesEntries) {
		if (i >= storeAmountToTest) break;
		if (storeToTest && storeName !== storeToTest) continue;

		const runId = Date.now();
		let storeProducts = [];
		const storeTasks = [];

		// ! Solo axios interceptando un fetch.
		if (config.public_fetching_url) {
			console.log("tienda con public fetching", storeName);
			storeTasks.push(limit(() => fetchScraping(config, runId)));
		} else {
			console.log("cheerio + axios con", storeName);
			const storeToAccess = config.store_url;
			let j = 0;

			storeRuns.push({ store_id: config.store_id, run_id: runId });

				j++;
			for (const categoryPath of config.pages) {
				// testeo rutas
				if (j >= storePagesToTest) break;

				let fullCategoryUrl = storeToAccess + categoryPath;
				storeTasks.push(
					limit(() => cheerioAxiosScraping(fullCategoryUrl, config, globalSeen, runId))
				);
				j++;
			}
		}

		// escribimos resultados por tienda
		let storeResults = await Promise.all(storeTasks);
		storeProducts = storeResults.flat();

		if (
			storeProducts.length != 0 &&
			!config.public_fetching_url &&
			!failedStores.includes(storeName)
		) {
			console.log("Cheerio no trajo nada, pruebo Playwright con", storeName);
			const scraper = new PlaywrightScraping(config, runId, globalSeen);
			storeProducts = await scraper.scrapeProducts();
		}

		if (storeProducts.length != 0) {
			await fs.writeFile(`./data/raw/${storeName}.json`, JSON.stringify(storeProducts, null, 2));
		} else {
			if (!failedStores.includes(storeName)) {
				failedStores.push(storeName);
				await fs.writeFile(`./data/failedStores.json`, JSON.stringify(failedStores, null, 2));
			}
		}

		allProducts.push(...storeProducts);
		await fs.writeFile(`./data/raw/allProducts.json`, JSON.stringify(allProducts, null, 2));
		i++;
	}

	// inserto datos a supabase y indexo en meilisearch.
	const uniqueProductsByListingId = [
		...new Map(allProducts.map((product) => [product.listing_id, product])).values(),
	];
	const { data, error } = await supabase
		.from("products")
		.upsert(uniqueProductsByListingId)
		.select();
	if (error) throw error;

	await index_products();
	await increment_missing();
	await purge_products();
}

await scrapeStores();

async function index_products() {
	// hago products + datos stores, para darselos al indice de meilisearch
	const { data: dbProducts, error: error } = await supabase
		.from("products")
		.select(`*, stores!fk_store ( trust_factor )`);
	if (error) throw error;

	const productsForMeili = dbProducts.map((product) => ({
		...product,
		trust_factor: product.stores?.trust_factor,
	}));

	console.log("indexing to meilisearch...");
	const index = meilisearch.index("products");
	await meilisearchConfig(index, meilisearch);

	const enqueuedTask = await index.addDocuments(productsForMeili, { primaryKey: "listing_id" });
	const finishedTask = await meilisearch.tasks.waitForTask(enqueuedTask.taskUid, {
		timeOutMs: 120000,
	});

	if (finishedTask.status !== "succeeded") {
		console.error("Meilisearch task failed:", finishedTask.error);
		throw new Error("Fallo la indexacion en Meilisearch");
	}

	if (error) {
		console.error(error);
		throw new Error("Fallo el upsert en la DB");
	}
	console.log("inserted to db");
}

/*
	Por tienda, tiene un "id de sesion", si en esa sesion, un producto no volvio a aparecer, incrementa missing.

	->Criterios para desaparecer del front un producto:
	last_scraped_at > 1 día y missing > 5..
	Esto hace que un producto no este más en stock.

	->Criterio para sacar un producto de la DB
	como no cago plata para mantener un DB cara xd, voy a tomar de criterio.
	last_scraped_at > 7 día
	missing > 30.
	*/

async function increment_missing() {
	console.log("updating missing counters...");
	for (const run of storeRuns) {
		const { error: rpcError } = await supabase.rpc("increment_missingv2", {
			p_store_id: run.store_id,
			p_current_run_id: run.run_id,
		});

		if (rpcError) {
			console.error(`Error incrementando missing para tienda ${run.store_id}:`, rpcError);
		}
	}
	console.log("missing counters updated");
}

async function purge_products() {
	try {
		console.log("trying to delete old products...");
		const { data, error } = await supabase.rpc("purge_products", {
			p_days_old: 7,
			p_missing_min: 30,
		});
		console.log(`deleted ${data} products`);
	} catch (e) {
		console.log("error deleting product.");
	}
}

