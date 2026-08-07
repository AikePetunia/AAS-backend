import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
dotenv.config();

// Descarga la imagen
// La convierte en .avif
// La pone en 512x512
// Le pone el nombre de listing_id
// No debe de repetir imagenes.
// La sube a r2

const r2Client = new S3Client({
	region: "auto",
	endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
	forcePathStyle: true,
	credentials: {
		accessKeyId: process.env.CLOUDFLARE_S3_ID,
		secretAccessKey: process.env.CLOUDFLARE_S3_SECRET,
	},
});

// Luego inicializas el cliente...
const BUCKET_NAME = "products";
const OUTPUT_DIR = "./src/api/images/products";

export async function convertImage(image_url, listing_id) {
	const fileName = `${listing_id}.avif`;
	const output_path = path.join(OUTPUT_DIR, fileName);

	if (fs.existsSync(output_path)) {
		console.log(`image for ${listing_id} exists.`);
		return;
	}

	try {
		if (!fs.existsSync(OUTPUT_DIR)) {
			fs.mkdirSync(OUTPUT_DIR, { recursive: true });
		}

		const response = await fetch(image_url);
		if (!response.ok) {
			throw new Error("error al descargar imagen", response.status);
		}

		const arrayBuffer = await response.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		await sharp(buffer)
			.resize(512, 512, {
				fit: "cover",
				position: "center",
			})
			.avif({ quality: 80 })
			.toFile(output_path);

		console.log("calling func");
		await uploadImage(output_path, fileName);
		console.log(`Imagen procesada y guardada: ${output_path}`);
	} catch (error) {
		console.error(`fallo al procesar el listing_id ${listing_id}:`, error.message);
	}
}

async function uploadImage(localFilePath, fileName) {
	try {
		const fileStream = fs.readFileSync(localFilePath);
		const ext = path.extname(localFilePath).toLowerCase();
		const uploadParams = {
			Bucket: BUCKET_NAME, // bucket
			Key: fileName, // nombre
			Body: fileStream,
			ContentType: "image/avif",
		};

		console.log(`Uploading ${localFilePath} to R2...`);
		const command = new PutObjectCommand(uploadParams);
		await r2Client.send(command);

		console.log(`Uploaded, saved as: ${fileName}`);
	} catch (e) {
		console.log("error cloudfare", e);
	}
}