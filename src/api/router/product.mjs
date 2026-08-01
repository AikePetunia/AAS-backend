import { Router } from "express";
import fs from "node:fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const IMAGES_DIR = path.join(__dirname, "..", "images", "products");

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
			const filters = [];
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
					"store_image",
					"trust_factor",
					"image_url",
					"store_url",
					"product_url",
					"title_raw",
					"last_price",
				],
			};

			if (filters.length) {
				options.filter = filters.join(" AND ");
			}
			if (sort) {
				options.sort = [sort];
			}

			const index = meilisearch.index("products");
			const searchResults = await index.search(userQ, options);
			const hits = Array.isArray(searchResults.hits) ? searchResults.hits : [];

			const enrichedHits = hits.map((product) => ({
				...product,
				image_url: getHostedImageUrl(req, product.listing_id),
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
		const imagePath = getImage(listingId);

		if (!fs.existsSync(imagePath)) {
			return res.status(404).json({ error: "Imagen no encontrada" });
		}

		res.sendFile(imagePath);
	});

	return productController;
};

function getImage(listing_id) {
	return path.join(IMAGES_DIR, `${listing_id}.avif`);
}

function getHostedImageUrl(req, listing_id) {
	const host = req.get("host") || "localhost:3000";
	const protocol = req.protocol || "http";
	return `${protocol}://${host}/products/images/${encodeURIComponent(listing_id)}`;
}
