import { storesInformation } from "../config/storesInformation.mjs";
import fs from "fs/promises";

export async function storesDump() {
	console.log("Writing all stores info to dump...");
	let stores = [];
	try {
		for (const [siteKey, config] of Object.entries(storesInformation)) {
	let store = {};
	store = {
		store_name: config.store_name,
		store_id: config.store_id,
		store_url: config.store_url,
		store_image: config.store_image,
		trust_factor_manual: config.trust_factor_manual,
		seller_type: config.seller_type,
		tags: config.tags,
	};
			stores.push(store);
		}
		await fs.writeFile(`./data/dumps/storesDump.json`, JSON.stringify(stores, null, 2));
	} catch (e) {
		console.log("Error writing stores dump:", e);
	}
}
