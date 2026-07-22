export class storesConfig {
	constructor({
		store_name,
		store_id,
		store_url,
		store_image, // string: ruta relativa
		trust_factor, // number 0..100
		store_role, // string[]
		tags, // string[]

		pages, // string[] o array de objetos (recomendado)
		selectors, // object (listing selectors)
	}) {
		if (!store_name || !store_url || !selectors || !pages) {
			throw new Error("Missing required configuration parameters", {
				missing: {
					store_name: !store_name,
					store_url: !store_url,
					selectors: !selectors,
					pages: !pages,
				},
			});
		}

		this.store_name = store_name;
		this.store_id = store_id || store_name.toLowerCase().replace(/\s+/g, "_");
		this.store_url = store_url;

		this.store_image = store_image || null;
		this.trust_factor = trust_factor ?? null;
		this.store_role = store_role || [];
		this.tags = tags || [];

		this.pages = pages;

		this.selectors = selectors;
	}
}
