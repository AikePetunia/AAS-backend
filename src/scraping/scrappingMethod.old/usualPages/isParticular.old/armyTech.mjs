import { chromium } from "playwright";

const browserOpen = await chromium.launch({ headless: true });
const page = await browserOpen.newPage();

const maxPageNumber = 10;
const linksOfInterest = [
  "https://www.armytech.com.ar/405-hardware",
  "https://www.armytech.com.ar/436-perifericos",
  "https://www.armytech.com.ar/398-gaming-house",
  "https://www.armytech.com.ar/431-monitores-y-tvs",
  "https://www.armytech.com.ar/373-conectividad",
  "https://www.armytech.com.ar/389-energia",
];

export async function scrapeArmyTech() {
  let armyTechProducts = [];

  try {
    for (const categoryUrl of linksOfInterest) {
      let pageNumber = 1;

      while (pageNumber <= maxPageNumber) {
        console.log(
          `página ${pageNumber} de ${maxPageNumber} de la categoría ${categoryUrl} ArmyTech...`
        );
        const currentPage = `${categoryUrl}?page=${pageNumber}`;

        try {
          await page.goto(currentPage, {
            timeout: 30000,
            waitUntil: "networkidle",
          });

          const hasProducts = await page
            .waitForSelector("#js-product-list", {
              timeout: 10000,
            })
            .catch(() => null);

          if (!hasProducts) {
            console.log(`No se encontraron productos en página ${pageNumber}`);
            break;
          }

          const productsOnPage = await page.$$eval(
            ".js-product-miniature-wrapper",
            (products) =>
              products
                .map((product) => {
                  const title = product
                    .querySelector(".h3.product-title a")
                    ?.innerText?.trim();

                  const price = product
                    .querySelector(".product-price")
                    ?.innerText?.trim();

                  const link = product.querySelector(
                    ".h3.product-title a"
                  )?.href;

                  const image = product.querySelector(
                    ".product-thumbnail img"
                  )?.src;

                  if (!title || !link) return null;

                  return {
                    title,
                    price: price ? `${price}` : "Consultar precio",
                    link,
                    image: image || null,
                  };
                })
                .filter((product) => product !== null)
          );

          if (productsOnPage.length === 0) {
            break;
          }

          armyTechProducts = armyTechProducts.concat(productsOnPage);
          pageNumber++;
        } catch (error) {
          console.error(`Error en página ${pageNumber}:`, error);
          break;
        }
      }
    }
  } finally {
    await browserOpen.close();
  }

  return armyTechProducts;
}
