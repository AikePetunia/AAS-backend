import pLimit from "p-limit";
import { cheerioAxiosScraping } from "./cheerioAxiosScraping.mjs";
import { fetchScraping } from "./fetchScraping.mjs";
import { storesInformation } from "../config/storesInformation.mjs";
import fs from "fs/promises";
import { all } from "axios";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { Meilisearch } from "meilisearch";
import { PlaywrightScraping } from "./playwrightScraping.mjs";
import productsSynonms from "./productsSynonms.json" with { type: "json" };
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const meilisearch = new Meilisearch({
	host: process.env.MEILISEARCH_URL,
	apiKey: process.env.MEILISEARCH_ADMIN_API_KEY,
});

async function loadFailedStores() {
	try {
		const content = await fs.readFile("./data/failedStores.json", "utf-8");
		return JSON.parse(content);
	} catch (error) {
		console.log("failed to load failed stores", error);
		return [];
	}
}

const limit = pLimit(5);
const storesEntries = Object.entries(storesInformation); // esto es el nombre de la tienda en su config (armyTech: new SiteConfig)
const allProducts = [];
const storeRuns = [];
const storeToTest = null; // it's by entry name. Use null for ignoring
const storeAmountToTest = 1;
const storePagesToTest = 1;
const failedStores = await loadFailedStores();
const globalSeen = new Set();
let i = 0;

// entra tienda por tienda, y dentro de cada tienda entra categoría por categoría
export async function scrapeStores() {
	for (const [storeName, config] of storesEntries) {
		if (i >= storeAmountToTest) break;
		if (storeToTest && storeName !== storeToTest) continue;

		const runId = Date.now();
		let storeProducts = [];
		const storeTasks = [];

		// ! Solo axios interceptando un fetch.
		if (config.public_fetching_url) {
			console.log("tienda con public fetching", storeName);
			storeTasks.push(limit(() => fetchScraping(config, runId)));
		} else {
			console.log("cheerio + axios con", storeName);
			const storeToAccess = config.store_url;
			let j = 0;

			storeRuns.push({ store_id: config.store_id, run_id: runId });

			for (const categoryPath of config.pages) {
				// testeo rutas
				if (j >= storePagesToTest) break;

				let fullCategoryUrl = storeToAccess + categoryPath;
				storeTasks.push(
					limit(() => cheerioAxiosScraping(fullCategoryUrl, config, globalSeen, runId))
				);
				j++;
			}
		}

		// escribimos resultados por tienda
		let storeResults = await Promise.all(storeTasks);
		storeProducts = storeResults.flat();

		if (
			storeProducts.length != 0 &&
			!config.public_fetching_url &&
			!failedStores.includes(storeName)
		) {
			console.log("Cheerio no trajo nada, pruebo Playwright con", storeName);
			const scraper = new PlaywrightScraping(config, runId, globalSeen);
			storeProducts = await scraper.scrapeProducts();
		}

		if (storeProducts.length != 0) {
			await fs.writeFile(`./data/raw/${storeName}.json`, JSON.stringify(storeProducts, null, 2));
		} else {
			if (!failedStores.includes(storeName)) {
				failedStores.push(storeName);
				await fs.writeFile(`./data/failedStores.json`, JSON.stringify(failedStores, null, 2));
			}
		}

		allProducts.push(...storeProducts);
		await fs.writeFile(`./data/raw/allProducts.json`, JSON.stringify(allProducts, null, 2));
		i++;
	}

	// inserto datos a supabase y indexo en meilisearch.
	const uniqueProductsByListingId = [
		...new Map(allProducts.map((product) => [product.listing_id, product])).values(),
	];
	const { data, error } = await supabase
		.from("products")
		.upsert(uniqueProductsByListingId)
		.select();
	if (error) throw error;

	await index_products();
	await increment_missing();
	await purge_products();
}

await scrapeStores();

