import { chromium } from "playwright";

const browserOpen = await chromium.launch({ headless: true });
const page = await browserOpen.newPage();

const defaultVenexLinks = [
  "https://www.venex.com.ar/componentes-de-pc",
  "https://www.venex.com.ar/perifericos",
  "https://www.venex.com.ar/monitores",
  "https://www.venex.com.ar/tabletas-digitalizadoras",
  "https://www.venex.com.ar/streaming",
  "https://www.venex.com.ar/accesorios",
  "https://www.venex.com.ar/soportes",
  "https://www.venex.com.ar/sillas-y-butacas",
  "https://www.venex.com.ar/estabilizadores-ups-y-zapatillas",
];

export async function scrapeVenex() {
  let venexProducts = [];
  let pageNumber = 1;
  const maxPages = 10;

  try {
    for (const categoryUrl of defaultVenexLinks) {
      let outOfStockCount = 0;
      while (pageNumber <= maxPages) {
        console.log(`página ${pageNumber} de ${maxPages} de Venex...`);

        try {
          await page.goto(`${categoryUrl}?page=${pageNumber}`, {
            timeout: 30000,
            waitUntil: "networkidle",
          });

          const hasProducts = await page
            .waitForSelector(".product-box", {
              timeout: 10000,
            })
            .catch(() => null);

          if (!hasProducts) {
            console.log("No se encontraron productos en esta categoría");
            break;
          }

          const productsOnPage = await page.$$eval(".product-box", (products) =>
            products
              .map((product) => {
                const title = product
                  .querySelector(".product-box-title a")
                  ?.innerText?.trim();

                const priceText = product
                  .querySelector(".current-price")
                  ?.innerText?.trim()
                  .trim();
                const price = priceText || null;

                const link = product.querySelector(
                  ".product-box-title a"
                )?.href;

                const image = product.querySelector(".thumb img")?.src;

                if (!title || !link) return null;

                const isOutOfStock = product.textContent
                  .toLowerCase()
                  .includes("sin stock");

                if (isOutOfStock) return null;

                return {
                  title,
                  price: price ? `$${price}` : "Consultar precio",
                  link,
                  image: image || null,
                };
              })
              .filter((item) => item !== null)
          );

          const totalOutOfStock = await page.$$eval(
            ".product-box",
            (products) =>
              products.filter((product) =>
                product.textContent.toLowerCase().includes("sin stock")
              ).length
          );

          outOfStockCount += totalOutOfStock;

          if (outOfStockCount >= 3) {
            console.log(
              `Detectados ${outOfStockCount} productos sin stock, pasando a siguiente categoría...`
            );
            break;
          }

          if (productsOnPage.length === 0) break;

          venexProducts = venexProducts.concat(productsOnPage);
          pageNumber++;
        } catch (error) {
          console.error(`Error en página ${pageNumber}:`, error);
          break;
        }
      }
      pageNumber = 1;
    }
  } finally {
    await browserOpen.close();
  }

  return venexProducts;
}
