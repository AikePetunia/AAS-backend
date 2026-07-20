import pLimit from "p-limit";
import { scrapeStore } from "./scrapeStore.mjs";
import { storesInformation } from "../config/storesInformation.mjs";
import fs from "fs/promises";
import { all } from "axios";

// ¿Como soluciono los 429?
const limit = pLimit(1);
const storesEntries = Object.entries(storesInformation); // esto es el nombre de la tienda en su config (armyTech: new SiteConfig)
const allProducts = [];
const storeToTest = null; // it's by entry name. Use null for ignoring
const storeAmountToTest = 999;
const storePagesToTest = 999;
const failedStores = [];
let i = 0;

// entra tienda por tienda, y dentro de cada tienda entra categoría por categoría
export async function scrapeStores() {
	for (const [storeName, config] of storesEntries) {
		// testeo cantidad de tiendas
		if (i >= storeAmountToTest) break;
		// testeo individual
		if (storeToTest && storeName !== storeToTest) {
			continue;
		}

		const storeTasks = [];
		const storeToAccess = config.store_url;
		let j = 0;

		for (const categoryPath of config.pages) {
			// testeo rutas
			if (j >= storePagesToTest) break;

			const fullCategoryUrl = storeToAccess + categoryPath;
			storeTasks.push(limit(() => scrapeStore(fullCategoryUrl, config)));
			j++;
		}

		// escribimos resultados por tienda
		let storeResults = await Promise.all(storeTasks);
		const storeProducts = storeResults.flat();
		if (storeProducts.length != 0) {
			await fs.writeFile(
				`./data/raw/latest/${storeName}.json`,
				JSON.stringify(storeProducts, null, 2)
			);
		} else {
			failedStores.push(storeName);
			await fs.writeFile(`./data/failedStores.json`, JSON.stringify(failedStores, null, 2));
		}

		allProducts.push(...storeProducts);
		i++;
	}

	console.log("writting all products...");
	await fs.writeFile(`./data/raw/latest/allProducts.json`, JSON.stringify(allProducts, null, 2));
}