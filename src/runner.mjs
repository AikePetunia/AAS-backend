import { Scraper } from "./coreScrapper.mjs";
import { siteConfigs } from "./constPages.mjs";
import { writeStoresDump } from "./output/writeStoresDump.mjs";
import fs from "fs/promises";

async function main() {
    const resPerStore = {};
		const resAllProducts = {};
		const setLimit = -1; // -1 no limit
		const MAX_CONCURRENT_STORES = 6;

		await writeStoresDump();

    try {
			const storeEntries = Object.entries(siteConfigs);
			for (let i = 0; i < storeEntries.length; i += MAX_CONCURRENT_STORES) {
				if (setLimit != -1 && Object.keys(resPerStore).length >= setLimit) {
					console.log(`Reached the limit of ${setLimit} sites. Stopping further scraping.`);
					break;
				}

				const batch = storeEntries.slice(i, i + MAX_CONCURRENT_STORES);
				const promises = batch.map(async ([siteName, config]) => {
					console.log(`Starting scrape of ${siteName}...`);

					const scraper = new Scraper(config);
					const products = await scraper.scrapeProducts();
					return { siteName, products, config };
				});

				const results = await Promise.all(promises);

				for (const result of results) {
					resPerStore[result.siteName] = {
						store_name: result.config.store_name,
						store_id: result.config.store_id,
						store_url: result.config.store_url,
						store_image: result.config.store_image,
						trust_factor_manual: result.config.trust_factor_manual,
						seller_type: result.config.seller_type,
						tags: result.config.tags,
						products: result.products,
					};

					resAllProducts[result.siteName] = result.products;

					await fs.writeFile(
						`./data/raw/${result.siteName}.json`,
						JSON.stringify(resPerStore[result.siteName], null, 2)
					);

					console.log(
						`Finished scraping ${result.siteName}. Results saved to ${result.siteName}.json`
					);
				}
			}

			await fs.writeFile(`./data/raw/allProducts.json`, JSON.stringify(resAllProducts, null, 2));

			console.log("finished scraping");
			process.exit(0);
		} catch (error) {
			console.error("Error during scraping:", error);
			process.exit(1);
		}
}

main();