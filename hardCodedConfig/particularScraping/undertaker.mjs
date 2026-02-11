// NOT WORKING
import { chromium } from "playwright";

const browserOpen = await chromium.launch({
	headless: true,
});

const page = await browserOpen.newPage();

export async function scrapeUnderTaker() {
	let underTakerProducts = [];
	let underTakerWeb;

	try {
		await page.goto("https://www.undertec.store/lista-de-precios/", {
			timeout: 60000,
			waitUntil: "networkidle",
		});

		await page.waitForLoadState("domcontentloaded");
		await page.waitForTimeout(5000);

		const hasProducts = await page
			.waitForSelector(".uagb-block-a171eacf", {
				timeout: 20000,
				state: "visible",
			})
			.catch(() => null);

		if (!hasProducts) {
			console.log("No se encontraron productos en Undertaker");
			return [];
		}

		console.log("Productos encontrados, comenzando scraping...");

		underTakerWeb = await page.$$eval(".uagb-block-a171eacf", (cards) =>
			cards
				.map((card) => {
					const allProducts = [];

					const paragraphs = [
						card.querySelector(".uagb-block-215c528a p"),
						card.querySelector(".uagb-block-27d3857d p"),
					];

					paragraphs.forEach((paragraph) => {
						if (!paragraph) return;

						const text = paragraph.textContent.replace(/\s+/g, " ").trim();
						const products = text
							.split(/(?<=u\$s\d{3}|u\$s\d{1}?,\d{3}?|(?<=CONSULTAR))/gi) //Regex, case sensitive for u$d, consultar. https://extendsclass.com/regex-tester.html help here :3
							.map((item) => {
								item = item.trim();
								if (!item.match(/u\$s\d{3}|u\$s\d{1}?,\d{3}?/i) && !item.includes("CONSULTAR")) {
									return null;
								}

								const priceMatch = item.match(/(u\$s\d{3}|u\$s\d{1}?,\d{3}?|CONSULTAR)$/i);
								if (!priceMatch) return null;

								const price = priceMatch[0];
								let title = item.slice(0, item.length - price.length).trim();

								// Patter matching for duplicate words per cattegory
								const duplicatePatterns = [
									{ pattern: /XBOXXBOX/i, replace: "XBOX" },
									{ pattern: /PLAYSTATIONSONY/i, replace: "SONY" },
									{ pattern: /(VALVE STEAM DECK)\1/i, replace: "$1" },
									{ pattern: /ASUSASUS/i, replace: "ASUS" },
									{ pattern: /LENOVOLENOVO/i, replace: "LENOVO" },
									{ pattern: /PICOPico/i, replace: "PICO" },
									{ pattern: /(PlayStation VR2)\1/i, replace: "$1" },
								];

								duplicatePatterns.forEach(({ pattern, replace }) => {
									title = title.replace(pattern, replace);
								});

								return {
									title,
									price,
								};
							})
							.filter((item) => item !== null);

						allProducts.push(...products);
					});

					return allProducts;
				})
				.filter((item) => item.length > 0)
		);
		underTakerProducts = underTakerWeb.flat();
	} catch (error) {
		console.error("NO se encontraron productos en Undertaker:", error);
		return [];
	} finally {
		await browserOpen.close();
	}

	return underTakerProducts;
}
