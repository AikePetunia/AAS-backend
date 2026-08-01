import { Router } from "express";

//http://localhost:3000/stores/armytech?page=1 ... http://localhost:3000/stores/armytech?page=2
export const createStoreRouter = ({ supabase, meilisearch }) => {
	const storesRouter = Router();

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
			res.json(searchResults);
		} catch (e) {
			res.status(500).json({ error: "Error interno del servidor" });
		}
	});

	storesRouter.get("/:id", async (req, res) => {
		try {
			const storeId = req.params.id;
			console.log("id leido", storeId);
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
			res.json(data);
		} catch (e) {
			console.error("ERROR REAL DE SUPABASE:", e);
			res.status(500).json({ error: "error interno del servidor" });
		}
	}); // obtiene la información completa

	return storesRouter;
};
