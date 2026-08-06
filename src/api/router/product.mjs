import { Router } from "express";
import fs from "node:fs";
import {
	getProductImage,
	getHostedProductImageUrl,
	getHostedStoreImageUrl,
} from "../utils/images.mjs";

let productSearchSettingsReady = false;

async function ensureProductSearchSettings(index) {
	if (productSearchSettingsReady) return;

	await index.updateSettings({
		filterableAttributes: [
			"store_id",
			"last_price",
			"category",
			"trust_factor",
			"missing",
			"last_scraped_at",
		],
		sortableAttributes: ["last_price", "missing"],
	});

	productSearchSettingsReady = true;
}

export const createProductRouter = ({ meilisearch }) => {
	const productController = Router();

	productController.get("/", async (req, res) => {
		try {
			const userQ = req.query.q;
			const sort = req.query.sort;
			let currentOffset = parseInt(req.query.offset) || 0;
			if (currentOffset > 30) {
				currentOffset = 20;
			}
			let limit = parseInt(req.query.limit) || 20;
			if (limit > 30) {
				limit = 20;
			} 

			/*
			! filtros por:
			* store_id 			 		     /products?q={search}&store_id=armytech
			* trust_factor  	 			 /products?q={search}&sort=trust_factor:desc
		    * relevande  					 /products?q={search}
			* el precio: [
			*  "precio más bajo",			 /products?q=mouse&sort=last_price:desc
			*  "precio mas alto", 		     /products?q=ram&sort=last_price:asc
			*  "rango de precio[MIN, MAX]"   /products?q={search}&minPrice=100000&maxPrice=250000
			]
			todos:
			* categoria de producto <- No implementado en ningún lado
			* Marca de producto
			*/

			// los query params van separados por &
			const dateLimit = new Date();
			dateLimit.setDate(dateLimit.getDate() - 5);
			const dateLimitIso = dateLimit.toISOString();
			// hacer un filtro para excluir paginas que son de decoracion (shibuya) o armadoras de pcs.
			const filters = ["missing < 10", `last_scraped_at >= "${dateLimitIso}"`];
			const priceFilters = [];
			const priceMin = Number.parseInt(req.query.minPrice, 10);
			const priceMax = Number.parseInt(req.query.maxPrice, 10);

			if (!Number.isNaN(priceMin)) {
				console.log("filtrando por un precio minimo");
				filters.push(`last_price >= ${priceMin}`);
			}
			if (!Number.isNaN(priceMax)) {
				console.log("filtrando por precio máximo");
				filters.push(`last_price <= ${priceMax}`);
			}

			if (priceFilters.length > 0) {
				filters.push(`(${priceFilters.join(" AND ")})`);
			}

			const options = {
				limit,
				offset: currentOffset,
				attributesToRetrieve: [
					"listing_id",
					"store_id",
					"store_name",
					"store_image_url",
					"trust_factor",
					"image_url",
					"store_url",
					"product_url",
					"title_raw",
					"last_price",
				],
			};
			options.filter = filters.join(" AND ");
			if (sort) {
				options.sort = [sort];
			}

			const index = meilisearch.index("products");
			await ensureProductSearchSettings(index);
			const searchResults = await index.search(userQ, options);
			const hits = Array.isArray(searchResults.hits) ? searchResults.hits : [];

			const enrichedHits = hits.map((product) => ({
				...product,
				store_image_url: getHostedStoreImageUrl(req, product.store_id),
				image_url: getHostedProductImageUrl(req, product.listing_id),
				original_image_url: product.image_url,
			}));

			res.json({
				...searchResults,
				hits: enrichedHits,
			});
		} catch (e) {
			console.log("error", e);
			res.status(500).json({ error: "Error interno del servidor" });
		}
	});

	productController.get("/images/:listing_id", async (req, res) => {
		const listingId = req.params.listing_id;
		const imagePath = getProductImage(listingId);

		if (!fs.existsSync(imagePath)) {
			return res.status(404).json({ error: "Imagen no encontrada" });
		}

		res.sendFile(imagePath);
	});

	return productController;
};

