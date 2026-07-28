export function parsePrice(priceStr) {
	if (!priceStr) return null;
	const raw = priceStr;
	const value = parseInt(priceStr.replace(/\$/g, "").replace(/\./g, "").replace(/,/g, "."), 10);
	return value;
}

export function hashCode(str) {
	let hash = 0;
	for (const char of str) {
		hash = (hash << 5) - hash + char.charCodeAt(0);
		hash |= 0;
	}
	return Math.abs(hash).toString(16).padStart(8, "0");
}

export function getFirstValue(obj, paths) {
	if (!paths) return undefined;
	if (Array.isArray(paths)) {
		return paths.map((path) => getValueByPath(obj, path)).find((value) => value !== undefined);
	}
	return getValueByPath(obj, paths);
}

export function getValueByPath(obj, path) {
	if (!obj || !path) return undefined;
	const parts = path
		.replace(/\?\./g, ".")
		.replace(/\[(\d+)\]/g, ".$1")
		.split(".");

	return parts.reduce((current, key) => {
		if (current === undefined || current === null) return undefined;
		return current[key];
	}, obj);
}
