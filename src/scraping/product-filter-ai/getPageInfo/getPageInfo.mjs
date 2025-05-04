import { getPaths } from "./getPaths.mjs"
import { getClassesFromPaths } from "./getClassesFromPaths.mjs"

function getFullInfoPage() {
    getPaths();
    getClassesFromPaths();
}

getFullInfoPage();