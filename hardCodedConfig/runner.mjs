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

{
  "store": {
    "store_id": "armytech",                       // string
    "store_name": "ArmyTech",                     // string
    "base_url": "https://www.armytech.com.ar/",   // string (url)
    "store_reputation": 0.9,                      // number (0..1)

    "seller_type": {                              // object
      "pc_components": true,                      // boolean
      "decoration": false,                        // boolean
      "furniture": false                          // boolean
    },

    "tags": [                                     // string[]
      "argentina",
      "cordoba",
      "buena_reputacion"
    ]
  },

  "products": [
    {
      "listing_id": "armytech::5921",             // string (unique per store)
      "source_page_url": "https://www.armytech.com.ar/refrigeracion/", // string (url)
      "product_url": "https://www.armytech.com.ar/refrigeracion/5921-pasta-termica-pastermax-b30-blanca.html", // string (url)

      "title_raw": "Pasta Térmica Pastermax B30 Blanca", // string
      "image_url": "https://www.armytech.com.ar/img/p/es-default-home_default.jpg", // string (url|null)

      "price": {                                  // object
        "raw": "$ 3.330,89",                      // string|null
        "value": 3330.89,                         // number|null
        "currency": "ARS"                         // "ARS" | string (yo lo dejaría como literal "ARS")
      },

      "stock": {                                  // object
        "status": "unknown",                      // "in_stock" | "out_of_stock" | "unknown"
        "level": "unknown",                       // "high" | "low" | "unknown"
        "raw": null                               // string|null
      },

      "product_tags": [                           // string[] (derivados por regex)
        "pc_components",
        "cooling",
        "thermal_paste"
      ],

      "canonical": {                              // object|null (futuro)
        "canonical_id": "canon::thermal_paste::pastermax::b30::white", // string
        "match_type": "soft",                     // "soft" | "hard"
        "match_confidence": 0.78                  // number (0..1)
      },

      "extra": {                                  // object
        "installments": null                      // object|null (si aparece)

		// !null:
		{
			"raw": "6 cuotas sin interés de $ 36.556,80", // string
			"count": 6,                                   // number|null
			"amount_value": 36556.80,                     // number|null
			"currency": "ARS"                             // "ARS"
		}
  
      },

      "scraped_at": "2026-02-13T19:10:00.000Z"    // string (ISO datetime)
    }
  ],

  "canonicals": [
    {
      "canonical_id": "canon::thermal_paste::pastermax::b30::white", // string
      "category": "thermal_paste",                // string (enum ideal)

      "brand": "Pastermax",                       // string|null
      "model": "B30",                             // string|null
      "variant": "Blanca",                        // string|null

      "specs": {                                  // object (libre, pero acotado por categoría)
        "color": "white"                          // string|null
      },

      "product_tags": [                           // string[]
        "pc_components",
        "cooling",
        "thermal_paste"
      ],

      "created_by": "rules",                      // "rules" | "manual" | "model"
      "created_at": "2026-02-13T19:10:00.000Z"    // string (ISO datetime)
    }
  ]
}


{

}


*/