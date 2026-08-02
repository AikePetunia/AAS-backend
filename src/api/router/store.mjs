import { Router } from "express";
import fs from "node:fs";
import {
	getHostedProductImageUrl,
	getHostedStoreImageUrl,
	getStoreImage,
} from "../utils/images.mjs";

//http://localhost:3000/stores/armytech?page=1 ... http://localhost:3000/stores/armytech?page=2
export const createStoreRouter = ({ supabase, meilisearch }) => {
	const storesRouter = Router();

	storesRouter.get("/images/:store_id", async (req, res) => {
		const storeId = req.params.store_id;
		const imagePath = getStoreImage(storeId);

		if (!fs.existsSync(imagePath)) {
			return res.status(404).json({ error: "Imagen de la tienda no encontrada" });
		}

		res.sendFile(imagePath);
	});

	// obtiene todas las tiendas
	storesRouter.get("/", async (req, res) => {
		try {
			const userQ = req.query.q;
			const index = meilisearch.index("stores");
			const currentOffset = parseInt(req.query.offset) || 0;
			const searchResults = await index.search(userQ, {
				limit: 70,
				attributesToRetrieve: ["store_id", "store_name", "trust_factor"],
				offset: currentOffset,
			});

			const enrichedHits = (searchResults.hits || []).map((store) => ({
				...store,
				store_image_url: getHostedStoreImageUrl(req, store.store_id),
			}));

			res.json({
				...searchResults,
				hits: enrichedHits,
			});
		} catch (e) {
			res.status(500).json({ error: "Error interno del servidor" });
		}
	});

	storesRouter.get("/:id", async (req, res) => {
		try {
			const storeId = req.params.id;
			//paginado
			const page = parseInt(req.query.page) || 1;
			const limit = 999;
			const from = (page - 1) * limit;
			const to = from + limit - 1;

			//fecha para stock
			const dateLimit = new Date();
			dateLimit.setDate(dateLimit.getDate() - 3);
			const dateLimitIso = dateLimit.toISOString();

			// dame los datos completos de la tienda y sus productos relacionados.
			// limitado a 10 productos.
			const { data, error } = await supabase
				.from("stores")
				.select(
					`*,
                products!fk_store (
                    listing_id,
					store_id,
                    product_url,
                    title_raw,
                    last_price
                )
            `
				)
				.eq("store_id", storeId)
				.lt("products.missing", 5) // producto 5 veces que no se vio, "no existe".
				.gte("products.last_scraped_at", dateLimitIso)
				.range(from, to, { foreignTable: "products" })
				.single();

			if (error) throw error;

			const enrichedData = {
				...data,
				store_image_url: getHostedStoreImageUrl(req, data.store_id),
				products: (data.products || []).map((product) => ({
					...product,
					image_url: getHostedProductImageUrl(req, product.listing_id),
				})),
			};
			res.json(enrichedData);
		} catch (e) {
			console.error("ERROR REAL DE SUPABASE:", e);
			res.status(500).json({ error: "error interno del servidor" });
		}
	}); // obtiene la información completa

	return storesRouter;
};
