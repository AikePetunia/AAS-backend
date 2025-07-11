import { pathsFromPage } from "./pathsFromUrl.mjs";
import { classesFromPaths } from "./classesFromPaths.mjs";
// TODO change to csv

function getFullInfoPage() {
	pathsFromPage();
	classesFromPaths();
}

getFullInfoPage();
