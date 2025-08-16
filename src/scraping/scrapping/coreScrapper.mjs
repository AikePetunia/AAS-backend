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
    const paths = this.config.paths
       for (let i = 0; i < paths.length; i++) {
         const currentPath = paths[i];
         const url = this.buildUrl(currentPath);
          console.log(`Scraping ${this.config.pageName}: ${url}`);

          try {
        await this.page.goto(url, {
          timeout: this.config.timeout ,
          waitUntil: "networkidle",
        });

        const products = await this.extractProductsFromPage();
        if (!products.length) {
          console.log(`No products found for ${url}`);
          continue;
        }

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

    const isError = !elements.title || !elements.link;
    const isWarning = !elements.price || !elements.productWrapper || !elements.image; 
    const isAlert = !elements.cuotas || !elements.isStocked;
    const isOk = !isError && !isWarning && !isAlert;
    
    /*
      Error handling: 
       the response its needed when it's not an error. 
       isWarning, isAlert, isOk, can give the full response, and notify the not founded elements/error elements/no elements
       on the same function (i know that the error are notified on classes_classification.py)
       but this are the real results.
       So i think that the best aproach right here is to create a function, that depending the error
       can give an answer or not, and adding to a stat.
    */

    try {
      if (isError) {
        console.log(`Missing critical selectors for ${this.config.pageName}`);
        return [];
      }
       if (isOk) {
      return this.page.$$eval(elements.productWrapper, (products, sel) => {
        return products
          .map((product) => {
            const title = product.querySelector(sel.title)?.innerText?.trim();
            const price = product.querySelector(sel.price)?.innerText?.trim();
            const link = product.querySelector(sel.link)?.href;
            const image = product.querySelector(sel.image)?.src;
            const isStocked = product.querySelector(sel.isStocked)
              
            return { title, price: price, link, image,isStocked };
          })
      }, elements);
    } else {
      // "fallback", look on the full html despite the perfomance
        console.log(`Using fallback selectors for ${this.config.pageName}`);
        const titles = await this.page.$$eval(elements.title, 
          (els) => els.map(el => el.innerText.trim()));
        const links = await this.page.$$eval(elements.link,
          (els) => els.map(el => el.href));
        const prices = isWarning ? [] : await this.page.$$eval(elements.price,
          (els) => els.map(el => el.innerText.trim()));
        const products = [];
        for (let i = 0; i < Math.min(titles.length, links.length); i++) {
          products.push({
            title: titles[i],
            link: links[i],
            price: i < prices.length ? prices[i] : "Consultar precio",
            image: "" 
          });
        }
      
      return products;
    }
  } catch (error) {
    console.error(`Error extracting products from ${this.config.pageName}:`, error);
    // await this.saveFullHtml(); // debugging
    return [];
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
