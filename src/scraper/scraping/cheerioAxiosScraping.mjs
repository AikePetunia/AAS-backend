// ========================================================
// 2. La opción intermedia
// Obtengo todas las rutas (getStorePaths), luego Axios + Cheerio, entran página por pagina.
// Usado tiendas basadas en: Tiendanube, WooCommerce, Shopify, PrestaShop
// ========================================================

import * as cheerio from "cheerio";
import axios from "axios";
import { parsePrice, hashCode } from "./utils/utils.mjs";
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

export async function cheerioAxiosScraping(url, config, seen = new Set(), runId = Date.now()) {
	try {
		console.log("Extrayendo productos desde:", url);
		const response = await scraperClient.get(url);
		const html = response.data;

		const $ = cheerio.load(html);
		const products = [];
		const storeId = config.store_id;

		$(config.selectors.productWrapper).each((index, element) => {
			const titleRaw = $(element).find(config.selectors.title_raw).text().trim();
			const productUrl = $(element).find(config.selectors.product_url).attr("href");

			if (!titleRaw || !productUrl) return null;

			const imageUrl = $(element).find(config.selectors.image_url)?.attr("src");
			const priceText = $(element).find(config.selectors.price).text().trim();
			//const installmentRaw = $(element).find(config.selectors.installmentRaw)?.text().trim();

			const listing_id = `${storeId}_${hashCode(productUrl)}`;
			if (seen.has(listing_id)) {
				return;
			}
			seen.add(listing_id);

			products.push({
				listing_id: listing_id,
				store_id: storeId,
				source_page_url: url,
				product_url: productUrl,
				title_raw: titleRaw,
				image_url: imageUrl,
				stock_status: true, // en db sería true or false.
				product_tags: [],
				last_price: parsePrice(priceText),
				last_scraped_at: new Date().toISOString(),
				missing: 0,
				last_run_id: runId,
				// store_name: config.store_name,
				// extra: {
				// 	installments_raw: installmentRaw,
				// },
				// title_slug_id: titleSlugId,
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
