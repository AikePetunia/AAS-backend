import { chromium } from "playwright";

const browserOpen = await chromium.launch(
    {headless: true}
);

const page = await browserOpen.newPage();

const defaultLink710 = "https://www.710tech.com.ar/placas-de-video/";
const MAX_PAGES = 3; 
let current_page = 1;
export async function scrape710Tech() {
    let allProducts = [];

    try {
        while (current_page <= MAX_PAGES) {
            console.log(`Escaneando página ${current_page} de 710Tech de ${MAX_PAGES}`);
            await page.goto(defaultLink710 + 'usado/?page=' + current_page, {
                timeout: 30000,
                waitUntil: 'networkidle'
            });

            const products710Tech = await page.$$eval(
                "div.listado-.pull-left.prod-cat", 
                (divs) => divs.map((el) => {
                    const title = el
                        .querySelector('.card-title a')
                        ?.innerText;

                    let price = el
                        .querySelector('.price')
                        ?.innerText;

                    if (!price) {
                        price = el
                            .querySelector('.card-description')
                            ?.innerText;
                    }

                    const link = el
                        .querySelector('.card-title a')
                        ?.getAttribute('href');

                    const image = el
                        .querySelector('.view.overlay.px-20.imagen img')
                        ?.getAttribute('src');

                    return { 
                        title: title.trim(), 
                        price: price.trim(), 
                        link,
                        image 
                    };
                }).filter(item => item !== null)
            );

            if (products710Tech.length === 0) {
                continue;
            } else {
                allProducts = allProducts.concat(products710Tech);
            }

            current_page++;
            await page.waitForTimeout(1000);
        }

        return allProducts;

    } catch (error) {
        console.error("Error en 710Tech:", error);
        return allProducts;
    } finally {
        await browserOpen.close();
    }
}
