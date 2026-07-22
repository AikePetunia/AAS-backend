import { Router, express } from "express";

const app = express();
export const createStoreRouter = () => {
	const productController = Router();

	productController.get("/"); // obtiene todas los productos

	productController.get("/search"); // esto no debería de implementarse com meilisearch? precio, tags, etc?

	// productController.get("/:id"); // obtiene la información completa
	// No existe aún, pues el detalle de producto es algo que no está implementado.
};
