import { spawn } from "child_process";
import fs from "fs/promises";
import os from "os";
// ! requieres https://github.com/trap-bytes/gourlex

// this is manual sadly
const getPaths = [
	"https://nextgames.com.ar/",
	"https://www.turtech.com.ar",
	"https://gorilagames.com/",
	"https://www.uranostream.com.ar/",
	"https://www.thegamershop.com.ar/",
	"https://ruidos.com.ar/",
	"https://alltek.ar/",
	"https://insumaxinformatica.com.ar/",
	"https://tlsastore.com/",
	"https://compucordoba.com.ar/",
	"https://macroinsumos.com.ar/",
	"https://storelaplata.com.ar/",
	"https://cellplay.com.ar/",
	"https://hydraxtreme.com/",
	"https://casatecno.com.ar/",
	"https://epocasvideogames.com.ar/",
	"https://gztienda.com.ar/",
	"https://hftecnologia.com.ar/",
	"https://gamesargentina.com/",
	"https://elevengamesar.com/",
	"https://intecnova.com.ar/",
	"https://31store.com.ar/",
	"https://kenshinanimestore.com/",
	"https://manabigames.org/",
	"https://ibtech.com.ar/",
	"https://gameroutlet.com.ar/",
	"https://gamerstyle.com.ar/",
	"https://smarttucuman.com/",
	"https://www.space.com.ar",
	"https://www.scphardstore.com.ar/",
	"https://www.rockethard.com.ar/",
	"https://www.armytech.com.ar",
	"https://www.maximus.com.ar",
	"https://www.venex.com.ar",
	"https://compragamer.com/",
	"https://www.ngtechnologies.com.ar",
	"https://mgmgamers.store",
	"https://www.slot-one.com.ar",
	"https://www.puertominero.com.ar",
	"https://www.710tech.com.ar/",
	"https://www.37bytes.com.ar/",
	"https://dinobyte.ar/",
	"https://fullh4rd.com.ar/",
	"https://gnpoint.com.ar/productos/",
	"https://www.gamerspoint.com.ar/",
	"https://www.gamingcity.com.ar/",
	"https://www.gezatek.com.ar/",
	"https://goldentechstore.com.ar/",
	"https://ar-shop.com.ar/",
	"https://www.insumosacuario.com.ar/",
	"https://wiztech.com.ar/",
	"https://www.xt-pc.com.ar",
	"https://empeniogamer.com.ar/",
	"https://hardcorecomputacion.com.ar/",
	"https://www.hypergaming.com.ar/",
	"https://www.ignatech.com.ar/",
	"https://www.integradosargentinos.com/",
	"https://katech.com.ar/",
	"https://www.liontech-gaming.com/",
	"https://www.malditohard.com.ar/",
	"https://maxtecno.com.ar/",
	"https://www.megasoftargentina.com.ar/",
	"https://www.mexx.com.ar/",
	"https://www.noxiestore.com/",
	"https://www.peakcomputacion.com.ar",
	"https://www.shopgamer.com.ar",
	"https://www.tiendatrade.com.ar",
	"https://goldgaming.com.ar/",
];

const stats = {
	failedPages: 0,
	failedPagesNames: new Set(),
	processedPages: 0,
};

