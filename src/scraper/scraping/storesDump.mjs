import { storesInformation } from "../config/storesInformation.mjs";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs/promises";
import { Meilisearch } from "meilisearch";

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const meilisearch = new Meilisearch({
	host: process.env.MEILISEARCH_URL,
	apiKey: process.env.MEILISEARCH_ADMIN_API_KEY,
});

export async function storesDump() {
	console.log("Writing all stores info to dump...");
	let stores = [];
	try {
		for (const [siteKey, config] of Object.entries(storesInformation)) {
			let store = {};
			store = {
				store_id: config.store_id,
				store_name: config.store_name,
				store_url: config.store_url,
				trust_factor: config.trust_factor,
				store_role: config.store_role,
				tags: config.tags,
				created_at: new Date().toISOString(),
			};
			stores.push(store);
		}

		console.log("saving to DB");
		const { data: dbStores, error } = await supabase.from("stores").upsert(stores).select();

		if (error) {
			// throw error;
		}
		console.log("Inserted to DB");

		console.log("indexing on meilisearch...");
		const index = meilisearch.index("stores");
		const task = await index.addDocuments(dbStores, { primaryKey: "store_id" });
		await meilisearch.tasks.waitForTask(task, { timeOutMs: 120000 });

		console.log("saving local..");
		await fs.writeFile(`./data/dumps/storesDump.json`, JSON.stringify(stores, null, 2));
		console.log("json saved.");

	} catch (e) {
		console.log("Error writing stores dump:", e);
	}
}

await storesDump();
