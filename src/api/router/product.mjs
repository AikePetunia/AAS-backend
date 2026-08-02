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
			const currentOffset = parseInt(req.query.offset) || 0;
			const limit = parseInt(req.query.limit) || 999;

			/*
			! filtros por:
			* store_id 			 /products?q={search}&store_id=armytech
			* trust_factor  	 /products?q={search}&sort=trust_factor:desc
			* el precio: [
			*  "precio más bajo",			 /products?q=mouse&sort=last_price:desc
			*  "precio mas alto", 		     /products?q=ram&sort=last_price:asc
			*  "rango de precio[MIN, MAX]"   /products?q={search}&price_min=100000&price_max=250000
			]
			todos:
			* categoria de producto <- No implementado en ningún lado
			* Marca de producto
			*/

			// los query params van separados por &
			const dateLimit = new Date();
			dateLimit.setDate(dateLimit.getDate() - 3);
			const dateLimitIso = dateLimit.toISOString();

			const filters = ["missing < 1", `last_scraped_at >= "${dateLimitIso}"`];
			if (req.query.store_id) {
				console.log("filtrando por store_id");
				filters.push(`store_id = "${req.query.store_id}"`);
			}
			if (req.query.price_min) {
				console.log("filtrando por un precio minimo");
				filters.push(`last_price >= ${req.query.price_min}`);
			}
			if (req.query.price_max) {
				console.log("filtrando por precio máximo");
				filters.push(`last_price <= ${req.query.price_max}`);
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

