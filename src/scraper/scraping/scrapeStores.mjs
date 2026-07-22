import pLimit from "p-limit";
import { scrapeStore } from "./scrapeStore.mjs";
import { storesInformation } from "../config/storesInformation.mjs";
import fs from "fs/promises";
import { all } from "axios";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { Meilisearch } from "meilisearch";

dotenv.config();



const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const meilisearch = new Meilisearch({
	host: process.env.MEILISEARCH_URL,
	apiKey: process.env.MEILISEARCH_ADMIN_API_KEY,
});
// ¿Como soluciono los 429?
const limit = pLimit(5);
const storesEntries = Object.entries(storesInformation); // esto es el nombre de la tienda en su config (armyTech: new SiteConfig)
const allProducts = [];
const storeRuns = [];
const storeToTest = null; // it's by entry name. Use null for ignoring
const storeAmountToTest = 999;
const storePagesToTest = 999;
const failedStores = [];
let i = 0; 
const globalSeen = new Set();

// entra tienda por tienda, y dentro de cada tienda entra categoría por categoría
export async function scrapeStores() {
	for (const [storeName, config] of storesEntries) {
		if (i >= storeAmountToTest) break;
		if (storeToTest && storeName !== storeToTest) {
			continue;
		}

		const storeTasks = [];
		const storeToAccess = config.store_url;
		const runId = Date.now();
		let j = 0;

		storeRuns.push({ store_id: config.store_id, run_id: runId });

		for (const categoryPath of config.pages) {
			// testeo rutas
			if (j >= storePagesToTest) break;

			const fullCategoryUrl = storeToAccess + categoryPath;
			storeTasks.push(limit(() => scrapeStore(fullCategoryUrl, config, globalSeen, runId)));
			j++;
		}

		// escribimos resultados por tienda
		let storeResults = await Promise.all(storeTasks);
		const storeProducts = storeResults.flat();
		if (storeProducts.length != 0) {
			await fs.writeFile(
				`./data/raw/latest/${storeName}.json`,
				JSON.stringify(storeProducts, null, 2)
			);
		} else {
			failedStores.push(storeName);
			await fs.writeFile(`./data/failedStores.json`, JSON.stringify(failedStores, null, 2));
		}

		allProducts.push(...storeProducts);
		i++;
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

	const { data: dbProducts, error } = await supabase.from("products").upsert(allProducts).select();
	console.log("data", dbProducts.length);
	console.log("indexing to meilisearch...");
	const index = meilisearch.index("dbProducts");
	const task = await index.addDocuments(dbProducts, { primaryKey: "listing_id" });
	await meilisearch.tasks.waitForTask(task, { timeOutMs: 120000 });

	console.log("succesfully index to meilisearch");

	if (error) {
		console.error(error);
		throw new Error("Fallo el upsert en la DB");
	}
	console.log("inserted to db");
	console.log("updating missing counters...");
	for (const run of storeRuns) {
		const { error: rpcError } = await supabase.rpc("increment_missingv2", {
			p_store_id: run.store_id,
			p_current_run_id: run.run_id,
		});

		if (rpcError) {
			console.error(`Error incrementando missing para tienda ${run.store_id}:`, rpcError);
		}
		console.log("missing counters updated");
	}

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

	await fs.writeFile(`./data/raw/latest/allProducts.json`, JSON.stringify(allProducts, null, 2));
}
await scrapeStores();