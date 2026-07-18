import cron from "node-cron"; // https://crontab.guru for scheduling tasks
import { getStorePaths } from "./getStorePaths/getPaths/getStorePaths.mjs";
import { scrapeStores } from "./scraping/scrapeStores.mjs";
import { storesDump } from "./scraping/storesDump.mjs";
import { sendDiscordNotification } from "./discordNotifier.mjs";
import fs from "fs/promises";

const STORES_PATHS = "./src/scraper/getStorePaths/getPaths/resultPaths/";

const getStorePathsTask = async () => {
	logTask("start", "getStorePathsTask", "Getting new paths...");

	try {
		logTask("success", "getStorePathsTask");
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
				failed: failedStores.length,
			},
		});

		// 2. pathsClassification.py  ???
	} catch (e) {
		logTask("error", "getStorePathsTask", e.message);
		await sendDiscordNotification({
			type: "ERROR_TASK",
			taskName: "getStorePaths",
			status: "failed",
			// detail: error.message,
		});
	}
};

// ==========================================
// Franja 7:30-22:00 cada 3 horas.
// ==========================================
await getStorePathsTask();
// cron.schedule("30 7-19/3 * * *", getStorePathsTask);
// 2. pathsClassification.py  ???

const getStoresDumpTask = async () => {
	logTask("start", "storeDump", "Getting Store Dump...");
	try {
		logTask("success", "storeDump");
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
	} catch (e) {
		logTask("error", "getStoresDumpTask", e.message);
		await sendDiscordNotification({
			type: "ERROR_TASK",
			taskName: "getStorePaths",
			status: "failed",
		});
	}
};
await getStoresDumpTask();
// cron.schedule("0 */12 * * *", getStoresDumpTask);

const scrapeStoresTask = async () => {
	logTask("start", "scrapeStoresTask", "Getting new stores data...");
	try {
		logTask("success", "scrapeStoresTask");
		await scrapeStores();
		/*
		NOS DEJA:
		InformacionTienda.json // SUCESS
		failedStores.json // FAILED 
		allProducts.json // SUCESS
		*/

		const allProductsInfo = JSON.parse(
			await fs.readFile("./data/raw/latest/allProducts.json", "utf-8")
		);
		await sendDiscordNotification({
			type: "SUCCESFUL_TASK",
			taskName: "scrapeStores",
			status: "success",
			stats: {
				storesInfo: Object.keys(allProductsInfo).length,
			},
		});
	} catch (e) {
		logTask("error", "scrapeStoresTask", e.message);
		await sendDiscordNotification({
			type: "ERROR_TASK",
			taskName: "scrapeStores",
			status: "failed",
		});
	}
};

await scrapeStoresTask();
// ==========================================
// 1. Franja 07:30 - 10:30 (Cada 15 min)
// ==========================================
// cron.schedule("30,45 7 * * *", scrapeStoresTask);
// cron.schedule("*/15 8-9 * * *", scrapeStoresTask);
// cron.schedule("0,15,30 10 * * *", scrapeStoresTask);

// ==========================================
// 2. Franja 10:30 - 18:00 (Cada 60 min a las y media) LO CAMBIE CADA 10 MINS POR TESTEO.
// ==========================================
// cron.schedule("30 11-17 * * *", scrapeStoresTask);

// ==========================================
// 3. Franja 18:00 - 22:00 (Cada 30 min)
// ==========================================
// cron.schedule("0,30 18-21 * * *", scrapeStoresTask);
// cron.schedule("0 22 * * *", scrapeStoresTask);

// ==========================================
// 4. Franja 22:00 - 07:30 (Cada 3 horas)
// ==========================================
// cron.schedule("0 1,4,7 * * *", scrapeStoresTask);

function logTask(type, taskName, detail = "") {
	const timestamp = `[${new Date().toLocaleTimeString()}]`;

	if (type === "start") {
		console.log(`${timestamp}   [START] ${taskName}`);
		if (detail) console.log(`           └─ ${detail}`);
	} else if (type === "success") {
		console.log(`${timestamp}   [SUCCESS] ${taskName} completada con éxito.`);
	} else if (type === "error") {
		console.log(`${timestamp}   [ERROR] en ${taskName}`);
		console.log(`           └─ ${detail}`);
	}
}
