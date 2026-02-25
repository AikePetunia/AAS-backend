import { chromium } from "playwright";

export class Scraper {
	constructor(config) {
		this.config = config;
	}

	async initialize() {
		this.browser = await chromium.launch({
			headless: true,
			args: ["--disable-blink-features=AutomationControlled", "--disable-dev-shm-usage"],
		});
		this.page = await this.browser.newPage();

		await this.page.route("**/*.{png,jpg,jpeg,gif,webp}", (route) => route.abort());
	}

	async scrapeProducts(storePathLimitTest = null) {
		let allProducts = [];
		try {
			await this.initialize();

			const pathsToScrape =
				storePathLimitTest && Number.isInteger(storePathLimitTest) && storePathLimitTest > 0
					? this.config.pages.slice(0, storePathLimitTest)
					: this.config.pages;

			for (const path of pathsToScrape) {
				const url = this.buildUrl(path);
				console.log(`Scraping ${this.config.store_name}: ${url}`);

				try {
					await this.page.goto(url, {
						timeout: 20000,
						waitUntil: "domcontentloaded",
					});

					await this.page.waitForTimeout(800);

					const products = await this.extractProductsFromPage();
					allProducts = allProducts.concat(products);
				} catch (error) {
					console.error(`Error in ${this.config.store_name}: ${error.message}`);
				}
			}
		} finally {
			await this.browser.close();
		}

		return allProducts;
	}

	async extractProductsFromPage() {
		const { selectors, store_id } = this.config;
		const sourcePageUrl = this.page.url();

		try {
			return await this.page.$$eval(
				selectors.productWrapper,
				(products, data) => {
					const { sel, storeId, sourcePageUrl } = data;

					const hashCode = (str) => {
						let hash = 0;
						for (const char of str) {
							hash = (hash << 5) - hash + char.charCodeAt(0);
							hash |= 0;
						}
						return Math.abs(hash).toString(16).padStart(8, "0");
					};

					const parsePrice = (priceStr) => {
						if (!priceStr) return null;
						const raw = priceStr;
						const value = parseInt(
							priceStr.replace(/\$/g, "").replace(/\./g, "").replace(/,/g, "."),
							10
						);
						return { raw, value, currency: "ARS" };
					};

					const seen = new Set();

					return products
						.map((product) => {
							const titleRaw = product.querySelector(sel.title_raw)?.innerText?.trim();
							const productUrl = product.querySelector(sel.product_url)?.href;
							const imageUrl = product.querySelector(sel.image_url)?.src;
							const priceRaw = product.querySelector(sel.price)?.innerText?.trim();
							const installmentsRaw =
								product.querySelector(sel.installments)?.innerText?.trim() || null;
							const stock_raw = product.querySelector(sel.stock_status)?.innerText?.trim() || null;

							if (!titleRaw || !productUrl) return null;

							const dedupeKey = `${storeId}::${productUrl}`;

							if (seen.has(dedupeKey)) return null;
							seen.add(dedupeKey);

							const price = parsePrice(priceRaw);
							const listing_id = `${storeId}::${hashCode(productUrl)}`;
							const title_slug_id = titleRaw.replace(/\s+/g, "_").toLowerCase();

							return {
								listing_id,
								store_id: storeId,
								title_slug_id,
								source_page_url: sourcePageUrl,
								product_url: productUrl,
								title_raw: titleRaw,
								image_url: imageUrl || null,
								price,
								stock_raw,
								stock_status: stock_raw === null ? "in_stock" : "unknown",
								product_tags: [],
								extra_info: {
									installments_raw: installmentsRaw,
								},
								scraped_at: new Date().toISOString(),
							};
						})
						.filter((product) => product !== null);
				},
				{
					sel: selectors,
					storeId: store_id,
					sourcePageUrl: sourcePageUrl,
				}
			);
		} catch (error) {
			console.error(`Failed to extract products: ${error.message}`);
			return [];
		}
	}

	buildUrl(category) {
		const { store_url } = this.config;
		return `${store_url}${category}`;
	}
}