function sanitizePath(rawPath) {
	return rawPath
		.toString()
		.replace(/\u001b\[\d+m/g, "")
		.replace(/[\x00-\x1F\x7F-\x9F]/g, "")
		.replace(/\r?\n|\r/g, "")
		.trim();
}

export async function pathsFromPage(page) {
	return new Promise((resolve, reject) => {
		const paths = new Set();
		const timeout = setTimeout(() => {
			terminal.kill();
			reject(new Error(`Timeout while processing ${page}`));
		}, 50000);

		let terminal;
		if (os.type() === "Windows_NT") {
			terminal = spawn("powershell.exe", [
				// ! Please check the path to gourlex
				"-Command",
				`C:\\Users\\mjhb4\\go\\bin\\gourlex.exe -t ${page} | Select-String -Pattern '${page}(.*)' | ForEach-Object {
					$path = $_.Matches.Groups[1].Value
					
					if ($path -match '\\?(?!page=\\d+|p=\\d+)') {
						$path = $path -replace '\\?.*$', ''
					}
					
					if ($path -notmatch '\\.(php|html|png|jpg|jpeg|gif|css|js|svg|webp|woff|woff2|ttf|otf|eot|ico|xml|json|txt|pdf|zip|tar|gz|mp4|mp3|avi|mov|mkv|webm|wav|flac|exe|msi|dmg)$') {
						Write-Output $path
					}
				}`,
			]);
		} else if (os.type === "Linux") {
			// changed the path !
			terminal = spawn("bash", [
				"-c",
				`export PATH=$PATH:$HOME/go/bin && gourlex -t ${page} | grep -o '${page}[^"]*' | while read path; do
				path=$(echo "$path" | sed 's/\\?.*$//')
				if ! echo "$path" | grep -qE '\\.(php|html|png|jpg|jpeg|gif|css|js|svg|webp|woff|woff2|ttf|otf|eot|ico|xml|json|txt|pdf|zip|tar|gz|mp4|mp3|avi|mov|mkv|webm|wav|flac|exe|msi|dmg)$'; then
					echo "$path"
				fi
				done`,
			]);
		} else {
			console.error("Please check the selected path");
			return;
		}

		terminal.stdout.on("data", (data) => {
			const cleanedPath = sanitizePath(data);
			if (cleanedPath) {
				paths.add(cleanedPath);
			}
		});

		terminal.stderr.on("data", (data) => {
			console.error(`Error processing ${page}:`, data.toString());
		});

		terminal.on("close", () => {
			clearTimeout(timeout);

			if (paths.size < 5) {
				stats.failedPages++;
				stats.failedPagesNames.add(page);
				console.warn(`Warning: Few paths found for ${page}`);
			}

			resolve({ [page]: Array.from(paths) });
		});

		terminal.on("error", (error) => {
			clearTimeout(timeout);
			reject(error);
		});
	});
}

async function main() {
	try {
		const allResults = {};
		const errors = [];

		for (const page of getPaths) {
			try {
				console.log(`Processing ${page} (${++stats.processedPages}/${getPaths.length})`);
				const result = await pathsFromPage(page);
				const filteredPaths = result[page].filter((path) => path.length > 2 && path.length < 50);

				if (filteredPaths.length > 5) {
					allResults[page] = filteredPaths;
				} else {
					stats.failedPagesNames.add(page);
					console.warn(`Warning: No valid paths found for ${page}`);
				}
			} catch (error) {
				errors.push({ page, error: error.message });
				stats.failedPages++;
				stats.failedPagesNames.add(page);
				console.error(`Failed to process ${page}:`, error.message);
			}
		}

		if (Object.keys(allResults).length > 0) {
			const allPaths = [];
			for (const [page, paths] of Object.entries(allResults)) {
				allPaths.push(...paths);
			}
			const csvContent = allPaths.join(", \n");
			await fs.writeFile(
				"./src/scraping/filtering-ai/playwright/resultsPaths/paths.csv",
				csvContent
			);
		}

		// TODO: how to handle errors y algo mas
		if (stats.failedPagesNames.size > 0) {
			const failedPagesContent = Array.from(stats.failedPagesNames).join(",");
			await fs.writeFile(
				"./src/scraping/filtering-ai/playwright/resultsPaths/errorPaths.csv",
				failedPagesContent
			);
		}

		console.log("Summary Extracting paths:");
		console.log(`Total pages processed: ${stats.processedPages}`);
		if (stats.failedPagesNames.size > 0) {
			console.log(
				"Failed pages list:",
				Array.from(stats.failedPagesNames).join(", "),
				`(${stats.failedPages})`
			);
		}
	} catch (error) {
		console.error("Fatal error during execution:", error);
		process.exit(1);
	}
}

main();
