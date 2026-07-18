import * as cheerio from "cheerio";
import axios from "axios";

const scraperClient = axios.create({
	timeout: 15000, // 15 segundos máximo antes de abortar si el server no responde
	headers: {
		"User-Agent":
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
		Accept:
			"text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
		"Accept-Language": "es-ES,es;q=0.9",
		Referer: "https://google.com",
		"Upgrade-Insecure-Requests": "1",
	},
});

export async function scrapeStore(url, config) {
	try {
		const response = await scraperClient.get(url);
		const html = response.data;

		const $ = cheerio.load(html);
		const products = [];
		const seen = new Set();
		const storeId = config.store_id;

		$(config.selectors.productWrapper).each((index, element) => {
			const titleRaw = $(element).find(config.selectors.title_raw).text().trim();
			const productUrl = $(element).find(config.selectors.product_url).attr("href");

			if (!titleRaw || !productUrl) return;

			const imageUrl = $(element).find(config.selectors.imageUrl)?.attr("src");
			const priceText = $(element).find(config.selectors.price).text().trim();
			const installmentRaw = $(element).find(config.selectors.installmentRaw)?.text().trim();
			const stockRaw = $(element).find(config.selectors.stock_raw)?.text();

			const dedupeKey = `${storeId}::${productUrl}`;
			if (seen.has(dedupeKey)) return;
			seen.add(dedupeKey);

			const listing_id = `${storeId}::${hashCode(productUrl)}`;
			const titleSlugId = titleRaw.replace(/\s+/g, "_").toLowerCase();

			products.push({
				listing_id: listing_id,
				store_id: storeId,
				title_slug_id: titleSlugId,
				store_name: config.store_name,
				source_page_url: url,
				url: productUrl,
				title_raw: titleRaw,
				image_url: imageUrl,
				price: parsePrice(priceText),
				stock_raw: stockRaw,
				stock_status: stockRaw === null ? "in_stock" : "unknown",
				extra: {
					installments_raw: installmentRaw,
				},
				scraped_at: new Date().toISOString(),
			});
		});
		return products;
	} catch (error) {
		// Axios guarda el status en error.response.status si el server respondió con error
		const status = error.response ? error.response.status : "Network/Timeout";
		console.error(`[${status}] failed extracting ${url}:`, error.message);
		return [];
	}
}

function parsePrice(priceStr) {
	if (!priceStr) return null;
	const raw = priceStr;
	const value = parseInt(priceStr.replace(/\$/g, "").replace(/\./g, "").replace(/,/g, "."), 10);
	return { raw, value, currency: "ARS" };
}

function hashCode(str) {
	let hash = 0;
	for (const char of str) {
		hash = (hash << 5) - hash + char.charCodeAt(0);
		hash |= 0;
	}
	return Math.abs(hash).toString(16).padStart(8, "0");
}

/*
expected answer: 
      "store_name": "ArmyTech", 
      "store_id": "armytech",
      "store_url": "https://www.armytech.com.ar/",                   // manual
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
*/
