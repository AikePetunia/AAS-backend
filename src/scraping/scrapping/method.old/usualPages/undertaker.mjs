import { chromium } from 'playwright';

const browserOpen = await chromium.launch({
    headless: true
});

const page = await browserOpen.newPage();

export async function scrapeUnderTaker() {
    let underTakerProducts = [];

    try {
        await page.goto('https://www.undertec.store/lista-de-precios/', {
            timeout: 30000,
            waitUntil: 'networkidle'
        });


        const hasProducts = await page.waitForSelector('.wp-block-uagb-faq', {
            timeout: 10000
        }).catch(() => null);
        
        underTakerWeb = await page.$$eval(
            '.wp-block-uagb-faq',
            (cards) => cards.map((card) => {
                const isConsole = card.textContent.includes('CONSOLA');
                const isVR = card.textContent.includes('LENTES');

                if (isConsole || isVR) {
                    const fullTitle = card.querySelector(p); 
                } else {
                    return null
                }

                return {
                    fullTitle,
                };
            }).filter(item => item !== null)
        );

    } catch (error) {
        console.error('Error, la pagina de undertaker NO da productos');
        return [];
    }
}
