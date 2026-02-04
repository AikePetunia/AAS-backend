import { chromium } from "playwright";
import fs from "fs/promises";

/**
 * Extracts DOM elements from e-commerce pages for AI training.
 *
 * Outputs:
 * - dataset.csv: all elements (tag, class, text, href) for training
 * - elementsToClassify.json: elements grouped by page
 * - failed_pages.json: list of URLs that failed to process
 */

const URLS_TO_SCRAPE = [
	"https://www.tiendatrade.com.ar/listado/computacion/perifericos-pc/",
	"https://www.shopgamer.com.ar/perifericos/",
	"https://www.armytech.com.ar/405-hardware",
	"https://www.maximus.com.ar/Productos/maximus.aspx?/CAT=-1/SCAT=-1/M=-1/BUS=*/OR=1",
	"https://www.venex.com.ar/componentes-de-pc",
	"https://compragamer.com/productos?cate=58",
	"https://www.ngtechnologies.com.ar/search/?q=*",
	"https://mgmgamers.store/search/?q=*",
	"https://www.slot-one.com.ar/search/?q=*",
	"https://www.puertominero.com.ar/productos",
	"https://www.710tech.com.ar/accesorios/",
	"https://www.37bytes.com.ar/productos/",
	"https://dinobyte.ar/categoria-producto/hardware/",
	"https://fullh4rd.com.ar/pcarmada",
	"https://gnpoint.com.ar/productos/notebooks/",
	"https://www.gamerspoint.com.ar/categoria/componentes-de-pc/",
	"https://www.gamingcity.com.ar/listado/computacion/laptops-accesorios/notebooks/notebooks",
	"https://www.gezatek.com.ar/tienda/pc-hogar-y-oficina/",
	"https://goldentechstore.com.ar/almacenamiento/",
	"https://hftecnologia.com.ar/notebooks/",
	"https://ar-shop.com.ar/auriculares/",
	"https://www.insumosacuario.com.ar/almacenamiento/",
	"https://wiztech.com.ar/catalogo",
	"https://www.xt-pc.com.ar/cat/supra/32/notebooks/",
	"https://empeniogamer.com.ar/tienda",
	"https://hardcorecomputacion.com.ar/categoria-producto/microprocesadores/",
	"https://www.hypergaming.com.ar/monitores/",
	"https://www.ignatech.com.ar/componentes/",
	"https://www.integradosargentinos.com/listado/computacion/pc-escritorio/pc/",
	"https://katech.com.ar/hardware/",
	"https://www.liontech-gaming.com/product-category/componentes-de-pc/",
	"https://www.malditohard.com.ar/categoria/pc-gamer/",
	"https://maxtecno.com.ar/equipos-armados/",
	"https://www.megasoftargentina.com.ar/accesorios---cables/",
	"https://www.mexx.com.ar/productos-rubro/tablets/",
	"https://www.noxiestore.com/teclados-y-mouses/",
	"https://nextgames.com.ar/componentes-de-pc",
	"https://gorilagames.com/componentes-de-pc",
	"https://www.thegamershop.com.ar/componentes-de-pc/",
	"https://ruidos.com.ar/pc-gaming",
	"https://alltek.ar/componentes-de-pc",
	"https://insumaxinformatica.com.ar/componentes-de-pc",
	"https://compucordoba.com.ar/componentes-de-pc",
	"https://macroinsumos.com.ar/componentes-de-pc",
	"https://storelaplata.com.ar/accesorios-pc",
	"https://cellplay.com.ar/perifericos",
	"https://hydraxtreme.com/componentes-de-pc",
	"https://casatecno.com.ar/componentes-pc",
	"https://epocasvideogames.com.ar/componentes-pc",
	"https://gztienda.com.ar/componentes-de-pc",
	"https://elevengamesar.com/componentes-pc",
	"https://intecnova.com.ar/audio-y-video",
	"https://31store.com.ar/perifericos",
	"https://kenshinanimestore.com/accesorios",
	"https://manabigames.org/computadoras",
	"https://ibtech.com.ar/tienda/accesorios-celulares",
	"https://gameroutlet.com.ar/accesorios",
	"https://smarttucuman.com/componentes-de-pc",
	"https://www.rockethard.com.ar/perifericos/",
	"https://herrerogamer2.mitiendanube.com/productos",
	"https://www.makenametal.com.ar/productos/",
	"https://diangi.online/productos",
	"https://www.onicaps.online/keycaps",
	"https://www.elevecomponentes.com/productos",
	"https://playhubshop.com.ar/consolas",
	"https://www.cuadrosmodernos.com.ar/stock",
	"https://farbermuebles.com.ar/product-category/mas-vendidos/",
];

