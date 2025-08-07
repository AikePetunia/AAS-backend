"""
Question for my self:
If we use the query parm "/search/?q=*", is there any guaranty to get all the products? o we need pagination?
pagination is a good idea? or it ads complexity? The gourlex tool doesn't add that feature, but we can add it by hand.
armyTech: new SiteConfig({
    name: "ArmyTech",
    siteImage: "/images/stores/armytech.png",
    isPcComponent: true,                            <- This would be set to true if it provides components for a pc, latops, monitors, etc. Armytech would be an example. By hand
    isSetup: false,                                 <- This would be set to true if it provides decorations, chairs, desktops, keycaps, leds, etc. MGM gamers would be an example. By hand
    baseUrl: "https://www.armytech.com.ar",         <- baseUrl. Maybe by hand
    categories: [                                   <- paths.py
      "/405-hardware",
      "/436-perifericos",
      "/398-gaming-house",
      "/431-monitores-y-tvs",
      "/373-conectividad",
      "/389-energia",                               <- A good way to see if the paths were correctly selected, it's getting the classes to similar paths, and if they are slightly different, there are correct. This could add accuaracy
    ],
    selectors: {                                    <- From the getClassesFromPath && classes.py
      productWrapper: "cgw-product-card",           <- Containerinfo that gets all the info, adds presicion
      title: "h3.product-card__title",              <- Name
      price: ".product-card__cart__price--current", <- Price
      link: "a", <- the anchor tag.
      image: ".medium product-card__image img",     <- Image
    },
    pagination: {
      type: "queryParam",                           <- Type of pagination. Could be query or path.
      param: "cate",
    },
    isOutOfStock: (element) => element.textContent.includes("Agotado"),
    maxPages: 1,                                    <- Max pages of each category if there is any pagination (Possible indiviual max pages.)
    )},
"""