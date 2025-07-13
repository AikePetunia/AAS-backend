import { chromium } from "playwright";
import fs from "fs/promises";
// tag, selector, text_preview, es_valido, tipo

const pathsData = [
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
	"https://hftecnologia.com.ar/componentes-de-pc",
	"https://elevengamesar.com/componentes-pc",
	"https://intecnova.com.ar/audio-y-video",
	"https://31store.com.ar/perifericos",
	"https://kenshinanimestore.com/accesorios",
	"https://manabigames.org/computadoras",
	"https://ibtech.com.ar/tienda/accesorios-celulares",
	"https://gameroutlet.com.ar/accesorios",
	"https://smarttucuman.com/componentes-de-pc",
	"https://www.rockethard.com.ar/perifericos/",
	"https://www.armytech.com.ar/436-perifericos",
	"https://www.maximus.com.ar/Productos/perifericos/maximus.aspx",
	"https://www.venex.com.ar/perifericos",
	"https://www.ngtechnologies.com.ar/perifericos/",
	"https://mgmgamers.store/collections/mousepads",
	"https://www.slot-one.com.ar/perifericos/",
	"https://www.puertominero.com.ar/productos",
	"https://www.710tech.com.ar/perifericos-/",
	"https://www.37bytes.com.ar/perifericos/",
	"https://dinobyte.ar/categoria-producto/hardware/",
	"https://fullh4rd.com.ar/tag/perifericos",
	"https://gnpoint.com.ar/productos/",
	"https://www.gamerspoint.com.ar/categoria/perifericos/",
	"https://www.gamingcity.com.ar/listado/computacion/",
	"https://www.gezatek.com.ar/tienda/",
	"https://goldentechstore.com.ar/perifericos/",
	"https://ar-shop.com.ar/perifericos/",
	"https://www.insumosacuario.com.ar/perifericos/",
	"https://www.xt-pc.com.ar/tag/perifericos",
	"https://empeniogamer.com.ar/categoria-producto/perifericos-mouses",
	"https://hardcorecomputacion.com.ar/categoria-producto/perifericos/",
	"https://www.hypergaming.com.ar/perifericos/",
	"https://www.ignatech.com.ar/perifericos/",
	"https://www.integradosargentinos.com/shop/category/auriculares-1103",
	"https://katech.com.ar/categoria/mouse/",
	"https://www.malditohard.com.ar/categoria/teclados/",
	"https://maxtecno.com.ar/perifericos/",
	"https://www.megasoftargentina.com.ar/Perifericos-Pc/",
	"https://www.mexx.com.ar/productos-rubro/gamers/",
	"https://www.noxiestore.com/teclados-y-mouses/",
	"https://www.shopgamer.com.ar/perifericos/",
	"https://www.tiendatrade.com.ar/listado/computacion/perifericos-pc/",
	"https://goldgaming.com.ar/collections/mouse",
];

export async function ElementsFromPaths() {
	const allElements = [];
	let totalProcessed = 0;
	let totalFiltered = 0;
	for (const path of pathsData) {
		console.log(`Processing ${path} `);
		const browser = await chromium.launch();
		const page = await browser.newPage();
		try {
			await page.goto(path, {
				waitUntil: "domcontentloaded",
				timeout: 120000,
			});

			const { elements, stats } = await page.evaluate(() => {
				// filters trash elements
				function filterElement(element) {
					const forbiddenElements = [
						"svg",
						"form",
						"input",
						"i",
						"layout-switcher__button--active",
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
						"article",
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
					const forbiddenClasses = [
						"[object Object]",
						"mobile",
						"search",
						"filter",
						"hidden",
						"[object SVGAnimatedString]",
						"fake-svg-icon",
						"empty",
						"container",
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

					const forbiddenText = [
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

						"FoxTienda",
						"Desarrollado y Diseñado",
						"Next Games",
						"Gorila Games",
						"AllTek",
						"Insumax",
						"Compu Cordoba",
						"Store La Plata",
						"Cell Play",
						"Ruidos Gamers",

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
						"img-responsive",
						"codigo postal",
						"Ingresa tu",
						"resultado",
						"Continuar",
						"Cerrar",
					];
					const tagForbidden = forbiddenElements.includes(element.tagName.toLowerCase());

					// some classes are not strings
					const classNameStr = element.className ? element.className.toString() : "";
					const classForbidden = forbiddenClasses.some((forbiddenClass) =>
						classNameStr.includes(forbiddenClass)
					);

					const textContent = element.textContent?.trim() || "";
					const textForbidden = forbiddenText.some((forbiddenWord) =>
						textContent.toLowerCase().includes(forbiddenWord.toLowerCase())
					);
					if (classForbidden || tagForbidden || !element.className || textForbidden) {
						return { passed: false };
					}
					return { passed: true };
				}

				const elements = [];
				const domElements = document.querySelectorAll("*:not(body):not(header)");
				let pageProcessed = 0;
				let pageFiltered = 0;

				domElements.forEach((element) => {
					pageProcessed++;
					const filterResult = filterElement(element);

					if (filterResult.passed) {
						// TODO se debe devolver como string, ya que el csv puede pensar que son más columnas
						elements.push({
							tag: element.tagName.toLowerCase(),
							class: element.className ? element.className.toString() : "",
							text_preview: element.textContent?.trim().substring(0, 100) || "",
						});
					} else {
						pageFiltered++;
					}
				});

				return {
					elements,
					stats: {
						processed: pageProcessed,
						filtered: pageFiltered,
					},
				};
			});

			const pageName = new URL(path).hostname.replace("www.", "").split("/")[0];

			totalFiltered += stats.filtered;
			totalProcessed += stats.processed;

			// individual page results forl ater then give it to the ai for filtering with the already training data
			await fs.writeFile(
				`./src/scraping/filtering-ai/playwright/resultsClasses/elements_${pageName}.json`,
				JSON.stringify(elements, null, 2)
			);

			allElements.push(...elements);
			console.log(
				`${pageName} successfully extracted Elements, found ${stats.processed} elements, filtered ${stats.filtered}, in total extracted ${elements.length}`
			);
		} catch (error) {
			console.log(`error with ${page}`, error);
		} finally {
			if (browser) {
				await browser.close();
			}
		}
	}

	console.log("creating final csv");
	try {
		const csvColumns = ["tag,class,text_preview"];

		allElements.forEach((element) => {
			csvColumns.push(`${element.tag},${element.class},${element.text_preview}`);
		});

		await fs.writeFile(
			`./src/scraping/filtering-ai/playwright/resultsClasses/elements.csv`,
			csvColumns.join("\n")
		);

		console.log(`csv created with ${allElements.length} elements`);
	} catch (error) {
		console.log("couldnt create csv file", error);
	}
}

ElementsFromPaths();