const FORBIDDEN_TAGS = [
	"svg",
	"form",
	"input",
	"i",
	"use",
	"top",
	"ol",
	"small",
	"footer",
	"textarea",
	"select",
	"nav",
	"td",
	"table",
	"font",
	"script",
	"meta",
	"iframe",
	"b",
	"header",
	"aside",
	"section",
	"time",
	"address",
	"figure",
	"figcaption",
	"details",
	"summary",
	"mark",
	"progress",
	"meter",
];

const FORBIDDEN_CLASSES = [
	"[object Object]",
	"mobile",
	"search",
	"filter",
	"hidden",
	"[object SVGAnimatedString]",
	"fake-svg-icon",
	"empty",
	"nav-",
	"navbar",
	"dropdown",
	"accordion",
	"sidebar",
	"toggle",
	"close",
	"collapse",
	"fade",
	"hide",
	"invisible",
	"sr-only",
	"screen-reader",
	"visually-hidden",
];

const FORBIDDEN_TEXT = [
	"©",
	"Contacto",
	"whatsapp",
	"Navega",
	"buscar",
	"Blog",
	"Home",
	"Filtrar",
	"Filtros",
	"Envio",
	"envios",
	"compra",
	"Realizamos",
	"@",
	"Email",
	"?",
	"hs",
	"inicio",
	"carrito",
	"Ordenar",
	"Cliente",
	"Agregar",
	"Facebook",
	"Instagram",
	"Youtube",
	"novedades",
	"IMPORTANTE",
	"Contraseña",
	"Sesion",
	"Comprobantes",
	"Iniciar",
	"¡Atencion!",
	"¡Pagálo en muchas",
	"Andreani",
	"Calcular",
	"Política",
	"Medios",
	"Redes",
	"Defensa",
	"ingresá",
	"arrepentimiento",
	"Login",
	"Register",
	"Mi cuenta",
	"Cerrar sesión",
	"Wishlist",
	"Lista de deseos",
	"Comparar",
	"Newsletter",
	"Suscrib",
	"Menú",
	"Menu",
	"Buscar",
	"Search",
	"Ver todo",
	"Más info",
	"Leer más",
	"Siguiente",
	"Anterior",
	"Página",
	"Mostrar",
	"Ordenar por",
	"Filtrar por",
	"Categorías",
	"Subcategorías",
	"Copyright",
	"Derechos reservados",
	"Términos",
	"Condiciones",
	"Privacidad",
	"Cookies",
	"CUIT",
	"Razón social",
	"Horarios",
	"Atención",
	"Servicio técnico",
	"Consulta",
	"Disponibilidad",
	"Desarrollado y Diseñado",
	"Mis Pedidos",
	"Retira en",
	"Categorias",
	"Seguinos",
	"Hola!",
	"responde en pocos minutos",
	"Nuestro equipo",
	"Comunícate",
	"Soporte",
	"indicator",
	"departments",
	"+54",
	"+5491",
	"+5493",
	"artículos en total",
	"Información",
	"Promociones",
	"Bancarias",
	"Garantía",
	"devoluciones",
	"Preguntas Frecuentes",
	"Arma tu",
	"Armá tu",
	"Tu PC",
	"Contactanos",
	"Ayuda",
	"Servicio Tecnico",
	"dataFiscal",
	"codigo postal",
	"Ingresa tu",
	"resultado",
	"Continuar",
	"Cerrar",
];

const OUTPUT_DIR = "./resultsElements";

