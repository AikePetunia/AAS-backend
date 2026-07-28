import axios from "axios";
import { getValueByPath, getFirstValue, hashCode } from "./utils/utils.mjs";

const client = axios.create({
	timeout: 15000, // 15 segundos máximo antes de abortar si el server no responde
	headers: {
		"User-Agent":
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
		Accept: "application/json, text/plain, */*",
		"Accept-Language": "es-ES,es;q=0.9",
		Referer: "https://google.com",
		"Upgrade-Insecure-Requests": "1",
	},
});

export async function fetchScraping(config, runId) {
	try {
		const fetching_url = config.public_fetching_url;
		const store_id = config.store_id;
		const fetchingFields = config.public_fetching_fields;
		const products = [];

		const response = await client.get(fetching_url);
		const json = response.data;
		const productsArray = Array.isArray(json)
			? json
			: Array.isArray(json.entries)
				? json.entries
				: [];

		/* Cada json es bastante distinto, contienen la misma informacion, pero con distintos nombres
		 * Lo más facil es que en storesInformation, escriba explicitamente, que campo pertenece a cuál.
		 * title_raw
		 * price,
		 * product_url <- Esto lo tengo que construir según página (PROBLEMA POR QUE ES UN CAMPO FUNDAMENTAL)
		 * image_url <- También construible por página.
		 *  Ejemplo 1: Compragamer tiene de base: https://imagenes.compragamer.com/productos/compragamer_Imganen_general_ + Nombre de imagen.jpg
		 *  Ejemplo 2: Puerto minero tiene ya una url completa: "https://puerto-minero-space.nyc3.cdn.digitaloceanspaces.com/product-images/amd-ryzen-5-1600-outlet/0.webp"
		 */

		const title_key = fetchingFields.title_raw;
		const price_key = fetchingFields.price;
		const id_key = fetchingFields.id;
		// No hay una url explícita del producto, se construye a partir de datos.
		const base_url = fetchingFields.product_url.base_url;
		const image_url = fetchingFields.image_url.base_url;
		const image_required_key = fetchingFields.image_url.required_fields[0];
		const image_extension = fetchingFields?.image_url?.image_extension;

		productsArray.forEach((product) => {
			const titleRaw = product[title_key];
			const titleUrl = titleRaw.replace(/[\s-]/g, "_");
			const productUrl = base_url + titleUrl ?? +"_" + product[id_key];

			if (titleRaw === "" || productUrl === "") return;

			const price = getValueByPath(product, price_key);
			let imageUrl;
			if (image_url === "") {
				imageUrl = getValueByPath(product, image_required_key);
			} else {
				imageUrl = image_url + getValueByPath(product, image_required_key) + image_extension;
			}

			const listing_id = `${store_id}_${hashCode(productUrl)}`;

			products.push({
				listing_id: listing_id,
				store_id: store_id,
				source_page_url: null, // no tiene una cat de origen
				product_url: productUrl,
				title_raw: titleRaw,
				image_url: imageUrl,
				stock_status: true, // en db sería true or false.
				product_tags: [],
				last_price: price || null,
				last_scraped_at: new Date().toISOString(),
				missing: 0,
				last_run_id: runId,
			});
		});
		return products;
	} catch (e) {
		console.log("error, hizo boom pq:", e);
	}
}

/*
function normalizeProducts(responseData) {
  if (Array.isArray(responseData)) return responseData;
  if (Array.isArray(responseData.entries)) return responseData.entries;
  if (Array.isArray(responseData.data)) return responseData.data;
  return [];
}
  */
