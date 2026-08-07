// trae las imagenes de r2
import fs from "node:fs";
import path from "path";
import { fileURLToPath } from "url";
import { GetObjectCommand } from "@aws-sdk/client-s3";

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

import dotenv from "dotenv";
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const IMAGES_DIR = path.join(__dirname, "..", "images");

const r2Client = new S3Client({
	region: "auto",
	endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
	forcePathStyle: true,
	credentials: {
		accessKeyId: process.env.CLOUDFLARE_S3_ID,
		secretAccessKey: process.env.CLOUDFLARE_S3_SECRET,
	},
});

// cambiar a Cloudfare R2
export async function getProductImage(listing_id) {
	if (!/^[a-zA-Z0-9_-]+$/.test(listing_id)) return null;
	const fileName = `${listing_id}.avif`;
	try {
		const command = new GetObjectCommand({
			Bucket: "products",
			Key: fileName,
		});

		const response = await r2Client.send(command);

		res.setHeader("Content-Type", "image/avif");
		res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

		response.Body.pipe(res);
	} catch (error) {
		console.error("Error al obtener la imagen:", error.message);
		if (error.name === "NoSuchKey") {
			return res.status(404).send("Imagen no encontrada");
		}
		res.status(500).send("Error interno del servidor");
	}
}

export function getStoreImage(store_id) {
	if (!/^[a-zA-Z0-9_-]+$/.test(store_id)) return null;

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
	if (!imagePath || !fs.existsSync(imagePath)) return null;

	return buildHostedUrl(req, "products/images", listing_id);
}

export function getHostedStoreImageUrl(req, store_id) {
	const imagePath = getStoreImage(store_id);
	if (!imagePath || !fs.existsSync(imagePath)) return null;

	return buildHostedUrl(req, "stores/images", store_id);
}
