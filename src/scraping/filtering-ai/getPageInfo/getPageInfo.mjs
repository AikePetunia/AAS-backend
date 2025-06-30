import { pathsFromPage } from "./pathsFromUrl.mjs";
import { classesFromPaths } from "./classesFromPaths.mjs";

function getFullInfoPage() {
	pathsFromPage();
	classesFromPaths();
}

getFullInfoPage();
