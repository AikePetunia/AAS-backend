export class SiteConfig {
  constructor({
    name,
    siteImage,
    baseUrl,
    isPcComponent,
    isSetup,
    categories,
    selectors,
    pagination,
    isOutOfStock,
    maxPages = 10,
    timeout = 30000,
  }) {
    if (!name || !baseUrl || !categories || !selectors) {
      throw new Error("Missing required configuration parameters");
    }

    this.name = name;
    this.siteImage = siteImage;
    this.baseUrl = baseUrl;
    this.isPcComponent = isPcComponent;
    this.isSetup = isSetup;
    this.categories = categories;
    this.selectors = selectors;
    this.pagination = pagination || { type: "queryParam", param: "page" };
    this.isOutOfStock = isOutOfStock;
    this.maxPages = maxPages;
    this.timeout = timeout;
  }
}
