import { Scraper } from "./coreScrapper.mjs";
import { siteConfigs } from "./constPages.mjs";
import { scrapeUnderTaker } from "./undertaker.mjs";

import fs from "fs/promises";

async function main() {
	const results = {};

	try {
		for (const [siteName, config] of Object.entries(siteConfigs)) {
			console.log(`Starting scrape of ${siteName}...`);
			const scraper = new Scraper(config);
			const products = await scraper.scrapeProducts();
			results[siteName] = products;
		}

		console.log("Starting scrape of Undertaker...");
		const underTakerProducts = await scrapeUnderTaker();
		results["undertaker"] = underTakerProducts;

		await fs.writeFile("products.json", JSON.stringify(results, null, 2));
		console.log("finished scraping");
		process.exit(0);
	} catch (error) {
		console.error("Error during scraping:", error);
		process.exit(1);
	}
}

main();
/*
37 Bytes
AR Shop
Acuario Insumos
Dinobyte
Full H4rd
GN Point
Gamers Point
Gaming City
Gezatek
GoldenTech Store
HF Tecnologia
HardCore
Hyper Gaming
IgnaTech
Integrados Argentinos
Katech
Liontech Gaming
Maldito Hard
Max Tecno

Megasoft
Mexx
Noxie Store
Peak Computacion
Rocket Hard
SCP Hardstore
ShopGamer
Space
The Gamer Shop
Tiendatrade
Turtech
Urano Stream
WIZ TECH
Xt-PC
empenio gamer

Puerto Minero :white_check_mark: 
Undertaker :white_check_mark: 
Compragamer :white_check_mark:
"HardGamers :white_check_mark:"
"710 Tech :white_check_mark:"
NG Tech :white_check_mark:
Slot One :white_check_mark: 
MGM Gamers :white_check_mark:
ArmyTech :white_check_mark:
Venex :white_check_mark:   
Maximus
*/
