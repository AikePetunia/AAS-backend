---
name: extract-store-selectors
description: Extract HTML selectors and site configs for web scraping from raw store page HTML.
---

# Extract Store Selectors Skill

Este skill guía al agente de IA para analizar el código HTML de una página web de comercio electrónico (de tecnología/gaming en Argentina) y generar la configuración de selectores CSS necesaria para integrarlo en el scraping de AAS.

## Contexto del Proyecto

AAS (Aike Armar un Setup) utiliza **Cheerio** y **Axios** para hacer scraping lightweight. Necesitamos extraer listados de productos de categorías de tiendas.
Cada tienda se configura instanciando la clase `SiteConfig`.

## Entrada requerida de parte del usuario

1. **Fragmento o archivo HTML completo** de la página de la categoría cargada con los productos.

---

## Instrucciones Paso a Paso para la IA

Cuando el usuario provea el HTML, debés realizar los siguientes pasos de análisis:

### Paso 1: Localizar el Contenedor de Productos (`productWrapper`)

- Busca la estructura repetitiva en el HTML que representa la tarjeta (card/grid item) de un solo producto.
- El selector debe coincidir con todos los productos del listado, y solo con ellos (evitar banners o sugerencias laterales si es posible).
- Prefiere clases semánticas (`.product-item`, `.product-card`, `article.product`) sobre selectores genéricos de grilla (`.col-md-4`, `.item`).

### Paso 2: Extraer Selectores Internos (Relativos al Wrapper)

Para cada elemento dentro del `productWrapper`, define el selector CSS relativo:

1. **`title_raw`**:
   - Selector del elemento de texto que contiene el nombre del producto (ej. `h2.product-title`, `.card-title a`).
2. **`price`**:
   - Selector del elemento de texto que muestra el precio actual (normalmente el precio de oferta/efectivo).
   - Si hay precio tachado (lista) y precio de oferta, prefiere el precio de oferta.
3. **`product_url`**:
   - Selector del enlace `<a>` que lleva al detalle del producto.
   - Debes identificar si el atributo `href` es una URL absoluta o relativa. Si es relativa, el runner la resolverá usando la URL base de la tienda.
4. **`image_url`**:
   - Selector de la imagen del producto (normalmente una etiqueta `<img>`).
   - Extrae el atributo que contiene la imagen real (ojo con lazy loading: busca atributos como `data-src`, `data-lazy-src` o `src`).
5. **`stock_raw`**:
   - Selector que indica la disponibilidad de stock (ej. `.stock-label`, o clases específicas como `.out-of-stock`).
   - Si no hay un elemento explícito de stock pero los productos sin stock muestran un botón "Sin Stock" o no muestran botón de compra, documenta esa regla.
6. **`installments`**:
   - Selector del texto que indica las cuotas sin interés si existe (ej. `.installments-info`, `.cuotas`). Si no aplica, se define como `null`.

### Paso 3: Analizar la Paginación

- Analiza cómo cambia la URL al pasar a la página 2 (ej. `?page=2`, `?p=2`, `/page/2/`).
- Define si es por query parameter o por segmento de ruta.

---

## Formato del Output Requerido

Debes devolver obligatoriamente un bloque de código JSON con la estructura exacta que requiere la clase `SiteConfig`.
Debes de crear un json con el nombre de la tienda y el formato de la plantilla dado abajo.

### Plantilla de Respuesta:

```json
{
	"store_name": "Nombre Real de la Tienda",
	"store_url": "https://www.tienda.com.ar",
	"store_image": "/images/stores/nombre_tienda.png",
	"trust_factor_manual": 70,
	"seller_type": ["componentes"],
	"tags": ["gaming", "argentina"],
	"pages": ["/ruta-categoria-de-prueba/"],
	"selectors": {
		"productWrapper": ".js-product-miniature-wrapper",
		"title_raw": ".h3.product-title a",
		"price": ".product-price",
		"product_url": ".h3.product-title a",
		"image_url": ".product-thumbnail img"
	},
	"pagination": {
		"type": "queryParam",
		"param": "page"
	}
}
```

## Reglas Críticas de Calidad

1. **No alucinar clases dinámicas:** Evita selectores que usen hashes autogenerados por frameworks modernos (ej. `.css-1y8x9q2` o `StyledCard-sc-1234`). Busca elementos estructurales o clases comunes.
2. **Atributo de Imagen:** Si la imagen usa lazy loading, indica claramente en la explicación cuál atributo (`data-src`, etc.) se debe leer en lugar del `src` por defecto.
3. **Manejo de Prefijos:** Si el link del producto (`product_url`) o la imagen (`image_url`) vienen sin dominio (ej. `/productos/microprocesador...`), asegúrate de que el backend pueda resolverlos concatenando la URL base.
