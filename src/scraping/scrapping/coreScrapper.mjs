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

      for (const category of this.config.categories) {
        let pageNumber = 1;

        while (pageNumber <= this.config.maxPages) {
          const url = this.buildUrl(category, pageNumber);
          console.log(`Scraping ${this.config.name}: ${url}`);

          try {
            await this.page.goto(url, {
              timeout: this.config.timeout,
              waitUntil: "networkidle",
            });

            const products = await this.extractProductsFromPage();
            if (!products.length) break;

            allProducts = allProducts.concat(products);
            pageNumber++;
          } catch (error) {
            console.error(
              `Error in ${this.config.name}, page ${pageNumber}:`,
              error
            );
            break;
          }
        }
      }
    } finally {
      await this.browser.close();
    }

    return allProducts;
  }

  async extractProductsFromPage() {
    const { selectors } = this.config;

    return this.page.$$eval(
      selectors.productWrapper,
      (products, sel) => {
        return products
          .map((product) => {
            const title = product.querySelector(sel.title)?.innerText?.trim();
            const price = product.querySelector(sel.price)?.innerText?.trim();
            const link = product.querySelector(sel.link)?.href;
            const image = product.querySelector(sel.image)?.src;
            const isOutOfStock = sel.isOutOfStock
              ? product.textContent.includes("Sin stock")
              : false;
            if (!title || !link || isOutOfStock) return null;

            return { title, price: price || "Consultar precio", link, image };
          })
          .filter((product) => product !== null);
      },
      selectors
    );
  }

  buildUrl(category, page) {
    const { baseUrl, pagination } = this.config;
    const categoryUrl = `${baseUrl}${category}`;

    if (pagination.type === "queryParam") {
      return `${categoryUrl}?${pagination.param}=${page}`;
    }

    return categoryUrl;
  }
}
