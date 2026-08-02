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

export function getHostedProductImageUrl(req, listing_id) {
	const host = req.get("host") || "localhost:3000";
	const protocol = req.protocol || "http";
	return `${protocol}://${host}/products/images/${encodeURIComponent(listing_id)}`;
}

export function getHostedStoreImageUrl(req, store_id) {
	const host = req.get("host") || "localhost:3000";
	const protocol = req.protocol || "http";
	console.log(`${protocol}://${host}/stores/images/${encodeURIComponent(store_id)}`);
	return `${protocol}://${host}/stores/images/${encodeURIComponent(store_id)}`;
}
