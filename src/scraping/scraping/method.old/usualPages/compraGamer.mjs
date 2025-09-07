import { chromium } from "playwright";

const browserOpen = await chromium.launch(
    {headless: true}
)

const page = await browserOpen.newPage();

let category = 1;
const maxCategory = 15;

function categoryNumber() {
    return category++;
}

const defaultCompraGamerLink = "https://compragamer.com/"

export async function scrapeCompraGamer() {
    let compraGamerProducts = [];

    try {
        while (category <= maxCategory) {
            console.log(`página ${category} de ${maxCategory} de CompraGamer...`);
            try {
                await page.goto(defaultCompraGamerLink + 'productos?cate=' + categoryNumber(), {
                    timeout: 30000,
                    waitUntil: 'networkidle'
                });
                
                const hasProducts = await page.waitForSelector('cgw-product-card', {
                    timeout: 10000
                }).catch(() => null);

                if (!hasProducts) {
                    console.log(`La categoria ${category - 1} dio error`);
                    continue;
                }

                const productCompraGamer = await page.$$eval(
                    'cgw-product-card',
                    (cards) => cards.map((card) => {
                        const title = card.querySelector('h3.product-card__title')?.innerText?.trim();
                        if (!title) return null;

                        const priceElement = card.querySelector('.product-card__cart__price--current');
                        const price = priceElement ? priceElement.innerText.trim() : null;
                        
                        const linkElement = card.querySelector('a');
                        const link = linkElement ? linkElement.href : null;

                        if (!price || !link) return null;

                        return {
                            title,
                            price,
                            link
                        };
                    }).filter(item => item !== null)
                );

                compraGamerProducts = compraGamerProducts.concat(productCompraGamer);

            } catch (error) {
                console.error(`Error en categoría ${category - 1}:`, error);
            }
        }
    } finally {
        await browserOpen.close();
    }

    return compraGamerProducts;
}

//compragamer has "dead pages" those dead pages, have like the same products, for like 50 categories