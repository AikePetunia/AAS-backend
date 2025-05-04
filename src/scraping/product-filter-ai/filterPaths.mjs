/* 
    https://www.npmjs.com/package/@tensorflow/tfjs-data
    https://www.npmjs.com/package/@tensorflow/tfjs

    A Tensorflow project has this typical workflow:

        Collecting Data
        Creating a Model
        Adding Layers to the Model
        Compiling the Model
        Training the Model
        Using the Model
*/

import * as tf from "@tensorflow/tfjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function filterPaths() {
	const finePaths = [];
	const badPaths = [];

	const fineDataPath = path.join(__dirname, "./data/fineData/pathsPerPage.json");
	const badDataPath = path.join(__dirname, "./data/badData/pathsPerPage.json");

	const fineData = JSON.parse(fs.readFileSync(fineDataPath, "utf8"));
	const badData = JSON.parse(fs.readFileSync(badDataPath, "utf8"));

	console.log("Loaded fine data with", Object.keys(fineData).length, "domains");
	console.log("Loaded bad data with", Object.keys(badData).length, "domains");

	Object.values(fineData).forEach((paths) => {
		paths.forEach((path) => finePaths.push(path));
	});

	Object.values(badData).forEach((paths) => {
		paths.forEach((path) => badPaths.push(path));
	});

	// Now you can use this data to train your model
	// Example:
	// const dataset = tf.data.array([...finePaths.map(p => ({path: p, label: 1})),
	//                               ...badPaths.map(p => ({path: p, label: 0}))])
	//                   .shuffle(1000)
	//                   .batch(32);

	return { fineData, badData, finePaths, badPaths };
}

filterPaths().then((result) => {
	console.log("Done");
});