export async function extractDomElements() {
	const successfulPages = [];
	const failedPages = [];

	for (let i = 0; i < URLS_TO_SCRAPE.length; i++) {
		const url = URLS_TO_SCRAPE[i];
		console.log(`Processing ${url} (${i + 1}/${URLS_TO_SCRAPE.length})`);

		try {
			const pageData = await scrapePage(url);
			successfulPages.push(pageData);
			console.log(
				` ${pageData.pageName}: extracted ${pageData.elements.length} elements ` +
					`(processed ${pageData.stats.processed}, filtered ${pageData.stats.filtered})`
			);
		} catch (error) {
			console.error(` Failed to process ${url}:`, error.message);
			failedPages.push({ url, error: error.message });
		}
	}

	await saveResults(successfulPages, failedPages);

	console.log("\n=== Summary ===");
	console.log(`Successful: ${successfulPages.length}`);
	console.log(`Failed: ${failedPages.length}`);
}

async function scrapePage(url) {
	const browser = await chromium.launch();
	const page = await browser.newPage();

	try {
		await page.goto(url, {
			waitUntil: "domcontentloaded",
			timeout: 120000,
		});

		const { elements, stats } = await page.evaluate(
			({ forbiddenTags, forbiddenClasses, forbiddenText }) => {
				function shouldFilterElement(element) {
					const tag = element.tagName.toLowerCase();
					const className = element.className ? element.className.toString() : "";
					const text = element.textContent?.trim() || "";

					if (forbiddenTags.includes(tag)) {
						return true;
					}

					if (forbiddenClasses.some((fc) => className.includes(fc))) {
						return true;
					}

					if (forbiddenText.some((ft) => text.toLowerCase().includes(ft.toLowerCase()))) {
						return true;
					}

					// Allow img, anchor, and content tags even without className
					const isImportantTag = [
						"img",
						"a",
						"h1",
						"h2",
						"h3",
						"h4",
						"h5",
						"h6",
						"p",
						"span",
						"div",
					].includes(tag);
					const hasNoClassName = !element.className;

					if (hasNoClassName && !isImportantTag) {
						return true;
					}

					return false;
				}

				const elements = [];
				const domElements = document.querySelectorAll("*:not(body):not(header)");

				let processed = 0;
				let filtered = 0;

				domElements.forEach((element) => {
					processed++;

					if (!shouldFilterElement(element)) {
						const tag = element.tagName.toLowerCase();
						elements.push({
							tag: tag,
							class: element.className ? element.className.toString() : "",
							text_preview: element.textContent?.trim().substring(0, 100) || "",
							link:
								tag === "a"
									? element.getAttribute("href")
									: tag === "img"
										? element.getAttribute("src")
										: "",
							// isValid:
							// type:
						});
					} else {
						filtered++;
					}
				});

				return { elements, stats: { processed, filtered } };
			},
			{
				forbiddenTags: FORBIDDEN_TAGS,
				forbiddenClasses: FORBIDDEN_CLASSES,
				forbiddenText: FORBIDDEN_TEXT,
			}
		);

		const pageName = extractPageName(url);

		return {
			pageName,
			url,
			elements,
			stats,
		};
	} finally {
		await browser.close();
	}
}

async function saveResults(successfulPages, failedPages) {
	await fs.mkdir(OUTPUT_DIR, { recursive: true });

	await fs.writeFile(
		`./scrapingWithAI/playwright/${OUTPUT_DIR}/elementsToClassify.json`,
		JSON.stringify(successfulPages, null, 2)
	);

	const allElements = successfulPages.flatMap((page) => page.elements);
	const csvHeader = '"tag","class","text_preview","href"';
	const csvRows = allElements.map((el) => {
		return [
			escapeCsvField(el.tag),
			escapeCsvField(el.class),
			escapeCsvField(el.text_preview),
			escapeCsvField(el.href),
		].join(",");
	});

	await fs.writeFile(
		`./scrapingWithAI/playwright/${OUTPUT_DIR}/elementsDataset.csv`,
		[csvHeader, ...csvRows].join("\n")
	);

	if (failedPages.length > 0) {
		await fs.writeFile(
			`./scrapingWithAI/playwright/${OUTPUT_DIR}/failed_pages.json`,
			JSON.stringify(failedPages, null, 2)
		);
	}

	console.log(`\n Results saved to ${OUTPUT_DIR}/`);
}

function extractPageName(url) {
	const hostname = new URL(url).hostname.replace("www.", "");
	return hostname.replace(/\.(com|ar|net|com\.ar)$/, "");
}

function escapeCsvField(field) {
	if (field == null) return '""';
	const str = String(field);
	if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
		return '"' + str.replace(/"/g, '""') + '"';
	}
	return '"' + str + '"';
}

extractDomElements();
