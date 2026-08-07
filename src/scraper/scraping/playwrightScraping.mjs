import { chromium } from "playwright";
import { hashCode, parsePrice } from "./utils/utils.mjs";
import { convertImage } from "./utils/convertImage.mjs";

export class PlaywrightScraping {
	constructor(config, runId = Date.now(), seen = new Set()) {
		this.config = config;
		this.runId = runId;
		this.seen = seen;
	}

	async initialize() {
		this.browser = await chromium.launch({ headless: true });
		this.page = await this.browser.newPage();
	}

	async scrapeProducts() {
		let allProducts = [];
		const storeId = this.config.store_id;

		try {
			await this.initialize();

			for (const page of this.config.pages) {
				const categoryUrl = this.buildUrl(page);

				try {
					try {
						await this.page.goto(categoryUrl, { waitUntil: "networkidle", timeout: 30000 });
					} catch {
						await this.page.goto(categoryUrl, { waitUntil: "domcontentloaded" });
						await this.page.waitForTimeout(2000);
					}

					const products = await this.extractProductsFromPage(categoryUrl, storeId);
					if (!products.length) break;

					allProducts = allProducts.concat(products);
				} catch (error) {
					console.error(`Error in ${this.config.store_name}:`, error);
					break;
				}
			}
		} finally {
			await this.browser.close();
		}

		return allProducts;
	}

	async extractProductsFromPage(categoryUrl, storeId) {
		const { selectors } = this.config;

		const rawProducts = await this.page.$$eval(
			selectors.productWrapper,
			(products, sel) => {
				return products
					.map((product) => {
						const title_raw = product.querySelector(sel.title_raw)?.innerText?.trim();
						const productUrl = product.querySelector(sel.product_url)?.href;

						if (!title_raw || !productUrl) return null;

						const imageUrl = product.querySelector(sel.image_url)?.src;
						const priceText = product.querySelector(sel.price)?.innerText?.trim();

						return { title_raw, productUrl, imageUrl, priceText };
					})
					.filter((product) => product !== null);
			},
			selectors
		);

		return rawProducts
			.map((raw) => {
				const listing_id = `${storeId}_${hashCode(raw.productUrl)}`;
				if (this.seen.has(listing_id)) return null;
				this.seen.add(listing_id);

				if (raw.imageUrl) {
					convertImage(raw.imageUrl, listing_id);
				}
				return {
					listing_id,
					store_id: storeId,
					source_page_url: categoryUrl,
					product_url: raw.productUrl,
					title_raw: raw.title_raw,
					image_url: raw.imageUrl,
					stock_status: true,
					product_tags: [],
					last_price: parsePrice(raw.priceText),
					last_scraped_at: new Date().toISOString(),
					missing: 0,
					last_run_id: this.runId,
				};
			})
			.filter((product) => product !== null);
	}

	buildUrl(category) {
		const { store_url } = this.config;
		return `${store_url}${category}`;
	}
}
