export class SiteConfig {
	constructor({
		store_id,
		store_name,
		baseUrl,
		store_image, // string: ruta relativa
		trust_factor_manual, // number 0..100
		seller_type, // string[]
		tags, // string[]

		pages, // string[] o array de objetos (recomendado)
		selectors, // object (listing selectors)

		pagination, // object (NO bool)
		maxPages = 10,
		timeout = 30000,
	}) {
		if (!store_name || !baseUrl || !selectors || !pages) {
			throw new Error("Missing required configuration parameters");
		}

		this.store_id = store_id || store_name.toLowerCase().replace(/\s+/g, "_");
		this.store_name = store_name;
		this.baseUrl = baseUrl;

		this.store_image = store_image || null;
		this.trust_factor_manual = trust_factor_manual ?? null;
		this.seller_type = seller_type || [];
		this.tags = tags || [];

		this.pages = pages;

		this.selectors = selectors;
		this.pagination = pagination || { type: "queryParam", param: "page" };

		this.maxPages = maxPages;
		this.timeout = timeout;
	}
}
