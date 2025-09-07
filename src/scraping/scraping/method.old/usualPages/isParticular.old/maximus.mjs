// PAGE=1/ <-- this increases the page of the cat
import { chromium } from "playwright";

const browserOpen = await chromium.launch({ headless: true });
const page = await browserOpen.newPage();

const maxPageNumber = 5;

const linkOfInterest =
  "https://www.maximus.com.ar/Productos/maximus.aspx?/CAT=-1/SCAT=-1/M=-1/BUS=*/OR=1/PAGE=1/";

export async function scrapeMaximus() {
  let pageNumber = 1;
  let maximusProducts = [];

  try {
    while (pageNumber <= maxPageNumber) {
      console.log(`página ${pageNumber} de ${maxPageNumber} de Maximus...`);
      try {
        await page.goto(
          linkOfInterest.replace("PAGE=1", `PAGE=${pageNumber}`),
          {
            timeout: 30000,
            waitUntil: "networkidle",
          }
        );

        const hasProducts = await page
          .waitForSelector(".col-md-prod", {
            timeout: 10000,
          })
          .catch(() => null);

        if (!hasProducts) {
          console.log("No se encontraron productos en esta categoría");
          break;
        }

        const productsOnPage = await page.$$eval(".col-md-prod", (products) =>
          products
            .map((product) => {
              const title = product
                .querySelector(".title-prod")
                ?.innerText?.trim();

              const priceText = product
                .querySelector(".cajaprecio .price")
                ?.innerText?.trim()
                .replace(/[$\s.]/g, "")
                .replace(/,/g, "");
              const price = priceText ? `$${priceText}` : null;

              const image = product
                .querySelector(".image img")
                ?.getAttribute("src")
                ?.trim();

              const link = product
                .querySelector(".image a")
                ?.getAttribute("href")
                ?.trim();

              if (!title || !price) return null;

              return {
                title,
                price,
                image: image || null,
                link: link ? `https://www.maximus.com.ar${link}` : null,
              };
            })
            .filter(Boolean)
        );

        if (productsOnPage.length === 0) {
          break;
        }

        maximusProducts = maximusProducts.concat(productsOnPage);
        pageNumber++;
      } catch (error) {
        console.error("Error scraping Maximus", error);
        break;
      }
    }
  } finally {
    await browserOpen.close();
  }
  return maximusProducts;
}
