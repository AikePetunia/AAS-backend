import { Scraper } from "./coreScrapper.mjs";
import { siteConfigs } from "./constPages.mjs";
// import { scrapeUnderTaker } from "./undertaker.mjs";

import fs from "fs/promises";

async function main() {
	const results = {};
	const setLimit = -1;
	try {
		for (const [siteName, config] of Object.entries(siteConfigs)) {
			if (setLimit != -1 && Object.keys(results).length >= setLimit) {
				console.log(`Reached the limit of ${setLimit} sites. Stopping further scraping.`);
				break;
			}
			console.log(`Starting scrape of ${siteName}...`);
			const scraper = new Scraper(config);
			const products = await scraper.scrapeProducts();
			results[siteName] = products;
		}

		console.log("Starting scrape of Undertaker...");
		// const underTakerProducts = await scrapeUnderTaker();
		// results["undertaker"] = underTakerProducts;

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
    "store": {
      "store_id": "armytech",
      "store_name": "ArmyTech", 
      "base_url": "https://www.armytech.com.ar/",                   // manual
      "store_image": "https://www.armytech.com.ar/img/logo.png",    // manual
      "trust_factor_manual": 90,                                    // manual
      "seller_type": ["setup", "componentes", "otaku", "poster"],   // manual
      "tags": ["argentina", "cordoba", "buena_reputacion"],         // manual
      "products": [
      {
        "listing_id": "armytech::5921",
        "store_id": "armytech",
        "group_id": "g_thermal_paste_pastermax_b30_white",
        "source_page_url": "https://www.armytech.com.ar/refrigeracion/",
        "product_url": "https://www.armytech.com.ar/refrigeracion/5921-pasta-termica-pastermax-b30-blanca.html",
        "title_raw": "Pasta Térmica Pastermax B30 Blanca",
        "image_url": "https://www.armytech.com.ar/img/p/es-default-home_default.jpg",
        "price": {
          "raw": "$ 3.330,89",
          "value": 3330.89,
          "currency": "ARS"
        },
        "stock_status": "in_stock",
        "stock_raw": "Stock disponible",
        "product_tags": ["pc_components", "cooling", "thermal_paste"], // manual (?)
        "extra": {
          "installments": null
        },
        "scraped_at": "2026-02-13T19:10:00.000Z"
      }
    ],
    "groups": [
        "group_id": "g_thermal_paste_pastermax_b30_white",
        "display_name": "Pasta Térmica Pastermax B30 Blanca",
        "category": "thermal_paste",
        "attributes": {
          "color": "white"
        },
        "created_by": "rules",
        "created_at": "2026-02-13T19:10:00.000Z"
    ]
    },
  ]
}



*/
