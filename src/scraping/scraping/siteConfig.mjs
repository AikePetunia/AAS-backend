export class SiteConfig {
  constructor({
    pageName,
    siteImage,
    baseUrl,
    isPcComponent,
    isSetup,
    paths,
    elements,
    // pagination,
    // isOutOfStock,
    // maxPages,
    timeout = 30000,
  }) {
    this.pageName = pageName;
    this.siteImage = siteImage;
    this.baseUrl = baseUrl;
    this.isPcComponent = isPcComponent;
    this.isSetup = isSetup;
    this.paths = paths;
    this.elements = elements;
    // this.pagination = pagination
    // this.isOutOfStock = isOutOfStock; // ver k pedo
    // this.maxPages = maxPages;
    this.timeout = timeout;
  }
}
