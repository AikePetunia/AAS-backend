import { chromium } from "playwright";

const browserOpen = await chromium.launch(
    {headless: true}
)

const page = await browserOpen.newPage();
let pageNumber = 1;
const maxPages = 41; 

const defaultNgTechLink = "https://www.ngtechnologies.com.ar/search/?q=*";

export async function scrapeNgTech() {
    let ngTechProducts = [];

    try {
        while (pageNumber <= maxPages) {
            console.log(`página ${pageNumber} de ${maxPages} de ngTech...`);
            try {
                await page.goto(defaultNgTechLink + "&mpage="+ pageNumber, {
                    timeout: 30000,
                    waitUntil: 'networkidle'
                });

                const hasProducts = await page.waitForSelector('.js-product-container', {
                    timeout: 10000
                }).catch(() => null);

                if (!hasProducts) {
                    continue; 
                }

                const productsNgTech = await page.$$eval(
                    '.js-product-container',
                    (products) => products.map((product) => {
                        const title = product.querySelector('.js-item-name')?.innerText?.trim();
                        if (!title) return null;

                        const priceElement = product.querySelector('.js-price-display');
                        const price = priceElement ? priceElement.innerText.trim() : null;
                        
                        const linkElement = product.querySelector('a');
                        const link = linkElement ? linkElement.href : null;
                        
                        const image = product.querySelector('img.js-product-item-image-private')?.src;

                        if (!price || !link) return null;

                        return {
                            title,
                            price,
                            link,
                            image
                        };
                    }).filter(item => item !== null)
                );

                ngTechProducts = ngTechProducts.concat(productsNgTech);
                pageNumber++;

            } catch (error) {
                console.error(`Error en página ${pageNumber}:`, error);
                pageNumber++; 
            }
        }
    } finally {
        await browserOpen.close();
    }

    return ngTechProducts;
}
