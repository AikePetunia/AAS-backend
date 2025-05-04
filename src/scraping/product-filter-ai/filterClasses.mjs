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

const fineData = tf.data.Dataset.list_files("../data/fineData/*").map(async (filePath) => {
	const fileContent = await tf.data.fileSystem.readFile(filePath);
	return;
});

const badData = tf.data.Dataset.list_files("../data/badData/classes/*").map(async (filePath) => {
	const fileContent = await tf.data.fileSystem.readFile(filePath);
	return;
});

async function filterClasses() {
	console.log(fineData);
	console.log(badData);
	const fineData = await fineData.toArray();
	const badData = await badData.toArray();
	const filteredData = fineData.filter((item) => !badData.includes(item));	
	
	return fineData, badData, filteredData;	
	
}

filterClasses().then(() => console.log("Done"));
