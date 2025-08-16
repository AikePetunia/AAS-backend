import { Scraper } from "./coreScrapper.mjs";
// import { siteConfigs } from "./constPages.mjs";
import { scrapeUnderTaker } from "./undertaker.mjs";
import fs from "fs/promises";
import { SiteConfig } from "./siteConfig.mjs";
import path from "path";
import { fileURLToPath } from "url";

// mjs works differently with paths than the common js
// The __filename basically points to the current file you're writing the code in while __dirname gives you the parent folder of that current file.
const __filename = fileURLToPath(import.meta.url);		// url of current module
const __dirname = path.dirname(__filename);				// directory of current module

async function loadSite() {
	try {
		const sitesPath = path.resolve(__dirname, "../filtering-ai/response/final_sites.json");
        
        const sitesData = await fs.readFile(sitesPath, "utf-8");
        const sitesArray = JSON.parse(sitesData);
		const siteConfigs = {}
		for (const site of sitesArray) {
			siteConfigs[site.pageName] = new SiteConfig({
				pageName: site.pageName,
				siteImage: '',
				baseUrl: site.baseUrl,
				isPcComponent: site.isPcComponent,
				isSetup: site.isSetup,
				paths: site.paths,
				elements: site.elements,
				pagination: site.pagination,
			})
		}

		return siteConfigs;
	} catch (error) {
   		console.error('Error loading sites from JSON:', error);
		return null;
	}
}

async function main() {
	const results = {};

	try {
			const loadedSite = await loadSite();
			if (loadedSite === null) {
				console.error(`Failed to load site configuration for ${loadedSite.pageName}`);
			}
			
		for (const [siteName, config] of Object.entries(loadedSite)) {
			const scraper = new Scraper(config);
			const products = await scraper.scrapeProducts();
			results[siteName] = products;

		}
		console.log("Starting scrape of Undertaker...");
		const underTakerProducts = await scrapeUnderTaker();
		results["undertaker"] = underTakerProducts;

		await fs.writeFile("products.json", JSON.stringify(results, null, 2));
		console.log("finished scraping");
		process.exit(0);
	} catch (error) {
		console.error("Error during scraping:", error);
		process.exit(1);
	}
}

main();


/*
async function main() {
	const results = {};

	try {
		for (const [siteName, config] of Object.entries(siteConfigs)) {
			console.log(`Starting scrape of ${siteName}...`);
			const scraper = new Scraper(config);
			const products = await scraper.scrapeProducts();
			results[siteName] = products;
		}

		console.log("Starting scrape of Undertaker...");
		const underTakerProducts = await scrapeUnderTaker();
		results["undertaker"] = underTakerProducts;

		await fs.writeFile("products.json", JSON.stringify(results, null, 2));
		console.log("finished scraping");
		process.exit(0);
	} catch (error) {
		console.error("Error during scraping:", error);
		process.exit(1);
	}
}

main();
*/