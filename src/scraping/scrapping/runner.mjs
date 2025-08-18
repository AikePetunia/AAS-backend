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
        const sitesPath = path.resolve(__dirname, "../filtering-ai/scikit-learn/response/final_sites.json");
        console.log("Loading sites from:", sitesPath); 
        
        const sitesData = await fs.readFile(sitesPath, "utf-8");
        const sitesArray = JSON.parse(sitesData);
        console.log(`Loaded ${sitesArray.length} sites from JSON`); 
        
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

        console.log(`Created ${Object.keys(siteConfigs).length} site configs`); 
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
            console.error(`Failed to load site configurations`);
            process.exit(1); 
        }
			
		for (const [siteName, config] of Object.entries(loadedSite)) {
			if (!config.elements || !Array.isArray(config.elements) || config.elements.length === 0) {
                console.log(`Skipping ${siteName} - no elements defined for scraping`);
                continue;
            }

			const selectors = {};
            for (const element of config.elements) {
                for (const [key, value] of Object.entries(element)) {
                    if (key === "type" || key === "tag") continue;
                    selectors[key] = value;
                }
            }
            
            const isError = !selectors.title || !selectors.link;
            
            if (isError) {
                console.log(`Skipping ${siteName} - missing critical selectors (title or link)`);
                continue;
            }
			
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