async function index_products() {
	// hago products + datos stores, para darselos al indice de meilisearch
	const { data: dbProducts, error: error } = await supabase
		.from("products")
		.select(`*, stores!fk_store ( trust_factor )`);
	if (error) throw error;

	const productsForMeili = dbProducts.map((product) => ({
		...product,
		trust_factor: product.stores?.trust_factor,
	}));

	console.log("indexing to meilisearch...");
	const index = meilisearch.index("products");

	const enqueuedTask = await index.addDocuments(productsForMeili, { primaryKey: "listing_id" });
	const finishedTask = await meilisearch.tasks.waitForTask(enqueuedTask.taskUid, {
		timeOutMs: 120000,
	});

	if (finishedTask.status !== "succeeded") {
		console.error("Meilisearch task failed:", finishedTask.error);
		throw new Error("Fallo la indexacion en Meilisearch");
	}

		console.log("insertando diccionario a Meilisearch");
		await index.updateSynonyms({
	"adaptador": [
		"adaptador de corriente",
		"adaptador usb",
		"conversor"
	],
	"adaptador de corriente": [
		"adaptador",
		"adaptador usb",
		"conversor"
	],
	"adaptador multipuerto usb": [
		"concentrador usb",
		"hub usb",
		"hubusb"
	],
	"adaptador usb": [
		"adaptador",
		"adaptador de corriente",
		"conversor"
	],
	"adorno para escritorio": [
		"estatua decorativa",
		"figura coleccionable",
		"figura decorativa",
		"figuradecorativa"
	],
	"afiche": [
		"cuadro decorativo",
		"lamina decorativa",
		"lámina decorativa",
		"poster",
		"póster"
	],
	"afiche de anime": [
		"cuadro de anime",
		"lamina de anime",
		"lámina de anime",
		"poster de anime",
		"posteranime",
		"print de anime",
		"póster de anime"
	],
	"aio": [
		"kit de refrigeracion liquida",
		"liquid cooling",
		"refrigeracion liquida",
		"refrigeración líquida",
		"water cooler",
		"watercooling"
	],
	"aislante acustico": [
		"espuma acustica",
		"panel acustico",
		"panel acústico",
		"panelacustico"
	],
	"alfombra": [
		"alfombra decorativa",
		"alfombra gamer",
		"alfombra para setup"
	],
	"alfombra decorativa": [
		"alfombra",
		"alfombra gamer",
		"alfombra para setup"
	],
	"alfombra gamer": [
		"alfombra",
		"alfombra decorativa",
		"alfombra para setup"
	],
	"alfombra para mouse": [
		"alfombrilla",
		"base para mouse",
		"mousepad",
		"mousepad gamer",
		"mousepad xxl",
		"pad mouse"
	],
	"alfombra para setup": [
		"alfombra",
		"alfombra decorativa",
		"alfombra gamer"
	],
	"alfombrilla": [
		"alfombra para mouse",
		"base para mouse",
		"mousepad",
		"mousepad gamer",
		"mousepad xxl",
		"pad mouse"
	],
	"altavoces": [
		"bafles",
		"parlantes",
		"parlantes gamer",
		"parlantes para pc",
		"speakers"
	],
	"auriculares": [
		"auriculares con microfono",
		"auriculares con micrófono",
		"auriculares gamer",
		"auriculares inalambricos",
		"auriculares inalámbricos",
		"cascos",
		"headset"
	],
	"auriculares con microfono": [
		"auriculares",
		"auriculares con micrófono",
		"auriculares gamer",
		"auriculares inalambricos",
		"auriculares inalámbricos",
		"cascos",
		"headset"
	],
	"auriculares con micrófono": [
		"auriculares",
		"auriculares con microfono",
		"auriculares gamer",
		"auriculares inalambricos",
		"auriculares inalámbricos",
		"cascos",
		"headset"
	],
	"auriculares gamer": [
		"auriculares",
		"auriculares con microfono",
		"auriculares con micrófono",
		"auriculares inalambricos",
		"auriculares inalámbricos",
		"cascos",
		"headset"
	],
	"auriculares inalambricos": [
		"auriculares",
		"auriculares con microfono",
		"auriculares con micrófono",
		"auriculares gamer",
		"auriculares inalámbricos",
		"cascos",
		"headset"
	],
	"auriculares inalámbricos": [
		"auriculares",
		"auriculares con microfono",
		"auriculares con micrófono",
		"auriculares gamer",
		"auriculares inalambricos",
		"cascos",
		"headset"
	],
	"bafles": [
		"altavoces",
		"parlantes",
		"parlantes gamer",
		"parlantes para pc",
		"speakers"
	],
	"bandeja organizadora": [
		"organizador de escritorio",
		"organizador de utiles",
		"organizador de útiles",
		"organizadorescritorio",
		"portalapices",
		"portalápices"
	],
	"base ajustable de monitor": [
		"brazo monitor",
		"brazo para monitor",
		"monitor arm",
		"soporte para monitor",
		"soportemonitor"
	],
	"base cargadora": [
		"basecargadora",
		"cargador inalambrico",
		"cargador inalámbrico",
		"charging dock",
		"estacion de carga"
	],
	"base para cpu": [
		"soporte elevador de gabinete",
		"soporte para gabinete",
		"soportecpu"
	],
	"base para mouse": [
		"alfombra para mouse",
		"alfombrilla",
		"mousepad",
		"mousepad gamer",
		"mousepad xxl",
		"pad mouse"
	],
	"basecargadora": [
		"base cargadora",
		"cargador inalambrico",
		"cargador inalámbrico",
		"charging dock",
		"estacion de carga"
	],
	"bateria de respaldo": [
		"batería de respaldo",
		"estabilizador",
		"sistema de alimentacion ininterrumpida",
		"ups"
	],
	"batería de respaldo": [
		"bateria de respaldo",
		"estabilizador",
		"sistema de alimentacion ininterrumpida",
		"ups"
	],
	"biblioteca": [
		"estante",
		"estante para libros",
		"estanteria",
		"estantería",
		"modulo estanteria",
		"mueble estanteria",
		"mueble estantería",
		"repisa",
		"repisa decorativa",
		"repisa flotante"
	],
	"board": [
		"mb",
		"mother",
		"motherboard",
		"placa base",
		"placa madre",
		"placa principal"
	],
	"bolsa de anime": [
		"bolsa de tela",
		"bolsa ecologica",
		"bolsa ecológica",
		"bolso tote",
		"tote bag",
		"totebag"
	],
	"bolsa de tela": [
		"bolsa de anime",
		"bolsa ecologica",
		"bolsa ecológica",
		"bolso tote",
		"tote bag",
		"totebag"
	],
	"bolsa ecologica": [
		"bolsa de anime",
		"bolsa de tela",
		"bolsa ecológica",
		"bolso tote",
		"tote bag",
		"totebag"
	],
	"bolsa ecológica": [
		"bolsa de anime",
		"bolsa de tela",
		"bolsa ecologica",
		"bolso tote",
		"tote bag",
		"totebag"
	],
	"bolso tote": [
		"bolsa de anime",
		"bolsa de tela",
		"bolsa ecologica",
		"bolsa ecológica",
		"tote bag",
		"totebag"
	],
	"boom arm": [
		"brazo para microfono",
		"brazo para micrófono",
		"micarm",
		"soporte de brazo para mic"
	],
	"brazo monitor": [
		"base ajustable de monitor",
		"brazo para monitor",
		"monitor arm",
		"soporte para monitor",
		"soportemonitor"
	],
	"brazo para microfono": [
		"boom arm",
		"brazo para micrófono",
		"micarm",
		"soporte de brazo para mic"
	],
	"brazo para micrófono": [
		"boom arm",
		"brazo para microfono",
		"micarm",
		"soporte de brazo para mic"
	],
	"brazo para monitor": [
		"base ajustable de monitor",
		"brazo monitor",
		"monitor arm",
		"soporte para monitor",
		"soportemonitor"
	],
	"broche": [
		"insignia",
		"pin",
		"pin metalico",
		"pin metálico",
		"pines"
	],
	"cable de datos": [
		"cable usb",
		"cable usb-c",
		"cableusb"
	],
	"cable de datos sata": [
		"cable sata",
		"cablesata"
	],
	"cable de red": [
		"cable ethernet",
		"cable utp",
		"cablered"
	],
	"cable displayport": [
		"cable dp",
		"cabledisplayport",
		"displayport"
	],
	"cable dp": [
		"cable displayport",
		"cabledisplayport",
		"displayport"
	],
	"cable ethernet": [
		"cable de red",
		"cable utp",
		"cablered"
	],
	"cable hdmi": [
		"cablehdmi",
		"hdmi"
	],
	"cable sata": [
		"cable de datos sata",
		"cablesata"
	],
	"cable usb": [
		"cable de datos",
		"cable usb-c",
		"cableusb"
	],
	"cable usb-c": [
		"cable de datos",
		"cable usb",
		"cableusb"
	],
	"cable utp": [
		"cable de red",
		"cable ethernet",
		"cablered"
	],
	"cabledisplayport": [
		"cable displayport",
		"cable dp",
		"displayport"
	],
	"cablehdmi": [
		"cable hdmi",
		"hdmi"
	],
	"cablered": [
		"cable de red",
		"cable ethernet",
		"cable utp"
	],
	"cablesata": [
		"cable de datos sata",
		"cable sata"
	],
	"cableusb": [
		"cable de datos",
		"cable usb",
		"cable usb-c"
	],
	"caja de pc": [
		"case",
		"chasis",
		"gabinete",
		"gabinete atx",
		"gabinete gamer",
		"gabinete micro atx",
		"gabinete mini itx",
		"gabinete transparente",
		"torre"
	],
	"camara para streaming": [
		"camara web",
		"cámara para streaming",
		"cámara web",
		"webcam",
		"webcam gamer"
	],
	"camara web": [
		"camara para streaming",
		"cámara para streaming",
		"cámara web",
		"webcam",
		"webcam gamer"
	],
	"camiseta": [
		"camiseta estampada",
		"playera",
		"playera de anime",
		"remera",
		"remera de anime",
		"remera estampada",
		"remeraanime"
	],
	"camiseta estampada": [
		"camiseta",
		"playera",
		"playera de anime",
		"remera",
		"remera de anime",
		"remera estampada",
		"remeraanime"
	],
	"canaleta": [
		"clip organizador de cables",
		"organizador de cables",
		"organizadorcables",
		"pasacables"
	],
	"cap": [
		"gorra",
		"gorra bordada",
		"gorra de anime"
	],
	"capturadora": [
		"capturadora de video",
		"capture card",
		"placa capturadora",
		"tarjeta de captura"
	],
	"capturadora de video": [
		"capturadora",
		"capture card",
		"placa capturadora",
		"tarjeta de captura"
	],
	"capture card": [
		"capturadora",
		"capturadora de video",
		"placa capturadora",
		"tarjeta de captura"
	],
	"card reader": [
		"lector de tarjetas",
		"lector sd",
		"lectortarjetas"
	],
	"cargador": [
		"cargador para laptop",
		"fuente de alimentacion notebook",
		"fuente de notebook"
	],
	"cargador inalambrico": [
		"base cargadora",
		"basecargadora",
		"cargador inalámbrico",
		"charging dock",
		"estacion de carga"
	],
	"cargador inalámbrico": [
		"base cargadora",
		"basecargadora",
		"cargador inalambrico",
		"charging dock",
		"estacion de carga"
	],
	"cargador para laptop": [
		"cargador",
		"fuente de alimentacion notebook",
		"fuente de notebook"
	],
	"cascos": [
		"auriculares",
		"auriculares con microfono",
		"auriculares con micrófono",
		"auriculares gamer",
		"auriculares inalambricos",
		"auriculares inalámbricos",
		"headset"
	],
	"case": [
		"caja de pc",
		"chasis",
		"gabinete",
		"gabinete atx",
		"gabinete gamer",
		"gabinete micro atx",
		"gabinete mini itx",
		"gabinete transparente",
		"torre"
	],
	"charging dock": [
		"base cargadora",
		"basecargadora",
		"cargador inalambrico",
		"cargador inalámbrico",
		"estacion de carga"
	],
	"charm": [
		"keychain",
		"llavero",
		"llavero acrilico",
		"llavero acrílico",
		"llavero de anime"
	],
	"chasis": [
		"caja de pc",
		"case",
		"gabinete",
		"gabinete atx",
		"gabinete gamer",
		"gabinete micro atx",
		"gabinete mini itx",
		"gabinete transparente",
		"torre"
	],
	"chip": [
		"cpu",
		"cpu amd",
		"cpu intel",
		"micro",
		"microprocesador",
		"procesador",
		"procesador de escritorio",
		"procesador gamer",
		"procesador multinucleo",
		"procesador multinúcleo",
		"unidad central de procesamiento"
	],
	"clip organizador de cables": [
		"canaleta",
		"organizador de cables",
		"organizadorcables",
		"pasacables"
	],
	"comic": [
		"comic book",
		"cómic",
		"historieta"
	],
	"comic book": [
		"comic",
		"cómic",
		"historieta"
	],
	"comic manga": [
		"cómic manga",
		"manga",
		"manga japones",
		"manga japonés",
		"novela grafica",
		"novela gráfica",
		"tomo de manga"
	],
	"compuesto termico": [
		"grasa termica",
		"grasa térmica",
		"pasta termica",
		"pasta térmica",
		"pastatermica",
		"thermal paste"
	],
	"compuesto termico para cpu": [
		"pasta",
		"pasta termica",
		"pasta térmica"
	],
	"computadora portatil": [
		"laptop",
		"notebook",
		"notebook gamer",
		"portatil",
		"portátil"
	],
	"concentrador usb": [
		"adaptador multipuerto usb",
		"hub usb",
		"hubusb"
	],
	"conmutador de red": [
		"hub de red",
		"switch de red",
		"switchred"
	],
	"conmutador kvm": [
		"kvm",
		"switch kvm"
	],
	"consola": [
		"consola de videojuegos",
		"consola gamer",
		"videoconsola"
	],
	"consola de streaming": [
		"controlador de streaming",
		"panel de streaming",
		"stream deck",
		"streamdeck"
	],
	"consola de videojuegos": [
		"consola",
		"consola gamer",
		"videoconsola"
	],
	"consola gamer": [
		"consola",
		"consola de videojuegos",
		"videoconsola"
	],
	"control": [
		"control inalambrico",
		"control inalámbrico",
		"gamepad",
		"joystick",
		"mando"
	],
	"control inalambrico": [
		"control",
		"control inalámbrico",
		"gamepad",
		"joystick",
		"mando"
	],
	"control inalámbrico": [
		"control",
		"control inalambrico",
		"gamepad",
		"joystick",
		"mando"
	],
	"controlador de streaming": [
		"consola de streaming",
		"panel de streaming",
		"stream deck",
		"streamdeck"
	],
	"conversor": [
		"adaptador",
		"adaptador de corriente",
		"adaptador usb"
	],
	"cooler": [
		"cooler cpu",
		"cooler gamer",
		"disipador",
		"disipador de calor",
		"disipador para procesador",
		"fan cooler",
		"ventilador cpu"
	],
	"cooler case": [
		"fan",
		"fan rgb",
		"ventilador",
		"ventilador 120mm",
		"ventilador 140mm",
		"ventilador de gabinete"
	],
	"cooler cpu": [
		"cooler",
		"cooler gamer",
		"disipador",
		"disipador de calor",
		"disipador para procesador",
		"fan cooler",
		"ventilador cpu"
	],
	"cooler gamer": [
		"cooler",
		"cooler cpu",
		"disipador",
		"disipador de calor",
		"disipador para procesador",
		"fan cooler",
		"ventilador cpu"
	],
	"cover": [
		"funda",
		"funda antipolvo",
		"funda para consola",
		"funda para control",
		"funda para teclado",
		"funda protectora"
	],
	"cpu": [
		"chip",
		"cpu amd",
		"cpu intel",
		"micro",
		"microprocesador",
		"procesador",
		"procesador de escritorio",
		"procesador gamer",
		"procesador multinucleo",
		"procesador multinúcleo",
		"unidad central de procesamiento"
	],
	"cpu amd": [
		"chip",
		"cpu",
		"cpu intel",
		"micro",
		"microprocesador",
		"procesador",
		"procesador de escritorio",
		"procesador gamer",
		"procesador multinucleo",
		"procesador multinúcleo",
		"unidad central de procesamiento"
	],
	"cpu intel": [
		"chip",
		"cpu",
		"cpu amd",
		"micro",
		"microprocesador",
		"procesador",
		"procesador de escritorio",
		"procesador gamer",
		"procesador multinucleo",
		"procesador multinúcleo",
		"unidad central de procesamiento"
	],
	"cuadro de anime": [
		"afiche de anime",
		"lamina de anime",
		"lámina de anime",
		"poster de anime",
		"posteranime",
		"print de anime",
		"póster de anime"
	],
	"cuadro decorativo": [
		"afiche",
		"lamina decorativa",
		"lámina decorativa",
		"poster",
		"póster"
	],
	"cámara para streaming": [
		"camara para streaming",
		"camara web",
		"cámara web",
		"webcam",
		"webcam gamer"
	],
	"cámara web": [
		"camara para streaming",
		"camara web",
		"cámara para streaming",
		"webcam",
		"webcam gamer"
	],
	"cómic": [
		"comic",
		"comic book",
		"historieta"
	],
	"cómic manga": [
		"comic manga",
		"manga",
		"manga japones",
		"manga japonés",
		"novela grafica",
		"novela gráfica",
		"tomo de manga"
	],
	"desk": [
		"escritorio",
		"escritorio ajustable",
		"escritorio con cajones",
		"escritorio electrico",
		"escritorio electrico ajustable",
		"escritorio en l",
		"escritorio gamer",
		"escritorio para setup",
		"mesa",
		"mesa de computacion",
		"mesa de computación",
		"mesa elevable",
		"mesa para pc"
	],
	"dimm": [
		"kit de memoria",
		"memoria",
		"memoria de acceso aleatorio",
		"memoria ram",
		"modulo de memoria",
		"módulo de memoria",
		"ram"
	],
	"disco de almacenamiento": [
		"disco duro",
		"disco mecanico",
		"disco mecánico",
		"disco rigido",
		"disco rígido",
		"hdd"
	],
	"disco duro": [
		"disco de almacenamiento",
		"disco mecanico",
		"disco mecánico",
		"disco rigido",
		"disco rígido",
		"hdd"
	],
	"disco duro externo": [
		"disco externo",
		"discoexterno",
		"ssd externo"
	],
	"disco externo": [
		"disco duro externo",
		"discoexterno",
		"ssd externo"
	],
	"disco m2": [
		"disco solido",
		"disco sólido",
		"m.2",
		"nvme",
		"ssd",
		"unidad de estado solido",
		"unidad de estado sólido",
		"unidad ssd"
	],
	"disco mecanico": [
		"disco de almacenamiento",
		"disco duro",
		"disco mecánico",
		"disco rigido",
		"disco rígido",
		"hdd"
	],
	"disco mecánico": [
		"disco de almacenamiento",
		"disco duro",
		"disco mecanico",
		"disco rigido",
		"disco rígido",
		"hdd"
	],
	"disco rigido": [
		"disco de almacenamiento",
		"disco duro",
		"disco mecanico",
		"disco mecánico",
		"disco rígido",
		"hdd"
	],
	"disco rígido": [
		"disco de almacenamiento",
		"disco duro",
		"disco mecanico",
		"disco mecánico",
		"disco rigido",
		"hdd"
	],
	"disco solido": [
		"disco m2",
		"disco sólido",
		"m.2",
		"nvme",
		"ssd",
		"unidad de estado solido",
		"unidad de estado sólido",
		"unidad ssd"
	],
	"disco sólido": [
		"disco m2",
		"disco solido",
		"m.2",
		"nvme",
		"ssd",
		"unidad de estado solido",
		"unidad de estado sólido",
		"unidad ssd"
	],
	"discoexterno": [
		"disco duro externo",
		"disco externo",
		"ssd externo"
	],
	"disipador": [
		"cooler",
		"cooler cpu",
		"cooler gamer",
		"disipador de calor",
		"disipador para procesador",
		"fan cooler",
		"ventilador cpu"
	],
	"disipador de calor": [
		"cooler",
		"cooler cpu",
		"cooler gamer",
		"disipador",
		"disipador para procesador",
		"fan cooler",
		"ventilador cpu"
	],
	"disipador para procesador": [
		"cooler",
		"cooler cpu",
		"cooler gamer",
		"disipador",
		"disipador de calor",
		"fan cooler",
		"ventilador cpu"
	],
	"display": [
		"monitor",
		"monitor 144hz",
		"monitor 4k",
		"monitor curvo",
		"monitor gamer",
		"monitor para pc",
		"monitor ultrawide",
		"pantalla"
	],
	"displayport": [
		"cable displayport",
		"cable dp",
		"cabledisplayport"
	],
	"enrutador": [
		"modem router",
		"módem router",
		"router",
		"router wifi",
		"ruteador"
	],
	"escritorio": [
		"desk",
		"escritorio ajustable",
		"escritorio con cajones",
		"escritorio electrico",
		"escritorio electrico ajustable",
		"escritorio en l",
		"escritorio gamer",
		"escritorio para setup",
		"mesa",
		"mesa de computacion",
		"mesa de computación",
		"mesa elevable",
		"mesa para pc"
	],
	"escritorio ajustable": [
		"desk",
		"escritorio",
		"escritorio con cajones",
		"escritorio electrico",
		"escritorio electrico ajustable",
		"escritorio en l",
		"escritorio gamer",
		"escritorio para setup",
		"mesa",
		"mesa de computacion",
		"mesa de computación",
		"mesa elevable",
		"mesa para pc"
	],
	"escritorio con cajones": [
		"desk",
		"escritorio",
		"escritorio ajustable",
		"escritorio electrico",
		"escritorio electrico ajustable",
		"escritorio en l",
		"escritorio gamer",
		"escritorio para setup",
		"mesa",
		"mesa de computacion",
		"mesa de computación",
		"mesa elevable",
		"mesa para pc"
	],
	"escritorio electrico": [
		"desk",
		"escritorio",
		"escritorio ajustable",
		"escritorio con cajones",
		"escritorio electrico ajustable",
		"escritorio en l",
		"escritorio gamer",
		"escritorio para setup",
		"mesa",
		"mesa de computacion",
		"mesa de computación",
		"mesa elevable",
		"mesa para pc"
	],
	"escritorio electrico ajustable": [
		"desk",
		"escritorio",
		"escritorio ajustable",
		"escritorio con cajones",
		"escritorio electrico",
		"escritorio en l",
		"escritorio gamer",
		"escritorio para setup",
		"mesa",
		"mesa de computacion",
		"mesa de computación",
		"mesa elevable",
		"mesa para pc"
	],
	"escritorio en l": [
		"desk",
		"escritorio",
		"escritorio ajustable",
		"escritorio con cajones",
		"escritorio electrico",
		"escritorio electrico ajustable",
		"escritorio gamer",
		"escritorio para setup",
		"mesa",
		"mesa de computacion",
		"mesa de computación",
		"mesa elevable",
		"mesa para pc"
	],
	"escritorio gamer": [
		"desk",
		"escritorio",
		"escritorio ajustable",
		"escritorio con cajones",
		"escritorio electrico",
		"escritorio electrico ajustable",
		"escritorio en l",
		"escritorio para setup",
		"mesa",
		"mesa de computacion",
		"mesa de computación",
		"mesa elevable",
		"mesa para pc"
	],
	"escritorio para setup": [
		"desk",
		"escritorio",
		"escritorio ajustable",
		"escritorio con cajones",
		"escritorio electrico",
		"escritorio electrico ajustable",
		"escritorio en l",
		"escritorio gamer",
		"mesa",
		"mesa de computacion",
		"mesa de computación",
		"mesa elevable",
		"mesa para pc"
	],
	"espuma acustica": [
		"aislante acustico",
		"panel acustico",
		"panel acústico",
		"panelacustico"
	],
	"estabilizador": [
		"bateria de respaldo",
		"batería de respaldo",
		"sistema de alimentacion ininterrumpida",
		"ups"
	],
	"estacion de carga": [
		"base cargadora",
		"basecargadora",
		"cargador inalambrico",
		"cargador inalámbrico",
		"charging dock"
	],
	"estante": [
		"biblioteca",
		"estante para libros",
		"estanteria",
		"estantería",
		"modulo estanteria",
		"mueble estanteria",
		"mueble estantería",
		"repisa",
		"repisa decorativa",
		"repisa flotante"
	],
	"estante para libros": [
		"biblioteca",
		"estante",
		"estanteria",
		"estantería",
		"modulo estanteria",
		"mueble estanteria",
		"mueble estantería",
		"repisa",
		"repisa decorativa",
		"repisa flotante"
	],
	"estanteria": [
		"biblioteca",
		"estante",
		"estante para libros",
		"estantería",
		"modulo estanteria",
		"mueble estanteria",
		"mueble estantería",
		"repisa",
		"repisa decorativa",
		"repisa flotante"
	],
	"estantería": [
		"biblioteca",
		"estante",
		"estante para libros",
		"estanteria",
		"modulo estanteria",
		"mueble estanteria",
		"mueble estantería",
		"repisa",
		"repisa decorativa",
		"repisa flotante"
	],
	"estatua de anime": [
		"figura coleccionable",
		"figura de accion",
		"figura de acción",
		"figura de anime",
		"figure",
		"muneco",
		"muñeco",
		"nendoroid"
	],
	"estatua decorativa": [
		"adorno para escritorio",
		"figura coleccionable",
		"figura decorativa",
		"figuradecorativa"
	],
	"extensor hdmi": [
		"extensorhdmi",
		"repetidor hdmi",
		"splitter hdmi"
	],
	"extensorhdmi": [
		"extensor hdmi",
		"repetidor hdmi",
		"splitter hdmi"
	],
	"fan": [
		"cooler case",
		"fan rgb",
		"ventilador",
		"ventilador 120mm",
		"ventilador 140mm",
		"ventilador de gabinete"
	],
	"fan cooler": [
		"cooler",
		"cooler cpu",
		"cooler gamer",
		"disipador",
		"disipador de calor",
		"disipador para procesador",
		"ventilador cpu"
	],
	"fan rgb": [
		"cooler case",
		"fan",
		"ventilador",
		"ventilador 120mm",
		"ventilador 140mm",
		"ventilador de gabinete"
	],
	"figura coleccionable": [
		"adorno para escritorio",
		"estatua de anime",
		"estatua decorativa",
		"figura de accion",
		"figura de acción",
		"figura de anime",
		"figura decorativa",
		"figuradecorativa",
		"figure",
		"muneco",
		"muñeco",
		"nendoroid"
	],
	"figura de accion": [
		"estatua de anime",
		"figura coleccionable",
		"figura de acción",
		"figura de anime",
		"figure",
		"muneco",
		"muñeco",
		"nendoroid"
	],
	"figura de acción": [
		"estatua de anime",
		"figura coleccionable",
		"figura de accion",
		"figura de anime",
		"figure",
		"muneco",
		"muñeco",
		"nendoroid"
	],
	"figura de anime": [
		"estatua de anime",
		"figura coleccionable",
		"figura de accion",
		"figura de acción",
		"figure",
		"muneco",
		"muñeco",
		"nendoroid"
	],
	"figura de coleccion funko": [
		"figura de colección funko",
		"figura funko",
		"funko",
		"funko pop",
		"muneco funko",
		"muñeco funko"
	],
	"figura de colección funko": [
		"figura de coleccion funko",
		"figura funko",
		"funko",
		"funko pop",
		"muneco funko",
		"muñeco funko"
	],
	"figura decorativa": [
		"adorno para escritorio",
		"estatua decorativa",
		"figura coleccionable",
		"figuradecorativa"
	],
	"figura funko": [
		"figura de coleccion funko",
		"figura de colección funko",
		"funko",
		"funko pop",
		"muneco funko",
		"muñeco funko"
	],
	"figuradecorativa": [
		"adorno para escritorio",
		"estatua decorativa",
		"figura coleccionable",
		"figura decorativa"
	],
	"figure": [
		"estatua de anime",
		"figura coleccionable",
		"figura de accion",
		"figura de acción",
		"figura de anime",
		"muneco",
		"muñeco",
		"nendoroid"
	],
	"filtro anti pop": [
		"filtro para microfono",
		"filtropop",
		"pop filter"
	],
	"filtro antipolvo": [
		"filtro para gabinete",
		"gabinetefiltro",
		"malla filtrante"
	],
	"filtro para gabinete": [
		"filtro antipolvo",
		"gabinetefiltro",
		"malla filtrante"
	],
	"filtro para microfono": [
		"filtro anti pop",
		"filtropop",
		"pop filter"
	],
	"filtropop": [
		"filtro anti pop",
		"filtro para microfono",
		"pop filter"
	],
	"fuente": [
		"fuente atx",
		"fuente de alimentacion",
		"fuente de alimentación",
		"fuente de poder",
		"fuente modular",
		"fuente para pc",
		"power supply",
		"psu"
	],
	"fuente atx": [
		"fuente",
		"fuente de alimentacion",
		"fuente de alimentación",
		"fuente de poder",
		"fuente modular",
		"fuente para pc",
		"power supply",
		"psu"
	],
	"fuente de alimentacion": [
		"fuente",
		"fuente atx",
		"fuente de alimentación",
		"fuente de poder",
		"fuente modular",
		"fuente para pc",
		"power supply",
		"psu"
	],
	"fuente de alimentacion notebook": [
		"cargador",
		"cargador para laptop",
		"fuente de notebook"
	],
	"fuente de alimentación": [
		"fuente",
		"fuente atx",
		"fuente de alimentacion",
		"fuente de poder",
		"fuente modular",
		"fuente para pc",
		"power supply",
		"psu"
	],
	"fuente de notebook": [
		"cargador",
		"cargador para laptop",
		"fuente de alimentacion notebook"
	],
	"fuente de poder": [
		"fuente",
		"fuente atx",
		"fuente de alimentacion",
		"fuente de alimentación",
		"fuente modular",
		"fuente para pc",
		"power supply",
		"psu"
	],
	"fuente modular": [
		"fuente",
		"fuente atx",
		"fuente de alimentacion",
		"fuente de alimentación",
		"fuente de poder",
		"fuente para pc",
		"power supply",
		"psu"
	],
	"fuente para pc": [
		"fuente",
		"fuente atx",
		"fuente de alimentacion",
		"fuente de alimentación",
		"fuente de poder",
		"fuente modular",
		"power supply",
		"psu"
	],
	"funda": [
		"cover",
		"funda antipolvo",
		"funda para consola",
		"funda para control",
		"funda para teclado",
		"funda protectora"
	],
	"funda antipolvo": [
		"cover",
		"funda",
		"funda para consola",
		"funda para control",
		"funda para teclado",
		"funda protectora"
	],
	"funda para consola": [
		"cover",
		"funda",
		"funda antipolvo",
		"funda para control",
		"funda para teclado",
		"funda protectora"
	],
	"funda para control": [
		"cover",
		"funda",
		"funda antipolvo",
		"funda para consola",
		"funda para teclado",
		"funda protectora"
	],
	"funda para teclado": [
		"cover",
		"funda",
		"funda antipolvo",
		"funda para consola",
		"funda para control",
		"funda protectora"
	],
	"funda protectora": [
		"cover",
		"funda",
		"funda antipolvo",
		"funda para consola",
		"funda para control",
		"funda para teclado"
	],
	"funko": [
		"figura de coleccion funko",
		"figura de colección funko",
		"figura funko",
		"funko pop",
		"muneco funko",
		"muñeco funko"
	],
	"funko pop": [
		"figura de coleccion funko",
		"figura de colección funko",
		"figura funko",
		"funko",
		"muneco funko",
		"muñeco funko"
	],
	"gabinete": [
		"caja de pc",
		"case",
		"chasis",
		"gabinete atx",
		"gabinete gamer",
		"gabinete micro atx",
		"gabinete mini itx",
		"gabinete transparente",
		"torre"
	],
	"gabinete atx": [
		"caja de pc",
		"case",
		"chasis",
		"gabinete",
		"gabinete gamer",
		"gabinete micro atx",
		"gabinete mini itx",
		"gabinete transparente",
		"torre"
	],
	"gabinete gamer": [
		"caja de pc",
		"case",
		"chasis",
		"gabinete",
		"gabinete atx",
		"gabinete micro atx",
		"gabinete mini itx",
		"gabinete transparente",
		"torre"
	],
	"gabinete micro atx": [
		"caja de pc",
		"case",
		"chasis",
		"gabinete",
		"gabinete atx",
		"gabinete gamer",
		"gabinete mini itx",
		"gabinete transparente",
		"torre"
	],
	"gabinete mini itx": [
		"caja de pc",
		"case",
		"chasis",
		"gabinete",
		"gabinete atx",
		"gabinete gamer",
		"gabinete micro atx",
		"gabinete transparente",
		"torre"
	],
	"gabinete transparente": [
		"caja de pc",
		"case",
		"chasis",
		"gabinete",
		"gabinete atx",
		"gabinete gamer",
		"gabinete micro atx",
		"gabinete mini itx",
		"torre"
	],
	"gabinetefiltro": [
		"filtro antipolvo",
		"filtro para gabinete",
		"malla filtrante"
	],
	"gamepad": [
		"control",
		"control inalambrico",
		"control inalámbrico",
		"joystick",
		"mando"
	],
	"gancho para auriculares": [
		"ganchoauriculares",
		"headset stand",
		"soporte para auriculares"
	],
	"ganchoauriculares": [
		"gancho para auriculares",
		"headset stand",
		"soporte para auriculares"
	],
	"gddr": [
		"gpu",
		"grafica",
		"gráfica",
		"placa de video",
		"placa grafica",
		"placa gráfica",
		"tarjeta de video",
		"tarjeta grafica",
		"tarjeta gráfica",
		"unidad de procesamiento grafico",
		"unidad de procesamiento gráfico",
		"vga",
		"video"
	],
	"gorra": [
		"cap",
		"gorra bordada",
		"gorra de anime"
	],
	"gorra bordada": [
		"cap",
		"gorra",
		"gorra de anime"
	],
	"gorra de anime": [
		"cap",
		"gorra",
		"gorra bordada"
	],
	"gpu": [
		"gddr",
		"grafica",
		"gráfica",
		"placa de video",
		"placa grafica",
		"placa gráfica",
		"tarjeta de video",
		"tarjeta grafica",
		"tarjeta gráfica",
		"unidad de procesamiento grafico",
		"unidad de procesamiento gráfico",
		"vga",
		"video"
	],
	"grafica": [
		"gddr",
		"gpu",
		"gráfica",
		"placa de video",
		"placa grafica",
		"placa gráfica",
		"tarjeta de video",
		"tarjeta grafica",
		"tarjeta gráfica",
		"unidad de procesamiento grafico",
		"unidad de procesamiento gráfico",
		"vga",
		"video"
	],
	"grasa termica": [
		"compuesto termico",
		"grasa térmica",
		"pasta termica",
		"pasta térmica",
		"pastatermica",
		"thermal paste"
	],
	"grasa térmica": [
		"compuesto termico",
		"grasa termica",
		"pasta termica",
		"pasta térmica",
		"pastatermica",
		"thermal paste"
	],
	"gráfica": [
		"gddr",
		"gpu",
		"grafica",
		"placa de video",
		"placa grafica",
		"placa gráfica",
		"tarjeta de video",
		"tarjeta grafica",
		"tarjeta gráfica",
		"unidad de procesamiento grafico",
		"unidad de procesamiento gráfico",
		"vga",
		"video"
	],
	"hdd": [
		"disco de almacenamiento",
		"disco duro",
		"disco mecanico",
		"disco mecánico",
		"disco rigido",
		"disco rígido"
	],
	"hdmi": [
		"cable hdmi",
		"cablehdmi"
	],
	"headset": [
		"auriculares",
		"auriculares con microfono",
		"auriculares con micrófono",
		"auriculares gamer",
		"auriculares inalambricos",
		"auriculares inalámbricos",
		"cascos"
	],
	"headset stand": [
		"gancho para auriculares",
		"ganchoauriculares",
		"soporte para auriculares"
	],
	"historieta": [
		"comic",
		"comic book",
		"cómic"
	],
	"hub de red": [
		"conmutador de red",
		"switch de red",
		"switchred"
	],
	"hub usb": [
		"adaptador multipuerto usb",
		"concentrador usb",
		"hubusb"
	],
	"hubusb": [
		"adaptador multipuerto usb",
		"concentrador usb",
		"hub usb"
	],
	"iluminacion led": [
		"iluminacion rgb",
		"iluminación led",
		"iluminación rgb",
		"luces rgb",
		"luzled",
		"tira de luces",
		"tira led"
	],
	"iluminacion rgb": [
		"iluminacion led",
		"iluminación led",
		"iluminación rgb",
		"luces rgb",
		"luzled",
		"tira de luces",
		"tira led"
	],
	"iluminación led": [
		"iluminacion led",
		"iluminacion rgb",
		"iluminación rgb",
		"luces rgb",
		"luzled",
		"tira de luces",
		"tira led"
	],
	"iluminación rgb": [
		"iluminacion led",
		"iluminacion rgb",
		"iluminación led",
		"luces rgb",
		"luzled",
		"tira de luces",
		"tira led"
	],
	"impresora": [
		"impresora laser",
		"impresora láser",
		"impresora multifuncion",
		"impresora multifunción"
	],
	"impresora laser": [
		"impresora",
		"impresora láser",
		"impresora multifuncion",
		"impresora multifunción"
	],
	"impresora láser": [
		"impresora",
		"impresora laser",
		"impresora multifuncion",
		"impresora multifunción"
	],
	"impresora multifuncion": [
		"impresora",
		"impresora laser",
		"impresora láser",
		"impresora multifunción"
	],
	"impresora multifunción": [
		"impresora",
		"impresora laser",
		"impresora láser",
		"impresora multifuncion"
	],
	"insignia": [
		"broche",
		"pin",
		"pin metalico",
		"pin metálico",
		"pines"
	],
	"interfaz de audio": [
		"placa de sonido",
		"placadesonido",
		"sound card",
		"tarjeta de sonido"
	],
	"ipad": [
		"tablet",
		"tablet grafica",
		"tablet gráfica",
		"tableta"
	],
	"joystick": [
		"control",
		"control inalambrico",
		"control inalámbrico",
		"gamepad",
		"mando"
	],
	"keyboard": [
		"teclado",
		"teclado con cable",
		"teclado gamer",
		"teclado inalambrico",
		"teclado inalámbrico",
		"teclado mecanico",
		"teclado mecánico",
		"teclado retroiluminado"
	],
	"keychain": [
		"charm",
		"llavero",
		"llavero acrilico",
		"llavero acrílico",
		"llavero de anime"
	],
	"kit de memoria": [
		"dimm",
		"memoria",
		"memoria de acceso aleatorio",
		"memoria ram",
		"modulo de memoria",
		"módulo de memoria",
		"ram"
	],
	"kit de refrigeracion liquida": [
		"aio",
		"liquid cooling",
		"refrigeracion liquida",
		"refrigeración líquida",
		"water cooler",
		"watercooling"
	],
	"kvm": [
		"conmutador kvm",
		"switch kvm"
	],
	"lamina de anime": [
		"afiche de anime",
		"cuadro de anime",
		"lámina de anime",
		"poster de anime",
		"posteranime",
		"print de anime",
		"póster de anime"
	],
	"lamina decorativa": [
		"afiche",
		"cuadro decorativo",
		"lámina decorativa",
		"poster",
		"póster"
	],
	"lampara de escritorio": [
		"lampara led",
		"lampara para setup",
		"lamparaled",
		"lámpara de escritorio",
		"lámpara led"
	],
	"lampara led": [
		"lampara de escritorio",
		"lampara para setup",
		"lamparaled",
		"lámpara de escritorio",
		"lámpara led"
	],
	"lampara para setup": [
		"lampara de escritorio",
		"lampara led",
		"lamparaled",
		"lámpara de escritorio",
		"lámpara led"
	],
	"lamparaled": [
		"lampara de escritorio",
		"lampara led",
		"lampara para setup",
		"lámpara de escritorio",
		"lámpara led"
	],
	"laptop": [
		"computadora portatil",
		"notebook",
		"notebook gamer",
		"portatil",
		"portátil"
	],
	"lector de tarjetas": [
		"card reader",
		"lector sd",
		"lectortarjetas"
	],
	"lector sd": [
		"card reader",
		"lector de tarjetas",
		"lectortarjetas"
	],
	"lectortarjetas": [
		"card reader",
		"lector de tarjetas",
		"lector sd"
	],
	"libro": [
		"libro de tapa blanda",
		"libro de tapa dura",
		"libro ilustrado",
		"novela"
	],
	"libro de tapa blanda": [
		"libro",
		"libro de tapa dura",
		"libro ilustrado",
		"novela"
	],
	"libro de tapa dura": [
		"libro",
		"libro de tapa blanda",
		"libro ilustrado",
		"novela"
	],
	"libro ilustrado": [
		"libro",
		"libro de tapa blanda",
		"libro de tapa dura",
		"novela"
	],
	"liquid cooling": [
		"aio",
		"kit de refrigeracion liquida",
		"refrigeracion liquida",
		"refrigeración líquida",
		"water cooler",
		"watercooling"
	],
	"llavero": [
		"charm",
		"keychain",
		"llavero acrilico",
		"llavero acrílico",
		"llavero de anime"
	],
	"llavero acrilico": [
		"charm",
		"keychain",
		"llavero",
		"llavero acrílico",
		"llavero de anime"
	],
	"llavero acrílico": [
		"charm",
		"keychain",
		"llavero",
		"llavero acrilico",
		"llavero de anime"
	],
	"llavero de anime": [
		"charm",
		"keychain",
		"llavero",
		"llavero acrilico",
		"llavero acrílico"
	],
	"luces rgb": [
		"iluminacion led",
		"iluminacion rgb",
		"iluminación led",
		"iluminación rgb",
		"luzled",
		"tira de luces",
		"tira led"
	],
	"luzled": [
		"iluminacion led",
		"iluminacion rgb",
		"iluminación led",
		"iluminación rgb",
		"luces rgb",
		"tira de luces",
		"tira led"
	],
	"lámina de anime": [
		"afiche de anime",
		"cuadro de anime",
		"lamina de anime",
		"poster de anime",
		"posteranime",
		"print de anime",
		"póster de anime"
	],
	"lámina decorativa": [
		"afiche",
		"cuadro decorativo",
		"lamina decorativa",
		"poster",
		"póster"
	],
	"lámpara de escritorio": [
		"lampara de escritorio",
		"lampara led",
		"lampara para setup",
		"lamparaled",
		"lámpara led"
	],
	"lámpara led": [
		"lampara de escritorio",
		"lampara led",
		"lampara para setup",
		"lamparaled",
		"lámpara de escritorio"
	],
	"m.2": [
		"disco m2",
		"disco solido",
		"disco sólido",
		"nvme",
		"ssd",
		"unidad de estado solido",
		"unidad de estado sólido",
		"unidad ssd"
	],
	"malla filtrante": [
		"filtro antipolvo",
		"filtro para gabinete",
		"gabinetefiltro"
	],
	"mando": [
		"control",
		"control inalambrico",
		"control inalámbrico",
		"gamepad",
		"joystick"
	],
	"manga": [
		"comic manga",
		"cómic manga",
		"manga japones",
		"manga japonés",
		"novela grafica",
		"novela gráfica",
		"tomo de manga"
	],
	"manga japones": [
		"comic manga",
		"cómic manga",
		"manga",
		"manga japonés",
		"novela grafica",
		"novela gráfica",
		"tomo de manga"
	],
	"manga japonés": [
		"comic manga",
		"cómic manga",
		"manga",
		"manga japones",
		"novela grafica",
		"novela gráfica",
		"tomo de manga"
	],
	"mb": [
		"board",
		"mother",
		"motherboard",
		"placa base",
		"placa madre",
		"placa principal"
	],
	"memoria": [
		"dimm",
		"kit de memoria",
		"memoria de acceso aleatorio",
		"memoria ram",
		"modulo de memoria",
		"módulo de memoria",
		"ram"
	],
	"memoria de acceso aleatorio": [
		"dimm",
		"kit de memoria",
		"memoria",
		"memoria ram",
		"modulo de memoria",
		"módulo de memoria",
		"ram"
	],
	"memoria ram": [
		"dimm",
		"kit de memoria",
		"memoria",
		"memoria de acceso aleatorio",
		"modulo de memoria",
		"módulo de memoria",
		"ram"
	],
	"memoria sd": [
		"tarjeta microsd",
		"tarjeta sd",
		"tarjetasd"
	],
	"memoria usb": [
		"pen drive",
		"pendrive",
		"unidad flash"
	],
	"mesa": [
		"desk",
		"escritorio",
		"escritorio ajustable",
		"escritorio con cajones",
		"escritorio electrico",
		"escritorio electrico ajustable",
		"escritorio en l",
		"escritorio gamer",
		"escritorio para setup",
		"mesa de computacion",
		"mesa de computación",
		"mesa elevable",
		"mesa para pc"
	],
	"mesa de computacion": [
		"desk",
		"escritorio",
		"escritorio ajustable",
		"escritorio con cajones",
		"escritorio electrico",
		"escritorio electrico ajustable",
		"escritorio en l",
		"escritorio gamer",
		"escritorio para setup",
		"mesa",
		"mesa de computación",
		"mesa elevable",
		"mesa para pc"
	],
	"mesa de computación": [
		"desk",
		"escritorio",
		"escritorio ajustable",
		"escritorio con cajones",
		"escritorio electrico",
		"escritorio electrico ajustable",
		"escritorio en l",
		"escritorio gamer",
		"escritorio para setup",
		"mesa",
		"mesa de computacion",
		"mesa elevable",
		"mesa para pc"
	],
	"mesa elevable": [
		"desk",
		"escritorio",
		"escritorio ajustable",
		"escritorio con cajones",
		"escritorio electrico",
		"escritorio electrico ajustable",
		"escritorio en l",
		"escritorio gamer",
		"escritorio para setup",
		"mesa",
		"mesa de computacion",
		"mesa de computación",
		"mesa para pc"
	],
	"mesa para pc": [
		"desk",
		"escritorio",
		"escritorio ajustable",
		"escritorio con cajones",
		"escritorio electrico",
		"escritorio electrico ajustable",
		"escritorio en l",
		"escritorio gamer",
		"escritorio para setup",
		"mesa",
		"mesa de computacion",
		"mesa de computación",
		"mesa elevable"
	],
	"mic": [
		"microfono",
		"microfono de condensador",
		"microfono gamer",
		"microfono para streaming",
		"micrófono",
		"micrófono de condensador"
	],
	"micarm": [
		"boom arm",
		"brazo para microfono",
		"brazo para micrófono",
		"soporte de brazo para mic"
	],
	"micro": [
		"chip",
		"cpu",
		"cpu amd",
		"cpu intel",
		"microprocesador",
		"procesador",
		"procesador de escritorio",
		"procesador gamer",
		"procesador multinucleo",
		"procesador multinúcleo",
		"unidad central de procesamiento"
	],
	"microfono": [
		"mic",
		"microfono de condensador",
		"microfono gamer",
		"microfono para streaming",
		"micrófono",
		"micrófono de condensador"
	],
	"microfono de condensador": [
		"mic",
		"microfono",
		"microfono gamer",
		"microfono para streaming",
		"micrófono",
		"micrófono de condensador"
	],
	"microfono gamer": [
		"mic",
		"microfono",
		"microfono de condensador",
		"microfono para streaming",
		"micrófono",
		"micrófono de condensador"
	],
	"microfono para streaming": [
		"mic",
		"microfono",
		"microfono de condensador",
		"microfono gamer",
		"micrófono",
		"micrófono de condensador"
	],
	"microprocesador": [
		"chip",
		"cpu",
		"cpu amd",
		"cpu intel",
		"micro",
		"procesador",
		"procesador de escritorio",
		"procesador gamer",
		"procesador multinucleo",
		"procesador multinúcleo",
		"unidad central de procesamiento"
	],
	"micrófono": [
		"mic",
		"microfono",
		"microfono de condensador",
		"microfono gamer",
		"microfono para streaming",
		"micrófono de condensador"
	],
	"micrófono de condensador": [
		"mic",
		"microfono",
		"microfono de condensador",
		"microfono gamer",
		"microfono para streaming",
		"micrófono"
	],
	"mini planta": [
		"planta artificial",
		"planta decorativa",
		"planta para escritorio",
		"plantadecorativa"
	],
	"modem": [
		"modem de internet",
		"modem wifi",
		"módem"
	],
	"modem de internet": [
		"modem",
		"modem wifi",
		"módem"
	],
	"modem router": [
		"enrutador",
		"módem router",
		"router",
		"router wifi",
		"ruteador"
	],
	"modem wifi": [
		"modem",
		"modem de internet",
		"módem"
	],
	"modulo de memoria": [
		"dimm",
		"kit de memoria",
		"memoria",
		"memoria de acceso aleatorio",
		"memoria ram",
		"módulo de memoria",
		"ram"
	],
	"modulo estanteria": [
		"biblioteca",
		"estante",
		"estante para libros",
		"estanteria",
		"estantería",
		"mueble estanteria",
		"mueble estantería",
		"repisa",
		"repisa decorativa",
		"repisa flotante"
	],
	"monitor": [
		"display",
		"monitor 144hz",
		"monitor 4k",
		"monitor curvo",
		"monitor gamer",
		"monitor para pc",
		"monitor ultrawide",
		"pantalla"
	],
	"monitor 144hz": [
		"display",
		"monitor",
		"monitor 4k",
		"monitor curvo",
		"monitor gamer",
		"monitor para pc",
		"monitor ultrawide",
		"pantalla"
	],
	"monitor 4k": [
		"display",
		"monitor",
		"monitor 144hz",
		"monitor curvo",
		"monitor gamer",
		"monitor para pc",
		"monitor ultrawide",
		"pantalla"
	],
	"monitor arm": [
		"base ajustable de monitor",
		"brazo monitor",
		"brazo para monitor",
		"soporte para monitor",
		"soportemonitor"
	],
	"monitor curvo": [
		"display",
		"monitor",
		"monitor 144hz",
		"monitor 4k",
		"monitor gamer",
		"monitor para pc",
		"monitor ultrawide",
		"pantalla"
	],
	"monitor gamer": [
		"display",
		"monitor",
		"monitor 144hz",
		"monitor 4k",
		"monitor curvo",
		"monitor para pc",
		"monitor ultrawide",
		"pantalla"
	],
	"monitor para pc": [
		"display",
		"monitor",
		"monitor 144hz",
		"monitor 4k",
		"monitor curvo",
		"monitor gamer",
		"monitor ultrawide",
		"pantalla"
	],
	"monitor ultrawide": [
		"display",
		"monitor",
		"monitor 144hz",
		"monitor 4k",
		"monitor curvo",
		"monitor gamer",
		"monitor para pc",
		"pantalla"
	],
	"mother": [
		"board",
		"mb",
		"motherboard",
		"placa base",
		"placa madre",
		"placa principal"
	],
	"motherboard": [
		"board",
		"mb",
		"mother",
		"placa base",
		"placa madre",
		"placa principal"
	],
	"mouse": [
		"mouse con cable",
		"mouse gamer",
		"mouse inalambrico",
		"mouse inalámbrico",
		"mouse optico",
		"mouse óptico",
		"perifericos",
		"periféricos",
		"raton",
		"ratón"
	],
	"mouse bungee": [
		"mousebungee",
		"soporte de cable para mouse",
		"sujeta cable de mouse"
	],
	"mouse con cable": [
		"mouse",
		"mouse gamer",
		"mouse inalambrico",
		"mouse inalámbrico",
		"mouse optico",
		"mouse óptico",
		"perifericos",
		"periféricos",
		"raton",
		"ratón"
	],
	"mouse gamer": [
		"mouse",
		"mouse con cable",
		"mouse inalambrico",
		"mouse inalámbrico",
		"mouse optico",
		"mouse óptico",
		"perifericos",
		"periféricos",
		"raton",
		"ratón"
	],
	"mouse inalambrico": [
		"mouse",
		"mouse con cable",
		"mouse gamer",
		"mouse inalámbrico",
		"mouse optico",
		"mouse óptico",
		"perifericos",
		"periféricos",
		"raton",
		"ratón"
	],
	"mouse inalámbrico": [
		"mouse",
		"mouse con cable",
		"mouse gamer",
		"mouse inalambrico",
		"mouse optico",
		"mouse óptico",
		"perifericos",
		"periféricos",
		"raton",
		"ratón"
	],
	"mouse optico": [
		"mouse",
		"mouse con cable",
		"mouse gamer",
		"mouse inalambrico",
		"mouse inalámbrico",
		"mouse óptico",
		"perifericos",
		"periféricos",
		"raton",
		"ratón"
	],
	"mouse óptico": [
		"mouse",
		"mouse con cable",
		"mouse gamer",
		"mouse inalambrico",
		"mouse inalámbrico",
		"mouse optico",
		"perifericos",
		"periféricos",
		"raton",
		"ratón"
	],
	"mousebungee": [
		"mouse bungee",
		"soporte de cable para mouse",
		"sujeta cable de mouse"
	],
	"mousepad": [
		"alfombra para mouse",
		"alfombrilla",
		"base para mouse",
		"mousepad gamer",
		"mousepad xxl",
		"pad mouse"
	],
	"mousepad gamer": [
		"alfombra para mouse",
		"alfombrilla",
		"base para mouse",
		"mousepad",
		"mousepad xxl",
		"pad mouse"
	],
	"mousepad xxl": [
		"alfombra para mouse",
		"alfombrilla",
		"base para mouse",
		"mousepad",
		"mousepad gamer",
		"pad mouse"
	],
	"mueble estanteria": [
		"biblioteca",
		"estante",
		"estante para libros",
		"estanteria",
		"estantería",
		"modulo estanteria",
		"mueble estantería",
		"repisa",
		"repisa decorativa",
		"repisa flotante"
	],
	"mueble estantería": [
		"biblioteca",
		"estante",
		"estante para libros",
		"estanteria",
		"estantería",
		"modulo estanteria",
		"mueble estanteria",
		"repisa",
		"repisa decorativa",
		"repisa flotante"
	],
	"mug": [
		"taza",
		"taza coleccionable",
		"taza de anime",
		"taza de ceramica",
		"taza de cerámica",
		"taza tematica",
		"taza temática"
	],
	"muneco": [
		"estatua de anime",
		"figura coleccionable",
		"figura de accion",
		"figura de acción",
		"figura de anime",
		"figure",
		"muñeco",
		"nendoroid"
	],
	"muneco de peluche": [
		"muñeco de peluche",
		"peluche",
		"peluche de anime",
		"plush"
	],
	"muneco funko": [
		"figura de coleccion funko",
		"figura de colección funko",
		"figura funko",
		"funko",
		"funko pop",
		"muñeco funko"
	],
	"muñeco": [
		"estatua de anime",
		"figura coleccionable",
		"figura de accion",
		"figura de acción",
		"figura de anime",
		"figure",
		"muneco",
		"nendoroid"
	],
	"muñeco de peluche": [
		"muneco de peluche",
		"peluche",
		"peluche de anime",
		"plush"
	],
	"muñeco funko": [
		"figura de coleccion funko",
		"figura de colección funko",
		"figura funko",
		"funko",
		"funko pop",
		"muneco funko"
	],
	"módem": [
		"modem",
		"modem de internet",
		"modem wifi"
	],
	"módem router": [
		"enrutador",
		"modem router",
		"router",
		"router wifi",
		"ruteador"
	],
	"módulo de memoria": [
		"dimm",
		"kit de memoria",
		"memoria",
		"memoria de acceso aleatorio",
		"memoria ram",
		"modulo de memoria",
		"ram"
	],
	"nendoroid": [
		"estatua de anime",
		"figura coleccionable",
		"figura de accion",
		"figura de acción",
		"figura de anime",
		"figure",
		"muneco",
		"muñeco"
	],
	"notebook": [
		"computadora portatil",
		"laptop",
		"notebook gamer",
		"portatil",
		"portátil"
	],
	"notebook gamer": [
		"computadora portatil",
		"laptop",
		"notebook",
		"portatil",
		"portátil"
	],
	"novela": [
		"libro",
		"libro de tapa blanda",
		"libro de tapa dura",
		"libro ilustrado"
	],
	"novela grafica": [
		"comic manga",
		"cómic manga",
		"manga",
		"manga japones",
		"manga japonés",
		"novela gráfica",
		"tomo de manga"
	],
	"novela gráfica": [
		"comic manga",
		"cómic manga",
		"manga",
		"manga japones",
		"manga japonés",
		"novela grafica",
		"tomo de manga"
	],
	"nvme": [
		"disco m2",
		"disco solido",
		"disco sólido",
		"m.2",
		"ssd",
		"unidad de estado solido",
		"unidad de estado sólido",
		"unidad ssd"
	],
	"organizador de cables": [
		"canaleta",
		"clip organizador de cables",
		"organizadorcables",
		"pasacables"
	],
	"organizador de escritorio": [
		"bandeja organizadora",
		"organizador de utiles",
		"organizador de útiles",
		"organizadorescritorio",
		"portalapices",
		"portalápices"
	],
	"organizador de utiles": [
		"bandeja organizadora",
		"organizador de escritorio",
		"organizador de útiles",
		"organizadorescritorio",
		"portalapices",
		"portalápices"
	],
	"organizador de útiles": [
		"bandeja organizadora",
		"organizador de escritorio",
		"organizador de utiles",
		"organizadorescritorio",
		"portalapices",
		"portalápices"
	],
	"organizadorcables": [
		"canaleta",
		"clip organizador de cables",
		"organizador de cables",
		"pasacables"
	],
	"organizadorescritorio": [
		"bandeja organizadora",
		"organizador de escritorio",
		"organizador de utiles",
		"organizador de útiles",
		"portalapices",
		"portalápices"
	],
	"pad mouse": [
		"alfombra para mouse",
		"alfombrilla",
		"base para mouse",
		"mousepad",
		"mousepad gamer",
		"mousepad xxl"
	],
	"panel acustico": [
		"aislante acustico",
		"espuma acustica",
		"panel acústico",
		"panelacustico"
	],
	"panel acústico": [
		"aislante acustico",
		"espuma acustica",
		"panel acustico",
		"panelacustico"
	],
	"panel de streaming": [
		"consola de streaming",
		"controlador de streaming",
		"stream deck",
		"streamdeck"
	],
	"panelacustico": [
		"aislante acustico",
		"espuma acustica",
		"panel acustico",
		"panel acústico"
	],
	"pantalla": [
		"display",
		"monitor",
		"monitor 144hz",
		"monitor 4k",
		"monitor curvo",
		"monitor gamer",
		"monitor para pc",
		"monitor ultrawide"
	],
	"parche": [
		"parche bordado",
		"parche termoadhesivo",
		"patch"
	],
	"parche bordado": [
		"parche",
		"parche termoadhesivo",
		"patch"
	],
	"parche termoadhesivo": [
		"parche",
		"parche bordado",
		"patch"
	],
	"parlantes": [
		"altavoces",
		"bafles",
		"parlantes gamer",
		"parlantes para pc",
		"speakers"
	],
	"parlantes gamer": [
		"altavoces",
		"bafles",
		"parlantes",
		"parlantes para pc",
		"speakers"
	],
	"parlantes para pc": [
		"altavoces",
		"bafles",
		"parlantes",
		"parlantes gamer",
		"speakers"
	],
	"pasacables": [
		"canaleta",
		"clip organizador de cables",
		"organizador de cables",
		"organizadorcables"
	],
	"pasta": [
		"compuesto termico para cpu",
		"pasta termica",
		"pasta térmica"
	],
	"pasta termica": [
		"compuesto termico",
		"compuesto termico para cpu",
		"grasa termica",
		"grasa térmica",
		"pasta",
		"pasta térmica",
		"pastatermica",
		"thermal paste"
	],
	"pasta térmica": [
		"compuesto termico",
		"compuesto termico para cpu",
		"grasa termica",
		"grasa térmica",
		"pasta",
		"pasta termica",
		"pastatermica",
		"thermal paste"
	],
	"pastatermica": [
		"compuesto termico",
		"grasa termica",
		"grasa térmica",
		"pasta termica",
		"pasta térmica",
		"thermal paste"
	],
	"patch": [
		"parche",
		"parche bordado",
		"parche termoadhesivo"
	],
	"peluche": [
		"muneco de peluche",
		"muñeco de peluche",
		"peluche de anime",
		"plush"
	],
	"peluche de anime": [
		"muneco de peluche",
		"muñeco de peluche",
		"peluche",
		"plush"
	],
	"pen drive": [
		"memoria usb",
		"pendrive",
		"unidad flash"
	],
	"pendrive": [
		"memoria usb",
		"pen drive",
		"unidad flash"
	],
	"perifericos": [
		"mouse",
		"mouse con cable",
		"mouse gamer",
		"mouse inalambrico",
		"mouse inalámbrico",
		"mouse optico",
		"mouse óptico",
		"periféricos",
		"raton",
		"ratón"
	],
	"periféricos": [
		"mouse",
		"mouse con cable",
		"mouse gamer",
		"mouse inalambrico",
		"mouse inalámbrico",
		"mouse optico",
		"mouse óptico",
		"perifericos",
		"raton",
		"ratón"
	],
	"pin": [
		"broche",
		"insignia",
		"pin metalico",
		"pin metálico",
		"pines"
	],
	"pin metalico": [
		"broche",
		"insignia",
		"pin",
		"pin metálico",
		"pines"
	],
	"pin metálico": [
		"broche",
		"insignia",
		"pin",
		"pin metalico",
		"pines"
	],
	"pines": [
		"broche",
		"insignia",
		"pin",
		"pin metalico",
		"pin metálico"
	],
	"placa base": [
		"board",
		"mb",
		"mother",
		"motherboard",
		"placa madre",
		"placa principal"
	],
	"placa capturadora": [
		"capturadora",
		"capturadora de video",
		"capture card",
		"tarjeta de captura"
	],
	"placa de sonido": [
		"interfaz de audio",
		"placadesonido",
		"sound card",
		"tarjeta de sonido"
	],
	"placa de video": [
		"gddr",
		"gpu",
		"grafica",
		"gráfica",
		"placa grafica",
		"placa gráfica",
		"tarjeta de video",
		"tarjeta grafica",
		"tarjeta gráfica",
		"unidad de procesamiento grafico",
		"unidad de procesamiento gráfico",
		"vga",
		"video"
	],
	"placa grafica": [
		"gddr",
		"gpu",
		"grafica",
		"gráfica",
		"placa de video",
		"placa gráfica",
		"tarjeta de video",
		"tarjeta grafica",
		"tarjeta gráfica",
		"unidad de procesamiento grafico",
		"unidad de procesamiento gráfico",
		"vga",
		"video"
	],
	"placa gráfica": [
		"gddr",
		"gpu",
		"grafica",
		"gráfica",
		"placa de video",
		"placa grafica",
		"tarjeta de video",
		"tarjeta grafica",
		"tarjeta gráfica",
		"unidad de procesamiento grafico",
		"unidad de procesamiento gráfico",
		"vga",
		"video"
	],
	"placa madre": [
		"board",
		"mb",
		"mother",
		"motherboard",
		"placa base",
		"placa principal"
	],
	"placa principal": [
		"board",
		"mb",
		"mother",
		"motherboard",
		"placa base",
		"placa madre"
	],
	"placadesonido": [
		"interfaz de audio",
		"placa de sonido",
		"sound card",
		"tarjeta de sonido"
	],
	"planta artificial": [
		"mini planta",
		"planta decorativa",
		"planta para escritorio",
		"plantadecorativa"
	],
	"planta decorativa": [
		"mini planta",
		"planta artificial",
		"planta para escritorio",
		"plantadecorativa"
	],
	"planta para escritorio": [
		"mini planta",
		"planta artificial",
		"planta decorativa",
		"plantadecorativa"
	],
	"plantadecorativa": [
		"mini planta",
		"planta artificial",
		"planta decorativa",
		"planta para escritorio"
	],
	"playera": [
		"camiseta",
		"camiseta estampada",
		"playera de anime",
		"remera",
		"remera de anime",
		"remera estampada",
		"remeraanime"
	],
	"playera de anime": [
		"camiseta",
		"camiseta estampada",
		"playera",
		"remera",
		"remera de anime",
		"remera estampada",
		"remeraanime"
	],
	"plush": [
		"muneco de peluche",
		"muñeco de peluche",
		"peluche",
		"peluche de anime"
	],
	"pop filter": [
		"filtro anti pop",
		"filtro para microfono",
		"filtropop"
	],
	"portalapices": [
		"bandeja organizadora",
		"organizador de escritorio",
		"organizador de utiles",
		"organizador de útiles",
		"organizadorescritorio",
		"portalápices"
	],
	"portalápices": [
		"bandeja organizadora",
		"organizador de escritorio",
		"organizador de utiles",
		"organizador de útiles",
		"organizadorescritorio",
		"portalapices"
	],
	"portatil": [
		"computadora portatil",
		"laptop",
		"notebook",
		"notebook gamer",
		"portátil"
	],
	"portátil": [
		"computadora portatil",
		"laptop",
		"notebook",
		"notebook gamer",
		"portatil"
	],
	"poster": [
		"afiche",
		"cuadro decorativo",
		"lamina decorativa",
		"lámina decorativa",
		"póster"
	],
	"poster de anime": [
		"afiche de anime",
		"cuadro de anime",
		"lamina de anime",
		"lámina de anime",
		"posteranime",
		"print de anime",
		"póster de anime"
	],
	"posteranime": [
		"afiche de anime",
		"cuadro de anime",
		"lamina de anime",
		"lámina de anime",
		"poster de anime",
		"print de anime",
		"póster de anime"
	],
	"power supply": [
		"fuente",
		"fuente atx",
		"fuente de alimentacion",
		"fuente de alimentación",
		"fuente de poder",
		"fuente modular",
		"fuente para pc",
		"psu"
	],
	"print de anime": [
		"afiche de anime",
		"cuadro de anime",
		"lamina de anime",
		"lámina de anime",
		"poster de anime",
		"posteranime",
		"póster de anime"
	],
	"procesador": [
		"chip",
		"cpu",
		"cpu amd",
		"cpu intel",
		"micro",
		"microprocesador",
		"procesador de escritorio",
		"procesador gamer",
		"procesador multinucleo",
		"procesador multinúcleo",
		"unidad central de procesamiento"
	],
	"procesador de escritorio": [
		"chip",
		"cpu",
		"cpu amd",
		"cpu intel",
		"micro",
		"microprocesador",
		"procesador",
		"procesador gamer",
		"procesador multinucleo",
		"procesador multinúcleo",
		"unidad central de procesamiento"
	],
	"procesador gamer": [
		"chip",
		"cpu",
		"cpu amd",
		"cpu intel",
		"micro",
		"microprocesador",
		"procesador",
		"procesador de escritorio",
		"procesador multinucleo",
		"procesador multinúcleo",
		"unidad central de procesamiento"
	],
	"procesador multinucleo": [
		"chip",
		"cpu",
		"cpu amd",
		"cpu intel",
		"micro",
		"microprocesador",
		"procesador",
		"procesador de escritorio",
		"procesador gamer",
		"procesador multinúcleo",
		"unidad central de procesamiento"
	],
	"procesador multinúcleo": [
		"chip",
		"cpu",
		"cpu amd",
		"cpu intel",
		"micro",
		"microprocesador",
		"procesador",
		"procesador de escritorio",
		"procesador gamer",
		"procesador multinucleo",
		"unidad central de procesamiento"
	],
	"psu": [
		"fuente",
		"fuente atx",
		"fuente de alimentacion",
		"fuente de alimentación",
		"fuente de poder",
		"fuente modular",
		"fuente para pc",
		"power supply"
	],
	"póster": [
		"afiche",
		"cuadro decorativo",
		"lamina decorativa",
		"lámina decorativa",
		"poster"
	],
	"póster de anime": [
		"afiche de anime",
		"cuadro de anime",
		"lamina de anime",
		"lámina de anime",
		"poster de anime",
		"posteranime",
		"print de anime"
	],
	"ram": [
		"dimm",
		"kit de memoria",
		"memoria",
		"memoria de acceso aleatorio",
		"memoria ram",
		"modulo de memoria",
		"módulo de memoria"
	],
	"raton": [
		"mouse",
		"mouse con cable",
		"mouse gamer",
		"mouse inalambrico",
		"mouse inalámbrico",
		"mouse optico",
		"mouse óptico",
		"perifericos",
		"periféricos",
		"ratón"
	],
	"ratón": [
		"mouse",
		"mouse con cable",
		"mouse gamer",
		"mouse inalambrico",
		"mouse inalámbrico",
		"mouse optico",
		"mouse óptico",
		"perifericos",
		"periféricos",
		"raton"
	],
	"refrigeracion liquida": [
		"aio",
		"kit de refrigeracion liquida",
		"liquid cooling",
		"refrigeración líquida",
		"water cooler",
		"watercooling"
	],
	"refrigeración líquida": [
		"aio",
		"kit de refrigeracion liquida",
		"liquid cooling",
		"refrigeracion liquida",
		"water cooler",
		"watercooling"
	],
	"reloj": [
		"reloj de escritorio",
		"reloj decorativo para setup"
	],
	"reloj de escritorio": [
		"reloj",
		"reloj decorativo para setup"
	],
	"reloj decorativo para setup": [
		"reloj",
		"reloj de escritorio"
	],
	"remera": [
		"camiseta",
		"camiseta estampada",
		"playera",
		"playera de anime",
		"remera de anime",
		"remera estampada",
		"remeraanime"
	],
	"remera de anime": [
		"camiseta",
		"camiseta estampada",
		"playera",
		"playera de anime",
		"remera",
		"remera estampada",
		"remeraanime"
	],
	"remera estampada": [
		"camiseta",
		"camiseta estampada",
		"playera",
		"playera de anime",
		"remera",
		"remera de anime",
		"remeraanime"
	],
	"remeraanime": [
		"camiseta",
		"camiseta estampada",
		"playera",
		"playera de anime",
		"remera",
		"remera de anime",
		"remera estampada"
	],
	"repetidor hdmi": [
		"extensor hdmi",
		"extensorhdmi",
		"splitter hdmi"
	],
	"repisa": [
		"biblioteca",
		"estante",
		"estante para libros",
		"estanteria",
		"estantería",
		"modulo estanteria",
		"mueble estanteria",
		"mueble estantería",
		"repisa decorativa",
		"repisa flotante"
	],
	"repisa decorativa": [
		"biblioteca",
		"estante",
		"estante para libros",
		"estanteria",
		"estantería",
		"modulo estanteria",
		"mueble estanteria",
		"mueble estantería",
		"repisa",
		"repisa flotante"
	],
	"repisa flotante": [
		"biblioteca",
		"estante",
		"estante para libros",
		"estanteria",
		"estantería",
		"modulo estanteria",
		"mueble estanteria",
		"mueble estantería",
		"repisa",
		"repisa decorativa"
	],
	"router": [
		"enrutador",
		"modem router",
		"módem router",
		"router wifi",
		"ruteador"
	],
	"router wifi": [
		"enrutador",
		"modem router",
		"módem router",
		"router",
		"ruteador"
	],
	"ruteador": [
		"enrutador",
		"modem router",
		"módem router",
		"router",
		"router wifi"
	],
	"silla": [
		"silla con reposapies",
		"silla con reposapiés",
		"silla de escritorio",
		"silla de escritorio con ruedas",
		"silla de oficina",
		"silla ergonomica",
		"silla ergonómica",
		"silla gamer",
		"silla giratoria",
		"silla para setup",
		"silla reclinable"
	],
	"silla con reposapies": [
		"silla",
		"silla con reposapiés",
		"silla de escritorio",
		"silla de escritorio con ruedas",
		"silla de oficina",
		"silla ergonomica",
		"silla ergonómica",
		"silla gamer",
		"silla giratoria",
		"silla para setup",
		"silla reclinable"
	],
	"silla con reposapiés": [
		"silla",
		"silla con reposapies",
		"silla de escritorio",
		"silla de escritorio con ruedas",
		"silla de oficina",
		"silla ergonomica",
		"silla ergonómica",
		"silla gamer",
		"silla giratoria",
		"silla para setup",
		"silla reclinable"
	],
	"silla de escritorio": [
		"silla",
		"silla con reposapies",
		"silla con reposapiés",
		"silla de escritorio con ruedas",
		"silla de oficina",
		"silla ergonomica",
		"silla ergonómica",
		"silla gamer",
		"silla giratoria",
		"silla para setup",
		"silla reclinable"
	],
	"silla de escritorio con ruedas": [
		"silla",
		"silla con reposapies",
		"silla con reposapiés",
		"silla de escritorio",
		"silla de oficina",
		"silla ergonomica",
		"silla ergonómica",
		"silla gamer",
		"silla giratoria",
		"silla para setup",
		"silla reclinable"
	],
	"silla de oficina": [
		"silla",
		"silla con reposapies",
		"silla con reposapiés",
		"silla de escritorio",
		"silla de escritorio con ruedas",
		"silla ergonomica",
		"silla ergonómica",
		"silla gamer",
		"silla giratoria",
		"silla para setup",
		"silla reclinable"
	],
	"silla ergonomica": [
		"silla",
		"silla con reposapies",
		"silla con reposapiés",
		"silla de escritorio",
		"silla de escritorio con ruedas",
		"silla de oficina",
		"silla ergonómica",
		"silla gamer",
		"silla giratoria",
		"silla para setup",
		"silla reclinable"
	],
	"silla ergonómica": [
		"silla",
		"silla con reposapies",
		"silla con reposapiés",
		"silla de escritorio",
		"silla de escritorio con ruedas",
		"silla de oficina",
		"silla ergonomica",
		"silla gamer",
		"silla giratoria",
		"silla para setup",
		"silla reclinable"
	],
	"silla gamer": [
		"silla",
		"silla con reposapies",
		"silla con reposapiés",
		"silla de escritorio",
		"silla de escritorio con ruedas",
		"silla de oficina",
		"silla ergonomica",
		"silla ergonómica",
		"silla giratoria",
		"silla para setup",
		"silla reclinable"
	],
	"silla giratoria": [
		"silla",
		"silla con reposapies",
		"silla con reposapiés",
		"silla de escritorio",
		"silla de escritorio con ruedas",
		"silla de oficina",
		"silla ergonomica",
		"silla ergonómica",
		"silla gamer",
		"silla para setup",
		"silla reclinable"
	],
	"silla para setup": [
		"silla",
		"silla con reposapies",
		"silla con reposapiés",
		"silla de escritorio",
		"silla de escritorio con ruedas",
		"silla de oficina",
		"silla ergonomica",
		"silla ergonómica",
		"silla gamer",
		"silla giratoria",
		"silla reclinable"
	],
	"silla reclinable": [
		"silla",
		"silla con reposapies",
		"silla con reposapiés",
		"silla de escritorio",
		"silla de escritorio con ruedas",
		"silla de oficina",
		"silla ergonomica",
		"silla ergonómica",
		"silla gamer",
		"silla giratoria",
		"silla para setup"
	],
	"sistema de alimentacion ininterrumpida": [
		"bateria de respaldo",
		"batería de respaldo",
		"estabilizador",
		"ups"
	],
	"soporte de brazo para mic": [
		"boom arm",
		"brazo para microfono",
		"brazo para micrófono",
		"micarm"
	],
	"soporte de cable para mouse": [
		"mouse bungee",
		"mousebungee",
		"sujeta cable de mouse"
	],
	"soporte elevador de gabinete": [
		"base para cpu",
		"soporte para gabinete",
		"soportecpu"
	],
	"soporte para auriculares": [
		"gancho para auriculares",
		"ganchoauriculares",
		"headset stand"
	],
	"soporte para gabinete": [
		"base para cpu",
		"soporte elevador de gabinete",
		"soportecpu"
	],
	"soporte para monitor": [
		"base ajustable de monitor",
		"brazo monitor",
		"brazo para monitor",
		"monitor arm",
		"soportemonitor"
	],
	"soportecpu": [
		"base para cpu",
		"soporte elevador de gabinete",
		"soporte para gabinete"
	],
	"soportemonitor": [
		"base ajustable de monitor",
		"brazo monitor",
		"brazo para monitor",
		"monitor arm",
		"soporte para monitor"
	],
	"sound card": [
		"interfaz de audio",
		"placa de sonido",
		"placadesonido",
		"tarjeta de sonido"
	],
	"speakers": [
		"altavoces",
		"bafles",
		"parlantes",
		"parlantes gamer",
		"parlantes para pc"
	],
	"splitter hdmi": [
		"extensor hdmi",
		"extensorhdmi",
		"repetidor hdmi"
	],
	"ssd": [
		"disco m2",
		"disco solido",
		"disco sólido",
		"m.2",
		"nvme",
		"unidad de estado solido",
		"unidad de estado sólido",
		"unidad ssd"
	],
	"ssd externo": [
		"disco duro externo",
		"disco externo",
		"discoexterno"
	],
	"stream deck": [
		"consola de streaming",
		"controlador de streaming",
		"panel de streaming",
		"streamdeck"
	],
	"streamdeck": [
		"consola de streaming",
		"controlador de streaming",
		"panel de streaming",
		"stream deck"
	],
	"sujeta cable de mouse": [
		"mouse bungee",
		"mousebungee",
		"soporte de cable para mouse"
	],
	"switch de red": [
		"conmutador de red",
		"hub de red",
		"switchred"
	],
	"switch kvm": [
		"conmutador kvm",
		"kvm"
	],
	"switchred": [
		"conmutador de red",
		"hub de red",
		"switch de red"
	],
	"tablet": [
		"ipad",
		"tablet grafica",
		"tablet gráfica",
		"tableta"
	],
	"tablet grafica": [
		"ipad",
		"tablet",
		"tablet gráfica",
		"tableta"
	],
	"tablet gráfica": [
		"ipad",
		"tablet",
		"tablet grafica",
		"tableta"
	],
	"tableta": [
		"ipad",
		"tablet",
		"tablet grafica",
		"tablet gráfica"
	],
	"tarjeta de captura": [
		"capturadora",
		"capturadora de video",
		"capture card",
		"placa capturadora"
	],
	"tarjeta de sonido": [
		"interfaz de audio",
		"placa de sonido",
		"placadesonido",
		"sound card"
	],
	"tarjeta de video": [
		"gddr",
		"gpu",
		"grafica",
		"gráfica",
		"placa de video",
		"placa grafica",
		"placa gráfica",
		"tarjeta grafica",
		"tarjeta gráfica",
		"unidad de procesamiento grafico",
		"unidad de procesamiento gráfico",
		"vga",
		"video"
	],
	"tarjeta grafica": [
		"gddr",
		"gpu",
		"grafica",
		"gráfica",
		"placa de video",
		"placa grafica",
		"placa gráfica",
		"tarjeta de video",
		"tarjeta gráfica",
		"unidad de procesamiento grafico",
		"unidad de procesamiento gráfico",
		"vga",
		"video"
	],
	"tarjeta gráfica": [
		"gddr",
		"gpu",
		"grafica",
		"gráfica",
		"placa de video",
		"placa grafica",
		"placa gráfica",
		"tarjeta de video",
		"tarjeta grafica",
		"unidad de procesamiento grafico",
		"unidad de procesamiento gráfico",
		"vga",
		"video"
	],
	"tarjeta microsd": [
		"memoria sd",
		"tarjeta sd",
		"tarjetasd"
	],
	"tarjeta sd": [
		"memoria sd",
		"tarjeta microsd",
		"tarjetasd"
	],
	"tarjetasd": [
		"memoria sd",
		"tarjeta microsd",
		"tarjeta sd"
	],
	"taza": [
		"mug",
		"taza coleccionable",
		"taza de anime",
		"taza de ceramica",
		"taza de cerámica",
		"taza tematica",
		"taza temática"
	],
	"taza coleccionable": [
		"mug",
		"taza",
		"taza de anime",
		"taza de ceramica",
		"taza de cerámica",
		"taza tematica",
		"taza temática"
	],
	"taza de anime": [
		"mug",
		"taza",
		"taza coleccionable",
		"taza de ceramica",
		"taza de cerámica",
		"taza tematica",
		"taza temática"
	],
	"taza de ceramica": [
		"mug",
		"taza",
		"taza coleccionable",
		"taza de anime",
		"taza de cerámica",
		"taza tematica",
		"taza temática"
	],
	"taza de cerámica": [
		"mug",
		"taza",
		"taza coleccionable",
		"taza de anime",
		"taza de ceramica",
		"taza tematica",
		"taza temática"
	],
	"taza tematica": [
		"mug",
		"taza",
		"taza coleccionable",
		"taza de anime",
		"taza de ceramica",
		"taza de cerámica",
		"taza temática"
	],
	"taza temática": [
		"mug",
		"taza",
		"taza coleccionable",
		"taza de anime",
		"taza de ceramica",
		"taza de cerámica",
		"taza tematica"
	],
	"teclado": [
		"keyboard",
		"teclado con cable",
		"teclado gamer",
		"teclado inalambrico",
		"teclado inalámbrico",
		"teclado mecanico",
		"teclado mecánico",
		"teclado retroiluminado"
	],
	"teclado con cable": [
		"keyboard",
		"teclado",
		"teclado gamer",
		"teclado inalambrico",
		"teclado inalámbrico",
		"teclado mecanico",
		"teclado mecánico",
		"teclado retroiluminado"
	],
	"teclado gamer": [
		"keyboard",
		"teclado",
		"teclado con cable",
		"teclado inalambrico",
		"teclado inalámbrico",
		"teclado mecanico",
		"teclado mecánico",
		"teclado retroiluminado"
	],
	"teclado inalambrico": [
		"keyboard",
		"teclado",
		"teclado con cable",
		"teclado gamer",
		"teclado inalámbrico",
		"teclado mecanico",
		"teclado mecánico",
		"teclado retroiluminado"
	],
	"teclado inalámbrico": [
		"keyboard",
		"teclado",
		"teclado con cable",
		"teclado gamer",
		"teclado inalambrico",
		"teclado mecanico",
		"teclado mecánico",
		"teclado retroiluminado"
	],
	"teclado mecanico": [
		"keyboard",
		"teclado",
		"teclado con cable",
		"teclado gamer",
		"teclado inalambrico",
		"teclado inalámbrico",
		"teclado mecánico",
		"teclado retroiluminado"
	],
	"teclado mecánico": [
		"keyboard",
		"teclado",
		"teclado con cable",
		"teclado gamer",
		"teclado inalambrico",
		"teclado inalámbrico",
		"teclado mecanico",
		"teclado retroiluminado"
	],
	"teclado retroiluminado": [
		"keyboard",
		"teclado",
		"teclado con cable",
		"teclado gamer",
		"teclado inalambrico",
		"teclado inalámbrico",
		"teclado mecanico",
		"teclado mecánico"
	],
	"thermal paste": [
		"compuesto termico",
		"grasa termica",
		"grasa térmica",
		"pasta termica",
		"pasta térmica",
		"pastatermica"
	],
	"tira de luces": [
		"iluminacion led",
		"iluminacion rgb",
		"iluminación led",
		"iluminación rgb",
		"luces rgb",
		"luzled",
		"tira led"
	],
	"tira led": [
		"iluminacion led",
		"iluminacion rgb",
		"iluminación led",
		"iluminación rgb",
		"luces rgb",
		"luzled",
		"tira de luces"
	],
	"tomo de manga": [
		"comic manga",
		"cómic manga",
		"manga",
		"manga japones",
		"manga japonés",
		"novela grafica",
		"novela gráfica"
	],
	"torre": [
		"caja de pc",
		"case",
		"chasis",
		"gabinete",
		"gabinete atx",
		"gabinete gamer",
		"gabinete micro atx",
		"gabinete mini itx",
		"gabinete transparente"
	],
	"tote bag": [
		"bolsa de anime",
		"bolsa de tela",
		"bolsa ecologica",
		"bolsa ecológica",
		"bolso tote",
		"totebag"
	],
	"totebag": [
		"bolsa de anime",
		"bolsa de tela",
		"bolsa ecologica",
		"bolsa ecológica",
		"bolso tote",
		"tote bag"
	],
	"unidad central de procesamiento": [
		"chip",
		"cpu",
		"cpu amd",
		"cpu intel",
		"micro",
		"microprocesador",
		"procesador",
		"procesador de escritorio",
		"procesador gamer",
		"procesador multinucleo",
		"procesador multinúcleo"
	],
	"unidad de estado solido": [
		"disco m2",
		"disco solido",
		"disco sólido",
		"m.2",
		"nvme",
		"ssd",
		"unidad de estado sólido",
		"unidad ssd"
	],
	"unidad de estado sólido": [
		"disco m2",
		"disco solido",
		"disco sólido",
		"m.2",
		"nvme",
		"ssd",
		"unidad de estado solido",
		"unidad ssd"
	],
	"unidad de procesamiento grafico": [
		"gddr",
		"gpu",
		"grafica",
		"gráfica",
		"placa de video",
		"placa grafica",
		"placa gráfica",
		"tarjeta de video",
		"tarjeta grafica",
		"tarjeta gráfica",
		"unidad de procesamiento gráfico",
		"vga",
		"video"
	],
	"unidad de procesamiento gráfico": [
		"gddr",
		"gpu",
		"grafica",
		"gráfica",
		"placa de video",
		"placa grafica",
		"placa gráfica",
		"tarjeta de video",
		"tarjeta grafica",
		"tarjeta gráfica",
		"unidad de procesamiento grafico",
		"vga",
		"video"
	],
	"unidad flash": [
		"memoria usb",
		"pen drive",
		"pendrive"
	],
	"unidad ssd": [
		"disco m2",
		"disco solido",
		"disco sólido",
		"m.2",
		"nvme",
		"ssd",
		"unidad de estado solido",
		"unidad de estado sólido"
	],
	"ups": [
		"bateria de respaldo",
		"batería de respaldo",
		"estabilizador",
		"sistema de alimentacion ininterrumpida"
	],
	"ventilador": [
		"cooler case",
		"fan",
		"fan rgb",
		"ventilador 120mm",
		"ventilador 140mm",
		"ventilador de gabinete"
	],
	"ventilador 120mm": [
		"cooler case",
		"fan",
		"fan rgb",
		"ventilador",
		"ventilador 140mm",
		"ventilador de gabinete"
	],
	"ventilador 140mm": [
		"cooler case",
		"fan",
		"fan rgb",
		"ventilador",
		"ventilador 120mm",
		"ventilador de gabinete"
	],
	"ventilador cpu": [
		"cooler",
		"cooler cpu",
		"cooler gamer",
		"disipador",
		"disipador de calor",
		"disipador para procesador",
		"fan cooler"
	],
	"ventilador de gabinete": [
		"cooler case",
		"fan",
		"fan rgb",
		"ventilador",
		"ventilador 120mm",
		"ventilador 140mm"
	],
	"vga": [
		"gddr",
		"gpu",
		"grafica",
		"gráfica",
		"placa de video",
		"placa grafica",
		"placa gráfica",
		"tarjeta de video",
		"tarjeta grafica",
		"tarjeta gráfica",
		"unidad de procesamiento grafico",
		"unidad de procesamiento gráfico",
		"video"
	],
	"video": [
		"gddr",
		"gpu",
		"grafica",
		"gráfica",
		"placa de video",
		"placa grafica",
		"placa gráfica",
		"tarjeta de video",
		"tarjeta grafica",
		"tarjeta gráfica",
		"unidad de procesamiento grafico",
		"unidad de procesamiento gráfico",
		"vga"
	],
	"videoconsola": [
		"consola",
		"consola de videojuegos",
		"consola gamer"
	],
	"volante": [
		"volante con pedales",
		"volante gamer",
		"volante para simulador"
	],
	"volante con pedales": [
		"volante",
		"volante gamer",
		"volante para simulador"
	],
	"volante gamer": [
		"volante",
		"volante con pedales",
		"volante para simulador"
	],
	"volante para simulador": [
		"volante",
		"volante con pedales",
		"volante gamer"
	],
	"water cooler": [
		"aio",
		"kit de refrigeracion liquida",
		"liquid cooling",
		"refrigeracion liquida",
		"refrigeración líquida",
		"watercooling"
	],
	"watercooling": [
		"aio",
		"kit de refrigeracion liquida",
		"liquid cooling",
		"refrigeracion liquida",
		"refrigeración líquida",
		"water cooler"
	],
	"webcam": [
		"camara para streaming",
		"camara web",
		"cámara para streaming",
		"cámara web",
		"webcam gamer"
	],
	"webcam gamer": [
		"camara para streaming",
		"camara web",
		"cámara para streaming",
		"cámara web",
		"webcam"
	]
}
);
	await index.updateStopWords(['ramen']);

	console.log(
		`indexado ${finishedTask.detail?.receivedDocuments} docs, indexados: ${finishedTask.details?.indexedDocuments}`
	);
	if (error) {
		console.error(error);
		throw new Error("Fallo el upsert en la DB");
	}
	console.log("inserted to db");
}

/*
	Por tienda, tiene un "id de sesion", si en esa sesion, un producto no volvio a aparecer, incrementa missing.

	->Criterios para desaparecer del front un producto:
	last_scraped_at > 1 día y missing > 5..
	Esto hace que un producto no este más en stock.

	->Criterio para sacar un producto de la DB
	como no cago plata para mantener un DB cara xd, voy a tomar de criterio.
	last_scraped_at > 7 día
	missing > 30.
	*/

async function increment_missing() {
	console.log("updating missing counters...");
	for (const run of storeRuns) {
		const { error: rpcError } = await supabase.rpc("increment_missingv2", {
			p_store_id: run.store_id,
			p_current_run_id: run.run_id,
		});

		if (rpcError) {
			console.error(`Error incrementando missing para tienda ${run.store_id}:`, rpcError);
		}
	}
	console.log("missing counters updated");
}

async function purge_products() {
	try {
		console.log("trying to delete old products...");
		const { data, error } = await supabase.rpc("purge_products", {
			p_days_old: 7,
			p_missing_min: 30,
		});
		console.log(`deleted ${data} products`);
	} catch (e) {
		console.log("error deleting product.");
	}
}

