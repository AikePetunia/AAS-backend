import { chromium } from "playwright";

const browserOpen = await chromium.launch({ headless: true });

const page = await browserOpen.newPage();

const puertoMineroWeb = "https://www.puertominero.com.ar/productos";

export async function scrapePuertoMinero() {
  let puertoMineroProducts = [];

  try {
    await page.goto(puertoMineroWeb, {
      timeout: 30000,
      waitUntil: "networkidle",
    });

    const hasProducts = await page
      .waitForSelector(".products-page-wrapper", {
        timeout: 10000,
      })
      .catch(() => null);

    if (!hasProducts) {
      console.error(`Error, la pagina de puerto minero NO da productos`);
      return [];
    }

    puertoMineroProducts = await page.$$eval(".product-card-one", (cards) =>
      cards
        .map((card) => {
          const title = card.querySelector(".title")?.innerText?.trim();
          if (!title) return null;

          const priceElement = card.querySelector(".price");
          const price = priceElement ? priceElement.innerText.trim() : null;

          const linkElement = card.querySelector("a");
          const link = linkElement ? linkElement.href : null;

          const imageElement = card.querySelector("img");
          const image = imageElement ? imageElement.src : null;
          if (!price || !link) return null;

          const isOutOfStock = card.textContent.includes("Agotado");

          if (!price || !link || isOutOfStock) {
            return null;
          }

          return {
            title,
            price,
            link,
            image,
          };
        })
        .filter((item) => item !== null)
    );

    return puertoMineroProducts;
  } catch (error) {
    console.error("Error scraping Puerto Minero:", error);
    return [];
  } finally {
    await browserOpen.close();
  }
}
