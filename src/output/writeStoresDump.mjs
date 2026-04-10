import { siteConfigs } from "../constPages.mjs";
import fs from "fs/promises";

export async function writeStoresDump() {
	console.log("Writing all stores info to dump...");
	const stores = {};
	try {
		for (const [siteKey, config] of Object.entries(siteConfigs)) {
			stores = {
				store_name: config.store_name,
				store_id: config.store_id,
				store_url: config.store_url,
				store_image: config.store_image,
				trust_factor_manual: config.trust_factor_manual,
				seller_type: config.seller_type,
				tags: config.tags,
				
			};
		}
		await fs.writeFile(`./data/dumps/storesDump.json`, JSON.stringify({stores}, null, 2));
	} catch (e) {
		console.log("Error writing stores dump:", e);
	}
}
