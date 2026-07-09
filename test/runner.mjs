import pLimit from "p-limit";
import { scrapeCategoryLightweight } from "./scrapeLightweight.mjs";
import { sitesInformation } from "../src/constPages.mjs";
import fs from "fs/promises";
/*
todo:
- limite de paginas a scrapear 
- limite de cateogrias a scrapear
- seleccionar tienda 
*/

const limit = pLimit(3);
const storesEntries = Object.entries(sitesInformation); // esto es el nombre de la tienda en su config (armyTech: new SiteConfig)
const scrapingTasks = [];

// entra tienda por tienda, y dentro de cada tienda entra categoría por categoría
for (const [storeName, config] of storesEntries) {
	const storeFullCategorys = [];
	const storeToAccess = config.store_url;

	for (const categoryPath of config.pages) {
		const fullCategoryUrl = storeToAccess + categoryPath;
		scrapingTasks.push(limit(() => scrapeCategoryLightweight(fullCategoryUrl, config)));
	}
}
// visitar TODO
const resultArray = await Promise.all(scrapingTasks);
const allProducts = resultArray.flat();

await fs.writeFile(`./data/raw/latest/allProducts.json`, JSON.stringify(allProducts, null, 2));
