import { Router, express } from "express";

const app = express();
export const createStoreRouter = () => {
	const storesRouter = Router();

	storesRouter.get("/"); // obtiene todas las tiendas
	storesRouter.get("/search"); // busca tiendas x rol
	storesRouter.get("/:id"); // obtiene la información completa
	storesRouter.get("/:id/products"); // obtiene la informacion completa de una tienda + productos

	return storesRouter;
};
