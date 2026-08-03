import fs from "node:fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const IMAGES_DIR = path.join(__dirname, "..", "images");

export function getProductImage(listing_id) {
	return path.join(IMAGES_DIR, `products/${listing_id}.avif`);
}

export function getStoreImage(store_id) {
	return path.join(path.join(IMAGES_DIR, `stores/${store_id}.webp`));
}

function buildHostedUrl(req, route, identifier) {
	if (!identifier) return null;

	const host = req.get("host") || "localhost:3000";
	const protocol = req.protocol || "http";
	return `${protocol}://${host}/${route}/${encodeURIComponent(identifier)}`;
}

export function getHostedProductImageUrl(req, listing_id) {
	const imagePath = getProductImage(listing_id);
	if (!fs.existsSync(imagePath)) return null;

	return buildHostedUrl(req, "products/images", listing_id);
}

export function getHostedStoreImageUrl(req, store_id) {
	const imagePath = getStoreImage(store_id);
	if (!fs.existsSync(imagePath)) return null;

	return buildHostedUrl(req, "stores/images", store_id);
}
