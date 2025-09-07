import { chromium } from "playwright";

const browserOpen = await chromium.launch(
    {headless: true} //load the web
)

const page = await browserOpen.newPage();

const MAX_PAGES = 5;

export async function scrapeHardGamers() {
    let allProducts = [];
    let currentPage = 0;

    while (currentPage <= MAX_PAGES) {
        console.log(`Escaneando página ${currentPage + 1} de HardGamers...`);
        await page.goto(
            'https://www.hardgamers.com.ar/deals?page=' + currentPage + '&limit=21' 
        );

        const productsHardGamers = await page.$$eval(
            '#main-content', 
            (results) => (
                results.map((el) => {
                    const title = el 
                        .querySelector('h3')
                        ?.innerText;

                    if (!title) return null;
        
                    const price = el 
                        .querySelector('[itemprop="offers"]')
                        ?.innerText;

                    const link = el 
                        .querySelector('[itemprop="url"]')
                        ?.getAttribute('href');

                    if (!price || !link) return null;

                    return { title, price, link };
                }).filter(item => item !== null)
            )
        );

        if (productsHardGamers.length === 0) {
            break;
        } else {
            allProducts = allProducts.concat(productsHardGamers);
        }

        currentPage++;
        await page.waitForTimeout(1000);
    }

    await browserOpen.close();
    return allProducts;
}

