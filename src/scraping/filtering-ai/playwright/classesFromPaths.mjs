import { chromium } from "playwright";
import fs from "fs/promises";

const pathsData = JSON.parse(await fs.readFile("./resultsPaths/paths.csv"));

export async function classesFromPaths() {
	await fs.mkdir("./resultsClasses", { recursive: true });
	for (const [domain, paths] of Object.entries(pathsData)) {
		console.log(`Processing ${domain} with ${paths.length} paths`);
		for (const path of paths) {
			const browser = await chromium.launch();
			const page = await browser.newPage();
			await page.goto(path);
			const classes = await page.evaluate(() => {
				const classes = new Set();
				const elements = document.querySelectorAll("*:not(body):not(header):not(html)");

				elements.forEach((element) => {
					classes.add(element.className);
				});
				return Array.from(classes);
			});
			const pageName = new URL(path).hostname.replace("www.", "").split(".")[0];
			await fs.writeFile(
				`./resultsClasses/classes_${pageName}.json`,
				JSON.stringify(classes, null, 2)
			);
			await browser.close();
		}
	}
}

classesFromPaths();
