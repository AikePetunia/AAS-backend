import { z } from "zod";

const productSchema = z.object({
	listing_id: z
		.string({
			invalid_type_error: "La ID tiene que ser un string válido",
			required_error: "El ID del producto es obligatorio",
		})
		.min(5, "El ID tiene que tener más de 5 carácteres."),
	store_id: z
		.string({
			invalid_type_error: "La tienda tiene que ser un string válido",
			required_error: "El ID de la tienda es obligatorio",
		})
		.lowercase({ invalid_type_error: "El ID de la tienda tiene que ser en lowercase" }),

	source_page_url: z.string().url({
		invalid_type_error: "El link de la tienda tiene que ser una URL",
		required_error: "La URL de la tienda es obligatoria",
	}),
	product_url: z.string().url({
		invalid_type_error: "El link del producto tiene que ser una URL",
		required_error: "La URL es obligatoria",
	}),
	title_raw: z
		.string({
			invalid_type_error: "El nombre tiene que ser un string válido",
			required_error: "El nombre del producto es obligatorio.",
		})
		.min(3, "El nombre tiene que contener mas de 3 carácteres"),
	image_url: z.string().url({
		invalid_type_error: "El link de la imagen tiene que ser una URL",
	}),
	stock_status: z.boolean({ required_error: "El producto debe o no existir." }),
	product_tags: z.array(z.string()),
	last_price: z.number().max(10000000, "El precio máximo es 10m."), // el producto más caro que vi, es de 10m so, ese será el limite de momento hasta que la maldita inflacion
	last_scraped_at: z.coerce.date({
		invalid_type_error: "Tiene que ser una fecha válida",
		required_error: "Es obligatoria la fecha.",
	}),
});

export function validateProduct(input) {
	return productSchema.safeParse(input);
}

export function validatePartialProduct(input) {
	return productSchema.partial().safeParse(input);
}
