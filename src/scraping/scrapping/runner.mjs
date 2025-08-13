import { Scraper } from "./coreScrapper.mjs";
import { siteConfigs } from "./constPages.mjs";
import { scrapeUnderTaker } from "./undertaker.mjs";
import fs from "fs/promises";
import { SiteConfig } from "./siteConfig.mjs";

const __directory = "../../filtering-ai/scikit-learn/response/final_sites.json";

async function loadSite() {
	try {
		const sitesData = await fs.readFile(__directory, "utf-8");
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
	}
}
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
