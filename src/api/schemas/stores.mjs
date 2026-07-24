// a futuro
import { z } from "zod";

const storeSchema = z.object({
	store_name: z
		.string({
			invalid_type_error: "La tienda tiene que ser un string válido",
			required_error: "El nombre de la tienda es obligatorio",
		})
		.min(1, "La tienda tiene que contener un nombre no vacio"),

	store_id: z
		.string({
			invalid_type_error: "La tienda tiene que ser un string válido",
			required_error: "El ID de la tienda es obligatorio",
		})
		.lowercase({ invalid_type_error: "El ID de la tienda tiene que ser en lowercase" }),

	store_url: z.string().url({
		invalid_type_error: "El link de la tienda tiene que ser una URL",
		required_error: "La URL de la tienda es obligatoria",
	}),

	trust_factor_manual: z
		.int()
		.min(0, "El valor mínimo aceptado es 0")
		.max(100, "El valor máximo aceptado es 100"),

	store_role: z.array(
		z.enum(["componentes", "perifericos", "setup", "accesorios", "oficina"], {
			invalid_type_error: "El rol de tienda tiene que cumplir con el ENUM",
		})
	),

	tags: z.array(
		z.string({
			invalid_type_error: "Los tags deben ser un string válido",
		})
	),
});

export function validateStore(input) {
	return storeSchema.safeParse(input);
}

export function validatePartialStore(input) {
	return storeSchema.partial().safeParse(input);
}
