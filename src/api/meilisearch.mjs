import dotenv from "dotenv";
import { Meilisearch } from "meilisearch";
dotenv.config();

export const meilisearch = new Meilisearch({
	host: process.env.MEILISEARCH_URL,
	apiKey: process.env.MEILISEARCH_ADMIN_API_KEY,
});
