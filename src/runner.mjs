import { Scraper } from "./coreScrapper.mjs";
import { siteConfigs } from "./constPages.mjs";
import { writeStoresDump } from "./output/writeStoresDump.mjs";
import fs from "fs/promises";

const ONE_HOUR_LOOP = 60 * 60 * 1000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
	while (true) {
		await runOnce();
		console.log(`Sleeping ${ONE_HOUR_LOOP / 1000}s...`);
		await sleep(ONE_HOUR_LOOP);
	}
}

async function runOnce() {
	const resPerStore = {};
	const storeToTest = null; // it's by entry name. Use null for ignoring
	const storePathLimitTest = 2;

	const resAllProducts = {};
	const storeLimitTest = -1; // -1 no limit
	const MAX_CONCURRENT_STORES = 3; // do not use more bc it goes boom
	const noProductsStores = [];

	await writeStoresDump();

	try {
		const storeEntries = Object.entries(siteConfigs);
		if (storeToTest) {
			const config = siteConfigs[storeToTest];
			console.log(`Testing single store: ${storeToTest}`);
			if (!config) {
				console.error(`Store with id "${storeToTest}" not found in siteConfigs.`);
				return;
			}
			await testStoreSelectors(
				storePathLimitTest,
				storeToTest,
				config,
				resPerStore,
				resAllProducts
			);
			return;
		}

		for (let i = 0; i < storeEntries.length; i += MAX_CONCURRENT_STORES) {
			if (storeLimitTest != -1 && Object.keys(resPerStore).length >= storeLimitTest) {
				console.log(`Reached the limit of ${storeLimitTest} sites. Stopping further scraping.`);
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

				if (resPerStore[result.siteName].products.length === 0) {
					noProductsStores.push(result.siteName);
				}

				await fs.writeFile(
					`./data/raw/${result.siteName}.json`,
					JSON.stringify(resPerStore[result.siteName], null, 2)
				);

				console.log(
					`Finished scraping ${result.siteName}. Results saved to ${result.siteName}.json`
				);

				await fs.writeFile(
					`./data/raw/latest/allProducts.json`,
					JSON.stringify(resAllProducts, null, 2)
				);

				await fs.writeFile(`./data/failedStores.json`, JSON.stringify(noProductsStores, null, 2));
			}
		}

		const snapshotTs = new Date().toISOString().replace(/[:.]/g, "-");
		await fs.writeFile(
			`./data/snapshots/allProducts-${snapshotTs}.json`,
			JSON.stringify(resAllProducts, null, 2)
		);

		console.log("finished scraping");
		process.exit(0);
	} catch (error) {
		console.error("Error during scraping:", error);
		process.exit(1);
	}
}

async function testStoreSelectors(
	storePathLimitTest,
	storeToTest,
	config,
	resPerStore,
	resAllProducts
) {
	console.log(`Testing scrape of ${storeToTest}...`);

	const scraper = new Scraper(config);
	const products = await scraper.scrapeProducts(storePathLimitTest);

	resPerStore[storeToTest] = {
		store_name: config.store_name,
		store_id: config.store_id,
		store_url: config.store_url,
		store_image: config.store_image,
		trust_factor_manual: config.trust_factor_manual,
		seller_type: config.seller_type,
		tags: config.tags,
		products,
	};

	resAllProducts[storeToTest] = products;

	await fs.writeFile(
		`./data/tests/${storeToTest}-testing.json`,
		JSON.stringify(resPerStore[storeToTest], null, 2)
	);

	console.log(
		`Finished "testing" selectors for ${storeToTest}. Results saved to ${storeToTest}.json`
	);
	return;
}

main();
