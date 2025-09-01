import { chromium } from "playwright";
import { text } from "stream/consumers";

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
    const paths = this.config.paths
       for (let i = 0; i < paths.length; i++) {
         const currentPath = paths[i];
         const url = this.buildUrl(currentPath);
          console.log(`Scraping ${this.config.pageName}: ${url}`);

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
        console.error(
          `Error in ${this.config.pageName}, path ${currentPath}:`,
          error
        );
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

  const isError = !selectors.title ; 
  const isWarning = !selectors.price || !selectors.productWrapper || !selectors.image || !selectors.link ; 
  const isAlert = !selectors.cuotas || !selectors.isStocked;
  const isOk = !isError && !isWarning && !isAlert;

    try {
      console.log("trying...")
      if (isOk) {
      return this.page.$$eval(selectors.productWrapper, (products, sel) => {
        return products
          .map((product) => {
            const title = product.querySelector(sel.title)?.innerText?.trim();
            const price = product.querySelector(sel.price)?.innerText?.trim();
            const link = product.querySelector(sel.link)?.href;
            const image = product.querySelector(sel.image)?.src;
            const isStocked = product.querySelector(sel.isStocked)
            console.log("scrapped usins exhausitive succesfully")
            return { title, price, link, image,isStocked };
          })
          
      }, selectors);
    } else {
      // "fallback", look for elements based on a anchor element
        console.log(`Using non exhausitive selectors for ${this.config.pageName}`);

        // (priority: title > price > link > image)
        function anchorCandidate(sel) {
          if(!sel) return true;
          const s = sel.trim()
          return s === 'a' || s === 'img' || s === 'span' || s === 'div' || /^h[1-6]$/.test(s);
        }

        function pickAnchor(sel) {
          const candidates = [sel.title, sel.price, sel.link, sel.image]
          const finalCandidate = candidates.find(s => s && !anchorCandidate(s)) || candidates.find(Boolean) || null
          console.log("final candidate", finalCandidate)
          return finalCandidate;
        }

        const anchorSelector = pickAnchor(selectors);
        if (!anchorSelector) return [];

        const products = await this.page.$$eval(anchorSelector, (anchorEls, sel) => {
          console.log("using closer selectors")

          const getText = el => (el?.innerText || el?.textContent || '').trim();

          const findNearElement = (el, css, maxUp=5) => {
            let node = el;
            /* if element not found,  look for the parent */
            for (let i = 0; i <= maxUp && node; i++) {
              const found = node.querySelector?.(css) 
              if (found) return found
              node = node.parentElement;
            }
            return null;  
          }

          const findNearWithText = (el, textPattern='', maxUp=5) => {
            if (!textPattern) return null;

            const pattern = textPattern ? (
            typeof textPattern === 'string' 
                ? new RegExp(textPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
                : textPattern
              ) : null;
          
          const matchesText = element => {
            if (!pattern) return false;
            const text = (element.innerText || element.textContent || '').trim();
            // executes the search of the text, if exists returns true.
            return pattern.test(text)
          }

          if ((pattern && matchesText(el))) {
            // if matches exact, returns the exact
            if (matchesText(el)) {
              return el;
            } else {
              // returns the childres if it's not found
              const children = Array.from(el.children || []);
              const textChild = children.find(matchesText);
              if (textChild) {
                return textChild;
              } else {
                // 
                const allDescendants = Array.from(el.querySelectorAll('*') || []);
                const textMatch = allDescendants.find(matchesText);
                if (textMatch) return textMatch;
              }
            } 
          }

          let currentNode = el.parentElement;
          if (el.parentElement) {
            const siblings = Array.from(el.parentElement.children);

            for (const sibling of siblings) {
              if (sibling === el) continue;
              
              if ((pattern && matchesText(sibling))) {
                return sibling;
              }

              // checks the siblings, and if it contains something with the text, then pick it
              if (pattern) {
                const siblingDescendants = Array.from(sibling.querySelectorAll('*') || []);
                const textMatch = siblingDescendants.find(matchesText);
                if (textMatch) return textMatch;
              }

            }
            currentNode = currentNode.parentElement;
          }
          return null;
        }

          return Array.from(anchorEls).slice(0, 60).map(el => {
            const title = sel.title
                ? (el.matches?.(sel.title) ? el : (el.querySelector?.(sel.title) || findNearElement(el, sel.title)))
                : null;

            const linkEl = el.closest('a[href]') || findNearElement(el, 'a[href]');
            let link = linkEl?.href || null;
            
            if (link && (link.startsWith('javascript:') || link.endsWith('#'))) {
              link = null;
            }

            const priceEl = sel.price ? (el.querySelector?.(sel.price) || findNearElement(el, sel.price))  : findNearWithText(
                            el, 
                            /(?:\$|USD|ARS|AR\$|U\$S|U\$D|pesos?|dólares?)\s*[\d.,]+|[\d.,]+\s*(?:\$|USD|ARS|pesos?|dólares?)/i,
                            '.price,[class*="price"],[class*="precio"],[itemprop="price"]'
                          );

            const imgEl = (sel.image && (el.querySelector?.(sel.image) || findNearElement(el, sel.image)))
                        || findNearElement(el, 'img,[data-src],[data-original]') || findNearWithText(
                          el, 
                          '', 
                          'img[src],[data-src],[data-lazy-src],[data-original],[data-lazy],[class*="product-image"]'
                        );
            
            const image = (imgEl?.currentSrc)
                || imgEl?.getAttribute?.('src')
                || imgEl?.getAttribute?.('data-src')
                || imgEl?.getAttribute?.('data-original')
                || null;

                const stockEl  = sel.isStocked ? (el.querySelector?.(sel.isStocked) || findNearElement(el, sel.isStocked)) : findNearWithText(
                                el, 
                                /(?:en stock|disponible|in stock|out of stock|sin stock|agotado|no disponible|consultar|consulte|sold out)/i,
                                '[class*="stock"],[class*="availability"],[class*="disponib"]'
                              );

                const cuotasEl = sel.cuotas    ? (el.querySelector?.(sel.cuotas)    || findNearElement(el, sel.cuotas))    : null;

                const isStocked = stockEl ? getText(stockEl) : null;  
                const cuotas    = cuotasEl ? getText(cuotasEl) : null;

                if (!titleText || !link) return null;

              return {
                title: title ? getText(title) : null, 
                price: priceEl ? getText(priceEl) : 'Consultar precio',
                link: linkEl?.href || null,
                image,
                cuotas,
                isStocked
              };
          });
          }, selectors)

      console.log("scrapped using non exhausitive succesfully")
      console.log(`Some products of ${this.config.pageName}:`, products)
      return products;
    }
   } catch (error) {
    // error, can't have a "." after class name. 
    console.error(`Error extracting products from ${this.config.pageName}:`, error);
    // await this.saveFullHtml(); // debugging
    return []; // ! it's droping here ;-;
  }
}

/*
async saveFullHtml() {
  try {
    const html = await this.page.content();
    const fs = await import('fs/promises');
    await fs.writeFile(`debug_${this.config.pageName}.html`, html);
    console.log(`Saved debug HTML for ${this.config.pageName}`);
  } catch (error) {
    console.error("Failed to save debug HTML:", error);
  }
*/
  buildUrl(path) {
    const { baseUrl } = this.config;
    const pathUrl = `${baseUrl}${path}`;
    return `${pathUrl}`;

  }
}
