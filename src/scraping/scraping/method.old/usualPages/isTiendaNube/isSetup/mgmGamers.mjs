//https://mgmgamers.store/productos/?

import { chromium } from "playwright";

const browserOpen = await chromium.launch({ headless: true });

const page = await browserOpen.newPage();
let pageNumber = 1;
const maxPages = 1;

const defaultMgmGamersLink = "https://mgmgamers.store/search/?q=*";

export async function scrapeMgmGamers() {
  let mgmGamersProducts = [];

  try {
    while (pageNumber <= maxPages) {
      console.log(`página ${pageNumber} de ${maxPages} de mgmgamers...`);
      try {
        await page.goto(defaultMgmGamersLink + "&mpage=" + pageNumber, {
          timeout: 30000,
          waitUntil: "networkidle",
        });

        const hasProducts = await page
          .waitForSelector(".js-product-table .js-item-product", {
            timeout: 10000,
          })
          .catch(() => null);

        if (!hasProducts) {
          console.log("no se encontraron productos mgmgamers");
          break;
        }

        const productsNgTech = await page.$$eval(
          ".js-item-product",
          (products) =>
            products
              .map((product) => {
                const title = product
                  .querySelector(".js-item-name")
                  ?.innerText?.trim();

                const priceData = product.querySelector("[data-product-price]");
                const price = priceData
                  ? (
                      Number(priceData.getAttribute("data-product-price")) / 100
                    ).toString()
                  : null;

                const link = product.querySelector(".item-link")?.href;

                const image = product.querySelector(
                  ".js-item-image-padding img"
                )?.src;

                if (!title || !link) return null;

                return {
                  title,
                  price: price ? `$${price}` : "Consultar precio",
                  link,
                  image: image || null,
                };
              })
              .filter((item) => item !== null)
        );

        mgmGamersProducts = mgmGamersProducts.concat(productsNgTech);
        pageNumber++;
      } catch (error) {
        console.error(`Error en página ${pageNumber}:`, error);
        pageNumber++;
      }
    }
  } finally {
    await browserOpen.close();
  }

  return mgmGamersProducts;
}
