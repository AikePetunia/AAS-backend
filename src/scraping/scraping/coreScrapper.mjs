import { chromium } from "playwright";

export class Scraper {
	constructor(config) {
		this.config = config;
	}
	async initialize() {
		this.browser = await chromium.launch({ headless: true });
		this.page = await this.browser.newPage();
	}

	async scrapeProducts() {
		let allProducts = [];
		try {
			await this.initialize();

			// we don't have any maxpages. yet
			const paths = this.config.paths;
			console.log(`Scraping ${this.config.pageName}`);
			for (let i = 0; i < paths.length; i++) {
				const currentPath = paths[i];
				const url = this.buildUrl(currentPath);

				try {
					await this.page.goto(url, {
						timeout: this.config.timeout,
						waitUntil: "networkidle",
					});

					const products = await this.extractProductsFromPage();
					// if (!products.length) {
					//   console.log(`No products found for ${url}`);
					//   continue;
					// }

					allProducts = allProducts.concat(products);
				} catch (error) {
					console.error(`Error in ${this.config.pageName}, path ${currentPath}:`, error);
					continue;
				}
			}
		} finally {
			await this.browser.close();
		}

		return allProducts;
	}

	async extractProductsFromPage() {
		const { elements } = this.config;

		// since elements - same as the paths - are arrays of objects
		if (!elements || !Array.isArray(elements) || elements.length === 0) {
			console.log(`No elements defined for ${this.config.pageName}`);
			return [];
		}

		const selectors = {};
		for (const element of elements) {
			for (const [key, value] of Object.entries(element)) {
				if (key === "type") continue;
				selectors[key] = value;
			}
		}

		const isError = !selectors.title;
		const isWarning =
			!selectors.price || !selectors.productWrapper || !selectors.image || !selectors.link;
		const isAlert = !selectors.cuotas || !selectors.isStocked;
		const isOk = !isError && !isWarning && !isAlert;

		try {
			console.log("trying...");
			if (isOk) {
				return this.page.$$eval(
					selectors.productWrapper,
					(products, sel) => {
						return products.map((product) => {
							const title = product.querySelector(sel.title)?.innerText?.trim();
							const price = product.querySelector(sel.price)?.innerText?.trim();
							const link = product.querySelector(sel.link)?.href;
							const image = product.querySelector(sel.image)?.src;
							const isStocked = product.querySelector(sel.isStocked);
							console.log("scrapped usins exhausitive succesfully");
							return { title, price, link, image, isStocked };
						});
					},
					selectors
				);
			} else {
				// "fallback", look for elements based on a anchor element
				console.log(`Using non exhausitive selectors for ${this.config.pageName}`);

				function anchorCandidate(sel) {
					if (!sel) return true;
					const s = sel.trim();
					return s === "a" || s === "img" || s === "span" || s === "div" || /^h[1-6]$/.test(s);
				}

				function pickAnchor(sel) {
					const candidates = [sel.title, sel.price, sel.link, sel.image];
					const finalCandidate =
						candidates.find((s) => s && !anchorCandidate(s)) || candidates.find(Boolean) || null;
					console.log("final candidate", finalCandidate);
					return finalCandidate;
				}

				const anchorSelector = pickAnchor(selectors);
				if (!anchorSelector) return [];

				const products = await this.page.$$eval(
					anchorSelector,
					(anchorEls, sel) => {
						const getText = (el) => (el?.innerText || el?.textContent || "").trim();

						// ! gets closer elements by text or class name
						// ! link < title < price < image < isStocked < cuotas
						const findNearWithText = (el, textPattern = "", cssClass = "", maxUp = 3) => {
							// a veces retorna cosas con el mismo link, deberia de ver si
							// el link pasado es igual que el actual, que se quede con el primero que encontro, y pase a otra etapa?
							// detectar si usa algo como tienda nube o similar, que si es asi, los selectores deberian de ser los genericos,
							// ya que usan todo lo mismo.
							if (!textPattern && !cssClass) return null;

							const pattern = textPattern
								? typeof textPattern === "string"
									? new RegExp(textPattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
									: textPattern
								: null;

							// * helper functions
							const matchesText = (element) => {
								if (!pattern) return false;
								const text = (element.innerText || element.textContent || "").trim();
								return pattern.test(text);
							};

							const findByCSS = (parent, css) => {
								if (!css) return null;
								return parent.querySelector?.(css) || null;
							};

							// check self elements
							if ((pattern && matchesText(el)) || (cssClass && el.matches?.(cssClass))) {
								return el;
							}

							if (cssClass) {
								const directMatch = findByCSS(el, cssClass);
								if (directMatch) return directMatch;
							}

							// Search all descendants from the element
							const allDescendants = Array.from(el.querySelectorAll("*") || []);

							// check childs
							if (pattern) {
								const children = Array.from(el.children || []);
								const textChild = children.find(matchesText);
								if (textChild) return textChild;
								// Try to find by text first (usually more specific)
								const textMatch = allDescendants.find(matchesText);
								if (textMatch) return textMatch;
							}

							// siblings
							if (el.parentElement) {
								const siblings = Array.from(el.parentElement.children || []);

								// ! repeted code, can recicly it on a function
								for (const sibling of siblings) {
									if (sibling === el) continue;

									if (
										(pattern && matchesText(sibling)) ||
										(cssClass && sibling.matches?.(cssClass))
									) {
										return sibling;
									}

									// Check sibling's children
									if (cssClass) {
										const siblingMatch = findByCSS(sibling, cssClass);
										if (siblingMatch) return siblingMatch;
									}

									if (pattern) {
										const siblingDescendants = Array.from(sibling.querySelectorAll("*") || []);
										const textMatch = siblingDescendants.find(matchesText);
										if (textMatch) return textMatch;
									}
								}
							}

							// look for higher elements.
							let currentNode = el.parentElement;
							for (let i = 0; i < maxUp && currentNode; i++) {
								if (cssClass) {
									const match = findByCSS(currentNode, cssClass);
									if (match) return match;
								}

								// Try siblings at this level
								// ! repeted code, can recicly it on a function
								const siblings = Array.from(currentNode.children || []);
								for (const sibling of siblings) {
									if (sibling.contains(el)) continue; // Skip the branch containing original element

									if (
										(pattern && matchesText(sibling)) ||
										(cssClass && sibling.matches?.(cssClass))
									) {
										return sibling;
									}

									// Check sibling descendants
									const siblingDescendants = Array.from(sibling.querySelectorAll("*") || []);
									if (pattern) {
										const textMatch = siblingDescendants.find(matchesText);
										if (textMatch) return textMatch;
									}

									if (cssClass) {
										const cssMatch = findByCSS(sibling, cssClass);
										if (cssMatch) return cssMatch;
									}
								}

								currentNode = currentNode.parentElement;
							}

							return null;
						};

						return Array.from(anchorEls)
							.slice(0, 60)
							.map((el) => {
								// ? para prevenir seleccion rara, no podria poner unos boundaries?

								// if the self element doesn't work, use generico classes name
								const title = sel.title
									? el.matches?.(sel.title)
										? el
										: el.querySelector?.(sel.title)
									: findNearWithText(el, "", 'h2,h3,h4,h5,h5,span,p,[class*="product"]');

								const linkEl =
									el.closest("a[href]") ||
									findNearWithText(el, "", "a[href]") ||
									el.querySelector?.("a[href]");

								let link = linkEl?.href || null;
								if (link && (link.startsWith("javascript:") || link.endsWith("#"))) {
									link = null;
								}

								const priceEl = findNearWithText(
									el,
									/(?:\$|USD|ARS|AR\$|U\$S|U\$D|pesos?|dólares?|dolares)\s*[\d.,]+|[\d.,]+\s*(?:\$|USD|ARS|pesos?|dólares?)/i,
									'.price,[class*="price"],[class*="precio"],[itemprop="price"]'
								);

								const imgEl = sel.image
									? el.querySelector?.(sel.image) || findNearWithText(el, sel.image)
									: findNearWithText(
											el,
											"",
											'img[src],[data-src],[data-lazy-src],[data-original],[data-lazy],[class*="product"]'
										);

								const image =
									imgEl?.src ||
									imgEl?.currentSrc ||
									imgEl?.getAttribute?.("data-src") ||
									imgEl?.getAttribute?.("data-original") ||
									imgEl?.getAttribute?.("data-lazy") ||
									imgEl?.getAttribute?.("data-lazy-src") ||
									null;

								const stockEl = sel.isStocked
									? el.querySelector?.(sel.isStocked) || findNearWithText(el, sel.isStocked)
									: findNearWithText(
											el,
											/(?:en stock|disponible|in stock|out of stock|sin stock|stock|agotado|no disponible)/i,
											'[class*="stock"],[class*="availability"],[class*="disponib"]'
										);

								const cuotasEl = sel.cuotas
									? el.querySelector?.(sel.cuotas) || findNearWithText(el, sel.cuotas)
									: findNearWithText(
											el,
											/(?:cuotas?|cuota|pagos?|pagar|sin interés|interes|crédito|credito|debito|con interes)/i,
											'[class*="cuota"],[class*="installment"],[class*="payment"]'
										);

								const titleText = title ? getText(title) : null;
								const priceText = priceEl ? getText(priceEl) : "consultar precio";
								const isStocked = stockEl ? getText(stockEl) : null;
								const cuotas = cuotasEl ? getText(cuotasEl) : null;

								if ((!titleText && !link) || titleText === (priceEl || stockEl)) return null;

								/* todo: stats, como:
								page=rockethard anchor=title up=2 items=48
								hits: title=48 price=46 link=31 img=40
								skips: empty_title=2 bad_price=3
								*/
								return {
									title: titleText,
									price: priceText,
									link: link,
									image,
									cuotas,
									isStocked,
								};
							});
					},
					selectors
				);
				const STOP_TITLES = [
					"SKU:",
					"MARCA:",
					"ENVIO GRATIS",
					"ENVÍO GRATIS",
					"DISPONIBLE",
					"STOCK",
				];
				const looksLikePrice = (s) => /(?:\$|ARS|USD|U\$S|U\$D)\s*[\d.,]+/.test(s);
				const validTitle = (s) => {
					if (!s) return false;
					const t = s.trim();
					if (t.length < 4) return false;
					if (!/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(t)) return false;
					if (STOP_TITLES.some((x) => t.toUpperCase().startsWith(x))) return false;
					if (looksLikePrice(t)) return false;
					return true;
				};

				const extractPriceText = (s) => {
					if (!s) return null;
					const txt = s.replace(/\s+/g, " ").trim();
					const m = txt.match(
						/(?:ARS|\$|USD|U\$S|U\$D)?\s*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/
					);
					return m ? (txt.includes("$") ? "$ " + m[1] : m[1]) : null;
				};

				const normalizeLinkAbs = (href, base) => {
					if (!href) return null;
					if (href.startsWith("javascript:") || href.endsWith("#")) return null;
					const abs = new URL(href, base).href;
					if (new RegExp(`whatsapp\\.com|facebook\\.com|instagram\\.com|`).test(abs)) return null;

					// if the path it's just the baseurl, delete it
					const baseUrlNormalized = this.config.baseUrl.replace(/\/$/, "");
					if (abs === baseUrlNormalized || abs === `${baseUrlNormalized}/`) return null;

					return abs;
				};

				const slug = (s) =>
					s
						.toLowerCase()
						.normalize("NFKD")
						.replace(/[\u0300-\u036f]/g, "")
						.replace(/[^a-z0-9]+/g, " ")
						.trim()
						.replace(/\s+/g, "-");

				const dedupe = (items) => {
					const seen = new Set();
					return items.filter((p) => {
						const key = p.link || slug(p.title || "") + "|" + (p.price || "");
						if (seen.has(key)) return false;
						seen.add(key);
						return true;
					});
				};

				// …después del $$eval:
				const cleaned = products
					.map((p) => ({
						title: p.title?.trim() || null,
						price: extractPriceText(p.price),
						link: normalizeLinkAbs(p.link, this.config.baseUrl),
						image: p.image || null,
						cuotas: p.cuotas || null,
						isStocked: p.isStocked || null,
					}))
					.filter((p) => validTitle(p.title) && (p.price || p.link));

				const uniq = dedupe(cleaned);
				console.log(`Some products of ${this.config.pageName}:`, uniq);
				return uniq;
			}
		} catch (error) {
			console.error(`Error extracting products from ${this.config.pageName}:`, error);
			return []; // ! it's droping here ;-;
		}
	}

	buildUrl(path) {
		const { baseUrl } = this.config;
		const pathUrl = `${baseUrl}${path}`;
		return `${pathUrl}`;
	}
}

/* literally, i surrender. It doesn't return anything useful. IS HSIT !!!!!*/
