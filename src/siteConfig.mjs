export class SiteConfig {
	constructor({
		store_name,
		store_id,
		store_url,
		store_image, // string: ruta relativa
		trust_factor_manual, // number 0..100
		seller_type, // string[]
		tags, // string[]

		pages, // string[] o array de objetos (recomendado)
		selectors, // object (listing selectors)

		pagination, // object (NO bool)
		timeout = 30000,
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
		this.trust_factor_manual = trust_factor_manual ?? null;
		this.seller_type = seller_type || [];
		this.tags = tags || [];

		this.pages = pages;

		this.selectors = selectors;
		this.pagination = pagination || { type: "queryParam", param: "page" };

		this.timeout = timeout;
	}
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
