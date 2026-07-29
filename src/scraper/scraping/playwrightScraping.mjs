import { chromium } from "playwright";
import { hashCode, parsePrice } from "./utils/utils.mjs";
export class PlaywrightScraping {
	constructor(config, runId = Date.now(), seen = new Set()) {
		this.config = config;
	}

	async initialize() {
		this.browser = await chromium.launch({ headless: true });
		this.page = await this.browser.newPage();
	}

	async scrapeProducts() {
		const products = [];
		const storeId = this.config.store_id;

		try {
			await this.initialize();

			for (const page of this.config.pages) {
				const categoryUrl = this.buildUrl(page);
				// console.log(`Scraping ${this.config.store_name}: ${url}`);

				try {
					await this.page.goto(categoryUrl, {
						waitUntil: "networkidle",
					});

					const products = await this.extractProductsFromPage(categoryUrl);
					if (!products.length) break;

					products = products.concat(products);
				} catch (error) {
					console.error(`Error in ${this.config.name}:`, error);
					break;
				}
			}
		} finally {
			await this.browser.close();
		}

		return products;
	}

	async extractProductsFromPage(categoryUrl) {
		const { selectors } = this.config;

		return this.page.$$eval(
			selectors.productWrapper,
			(products, sel) => {
				return products
					.map((product) => {
						const title_raw = product.querySelector(sel.title_raw)?.innerText?.trim();
						const productUrl = product.querySelector(sel.product_url)?.href;

						if (!title_raw || !productUrl) return null;

						const imageUrl = product.querySelector(sel.image_url)?.src;
						const priceText = product.querySelector(sel.price)?.innerText?.trim();

						const listing_id = `${selectors.store_id}_${hashCode(productUrl)}`;
						if (seen.has(listing_id)) {
							return;
						}
						seen.add(listing_id);

						return {
							listing_id: listing_id,
							store_id: selectors.store_id,
							source_page_url: categoryUrl,
							product_url: productUrl,
							title_raw: title_raw,
							image_url: imageUrl,
							stock_status: true, // en db sería true or false.
							product_tags: [],
							last_price: parsePrice(priceText),
							last_scraped_at: new Date().toISOString(),
							missing: 0,
							last_run_id: runId,
						};
					})
					.filter((product) => product !== null);
			},
			selectors
		);
	}

	buildUrl(category) {
		const { store_url, pagination } = this.config;
		const categoryUrl = `${store_url}${category}`;

		return categoryUrl;
	}
}
