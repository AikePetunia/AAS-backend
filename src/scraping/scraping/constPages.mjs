import { SiteConfig } from "./siteConfig.mjs";

export const siteConfigs = {
    	 test: new SiteConfig({
	 	name: "ArmyTech",
	 	siteImage: "/images/stores/armytech.png",
	 	isPcComponent: true,
	 	isSetup: false,
	 	baseUrl: "https:www.armytech.com.ar",
	 	categories: [
	 		"/405-hardware",
	 		"/436-perifericos",
	 		"/398-gaming-house",
	 		"/431-monitores-y-tvs",
	 		"/373-conectividad",
	 		"/389-energia",
	 	],
	 	selectors: {
	 		productWrapper: ".js-product-miniature-wrapper",
	 		title: ".h3.product-title a",
	 		price: ".product-price",
	 		link: ".h3.product-title a",
	 		image: ".product-thumbnail img",
	 	},
	 	maxPages: 15,
	 }),
}