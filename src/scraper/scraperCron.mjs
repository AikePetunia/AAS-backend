import cron from "node-cron"; // https://crontab.guru for scheduling tasks
import fs from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";

import { getStorePaths } from "./getStorePaths/getPaths/getStorePaths.mjs";
import { scrapeStores } from "./scraping/scrapeStores.mjs";
import { storesDump } from "./scraping/storesDump.mjs";
import { sendDiscordNotification } from "./discordNotifier.mjs";

function setCronJobs() {
	// ==========================================
	// Franja 7:30-22:00 cada 3 horas.
	// ==========================================
	// cron.schedule("30 7-19/3 * * *", getStorePathsTask);

	// ==========================================
	// 1 vez cada 12 horas.
	// ==========================================
	cron.schedule("0 */12 * * *", getStoresDumpTask);

	// ==========================================
	// 1. Franja 07:30 - 10:30 (Cada 15 min)
	// ==========================================
	cron.schedule("5,45 7 * * *", scrapeStoresTask);
	cron.schedule("*/15 8-9 * * *", scrapeStoresTask);
	cron.schedule("0,15,30 10 * * *", scrapeStoresTask);

	// ==========================================
	// 2. Franja 10:30 - 18:00 (Cada 60 min a las y media)
	// ==========================================
	cron.schedule("5 11-17 * * *", scrapeStoresTask);

	// ==========================================
	// 3. Franja 18:00 - 22:00 (Cada 30 min)
	// ==========================================
	cron.schedule("0,30 18-21 * * *", scrapeStoresTask);
	cron.schedule("0 22 * * *", scrapeStoresTask);

	// ==========================================
	// 4. Franja 22:00 - 07:30 (Cada 3 horas)
	// ==========================================
	cron.schedule("0 1,4,7 * * *", scrapeStoresTask);
}



const STORES_PATHS = "./src/scraper/getStorePaths/resultPaths/";
const execPromise = promisify(exec);

// estaria bueno q se compare el dato anterior con los nuevos
const getStorePathsTask = async () => {
	console.log("[START] getStorePathsTask ");
	try {
		await getStorePaths();

		const sucessStores = JSON.parse(
			await fs.readFile(STORES_PATHS + "storePathsToClassify.json", "utf-8")
		);
		const failedStores = JSON.parse(
			await fs.readFile(STORES_PATHS + "storesWithoutPaths.json", "utf-8")
		);

		await sendDiscordNotification({
			type: "SUCCESFUL_TASK",
			taskName: "getStorePaths",
			status: "success",
			stats: {
				sucessStores: Object.keys(sucessStores).length,
				failed: Object.keys(failedStores).length,
			},
		});
		console.log("[SUCCESS] getStorePathsTask");
	} catch (e) {
		await sendDiscordNotification({
			type: "ERROR_TASK",
			taskName: "getStorePaths",
			status: "failed",
			// detail: error.message,
		});
		console.log("[ERROR] getStorePathsTask", e.message);
	}
};

const getStoresDumpTask = async () => {
	console.log("[START] getStoresDumpTask ");
	try {
		await storesDump();

		const storesInfo = JSON.parse(await fs.readFile("./data/dumps/storesDump.json", "utf-8"));
		await sendDiscordNotification({
			type: "SUCCESFUL_TASK",
			taskName: "storesDump",
			status: "success",
			stats: {
				storesInfo: Object.keys(storesInfo).length,
			},
		});
		console.log("[SUCCESS] getStoresDumpTask");
	} catch (e) {
		await sendDiscordNotification({
			type: "ERROR_TASK",
			taskName: "getStorePaths",
			status: "failed",
		});
		console.log("[ERROR] getStoresDumpTask", e.message);
	}
};

const scrapeStoresTask = async () => {
	console.log("[START] scrapeStoresTask");
	try {
		await scrapeStores();

		const rawAllProducts = await fs.readFile("./data/raw/latest/allProducts.json", "utf-8");
		const allProducts = JSON.parse(rawAllProducts);
		const storeWithoutProducts = await fs.readFile("./data/failedStores.json");
		const storesWithProducts = (await countSuccesfulStores("./data/raw/latest")) - 1;

		await sendDiscordNotification({
			type: "SUCCESFUL_TASK",
			taskName: "scrapeStores",
			status: "success",
			stats: {
				allProducts: allProducts.length,
				storesWithProducts: storesWithProducts,
				storeWithoutProducts: Object.entries(storeWithoutProducts).length,
			},
		});
		console.log("[SUCCESS] scrapeStoresTask");
	} catch (e) {
		await sendDiscordNotification({
			type: "ERROR_TASK",
			taskName: "scrapeStores",
			status: "failed",
		});
		console.log("[ERROR] scrapeStoresTask", e.message);
	}
};

// como cada tienda guarda un archivo distinto, tenemos q contar el archivo - allProducts.
async function countSuccesfulStores(directory) {
	try {
		const entries = await fs.readdir(directory, { withFileTypes: true });

		const fileCount = entries.filter((entry) => entry.isFile()).length;

		return fileCount;
	} catch (error) {
		console.error("Error reading directory:", error);
	}
}

const pathsClassificationTask = async () => {
	console.log("start", "pathsClassificationTask", "Cleaning the new paths...");
	try {
		// make sure of source ~/code/AAS-backend/.venv/bin/activate
		const { stdout, stderr } = await execPromise(
			"python3 ./src/scraper/getStorePaths/pathsFiltering/pathsClassification.py"
		);
		if (stderr) {
			console.warn("[WARNING] Python stderr:", stderr);
		}

		console.log("[PYTHON OUTPUT]:", stdout);
		console.log("Clasificación de rutas finalizada con éxito.");
	} catch (error) {
		throw new Error(`Fallo al ejecutar pathsClassification.py: ${error.message}`);
	}
};


// setCronJobs();
async function inmediateJob() {
	// await getStorePathsTask();
	// await getStoresDumpTask();
	await scrapeStoresTask();
}
inmediateJob()