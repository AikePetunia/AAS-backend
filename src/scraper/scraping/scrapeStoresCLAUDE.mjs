import pLimit from "p-limit";
import { cheerioAxiosScraping } from "./cheerioAxiosScraping.mjs";
import { fetchScraping } from "./fetchScraping.mjs";
import { storesInformation } from "../config/storesInformationCLAUDE.mjs";
import fs from "fs/promises";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { Meilisearch } from "meilisearch";
import { PlaywrightScraping } from "./playwrightScraping.mjs";

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const meilisearch = new Meilisearch({
	host: process.env.MEILISEARCH_URL,
	apiKey: process.env.MEILISEARCH_ADMIN_API_KEY,
});

const limit = pLimit(5);
const storesEntries = Object.entries(storesInformation);
const allProducts = [];
const storeRuns = [];
const storeToTest = process.argv[2] || null; // node scrapeStoresCLAUDE.mjs <storeKey>
const storeAmountToTest = 999;
const storePagesToTest = 1;
const failedStores = [];
const globalSeen = new Set();
let i = 0;

export async function scrapeStores() {
	for (const [storeName, config] of storesEntries) {
		if (i >= storeAmountToTest) break;
		if (storeToTest && storeName !== storeToTest) {
			continue;
		}
		const runId = Date.now();
		const storeTasks = [];
		if (config.public_fetching_url) {
			console.log("tienda con public fetching", config.store_name);
			storeTasks.push(limit(() => fetchScraping(config, runId)));
		} else {
			const storeToAccess = config.store_url;
			let j = 0;
			storeRuns.push({ store_id: config.store_id, run_id: runId });
			for (const categoryPath of config.pages) {
				if (j >= storePagesToTest) break;
				let fullCategoryUrl = storeToAccess + categoryPath;
				storeTasks.push(
					limit(() => cheerioAxiosScraping(fullCategoryUrl, config, globalSeen, runId))
				);
				j++;
			}
		}
		let storeResults = await Promise.all(storeTasks);
		let storeProducts = storeResults.flat();

		if (storeProducts.length === 0 && !config.public_fetching_url) {
			console.log("Cheerio no trajo nada, pruebo Playwright con", storeName);
			const scraper = new PlaywrightScraping(config);
			storeProducts = await scraper.scrapeProducts();
		}

		if (storeProducts.length != 0) {
			await fs.writeFile(`./data/raw/${storeName}.json`, JSON.stringify(storeProducts, null, 2));
		} else {
			failedStores.push(storeName);
			await fs.writeFile(`./data/failedStores.json`, JSON.stringify(failedStores, null, 2));
		}

		allProducts.push(...storeProducts);
		i++;
	}

	if (allProducts.length === 0) {
		console.log("No se extrajo ningun producto, no se toca la DB.");
		return;
	}

	const { data, error } = await supabase.from("products").upsert(allProducts).select();
	if (error) {
		console.error("Error upsert:", error);
	}

	await index_products();
	await increment_missing();
	await purge_products();

	await fs.writeFile(`./data/raw/allProducts.json`, JSON.stringify(allProducts, null, 2));
}

await scrapeStores();

async function index_products() {
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

	const enqueuedTask = await index.addDocuments(productsForMeili, { primaryKey: "listing_id" });
	const finishedTask = await meilisearch.tasks.waitForTask(enqueuedTask.taskUid, {
		timeOutMs: 120000,
	});

	if (finishedTask.status !== "succeeded") {
		console.error("Meilisearch task failed:", finishedTask.error);
		throw new Error("Fallo la indexacion en Meilisearch");
	}
	console.log(
		`indexado ${finishedTask.detail?.receivedDocuments} docs, indexados: ${finishedTask.details?.indexedDocuments}`
	);
}

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
