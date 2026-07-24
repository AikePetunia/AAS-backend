import { Router } from "express";
import { dotenv } from "dotenv";

export const createStoreRouter = () => {
	const storesRouter = Router();

	// obtiene todas las tiendas
	storesRouter.get("/");
	storesRouter.get("/search"); // busca tiendas x rol
	storesRouter.get("/:id"); // obtiene la información completa
	storesRouter.get("/:id/products"); // obtiene la informacion completa de una tienda + productos

	return storesRouter;
};;
