import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
// Descarga la imagen
// La convierte en .avif
// La pone en 512x512
// Le pone el nombre de listing_id
// No debe de repetir imagenes.
const OUTPUT_DIR = "./src/api/images/products";
export async function convertImage(image_url, listing_id) {
	const output_path = path.join(OUTPUT_DIR, `${listing_id}.avif`);

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
		console.log(`Imagen procesada y guardada: ${output_path}`);
	} catch (error) {
		console.error(`fallo al procesar el listing_id ${listing_id}:`, error.message);
	}
}
