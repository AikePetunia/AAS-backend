import { Scraper } from "./coreScrapper.mjs";
import { siteConfigs } from "./constPages.mjs";
import { writeStoresDump } from "./output/writeStoresDump.mjs";
import fs from "fs/promises";

async function main() {
	const resPerStore = {};
	const resAllProducts = {};
	const setLimit = -1;
	await writeStoresDump();
	try {
		for (const [siteName, config] of Object.entries(siteConfigs)) {
			if (setLimit != -1 && Object.keys(resPerStore).length >= setLimit) {
				console.log(`Reached the limit of ${setLimit} sites. Stopping further scraping.`);
				break;
			}
			console.log(`Starting scrape of ${siteName}...`);

			const scraper = new Scraper(config);
			const products = await scraper.scrapeProducts();

			resPerStore[siteName] = {
				store_name: config.store_name,
				store_id: config.store_id,
				store_url: config.store_url,
				store_image: config.store_image,
				trust_factor_manual: config.trust_factor_manual,
				seller_type: config.seller_type,
				tags: config.tags,
				products: products,
			};

			resAllProducts[siteName] = products;

			await fs.writeFile(
				`./data/raw/${siteName}.json`,
				JSON.stringify(resPerStore[siteName], null, 2)
			);

			console.log(`Finished scraping ${siteName}. Results saved to ${siteName}.json`);
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
