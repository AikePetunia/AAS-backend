"""
Question for my self:
If we use the query parm "/search/?q=*", is there any guaranty to get all the products? or we need pagination?
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

# Steps to follow:
# 1. Run pathsFromUrl.mjs
# 2. Run paths_classification.py
# 3. Extract at least 1 path from the output. This could be given one filtered path, or manual.
# 4. Run classesFromPaths.mjs
# 5. Run classes_classification.py
# 6. Run core.py
import json
from collections import defaultdict

common_path = './response/filtered/'
with open(common_path + "classes_filtered.json") as f:
    data_classes = json.load(f)

with open(common_path + 'paths_filtered.json') as f:
    data_paths = json.load(f)

# if the entry is the pages on the paths
classes_by_page = defaultdict(list)
# the coreScrapper need to know with what are we working
valid_types = ["title", "link", "price", "image", "productWrapper", "isStocked", "cuotas"]

for entry in data_classes:
    page_name = entry.get('pageName')
    elements_ = entry.get('elements', [])

    seen_class = set()
    seen_tag = set()
    seen_type = set()
    for elem in elements_:
        tag = elem.get('tag')
        for key in valid_types:
            if key in elem:
                class_ = elem[key]
                format_class = "." + class_.replace(' ', '.').replace('*','')
                # some classes are finishing with the .
                if format_class.endswith("."):
                    format_class = format_class[:-1]

                # there are some dupes like price
                combo = (key, format_class, tag)
                if combo not in seen_class and class_ :
                    seen_class.add(combo)
                    classes_by_page[page_name].append({
                        key: f"{format_class} {tag}"
                    })
                elif tag not in seen_tag and not class_:
                    seen_tag.add(tag)
                    classes_by_page[page_name].append({
                        key: tag
                    })

final_sites = []
for path_entry in data_paths:
    page_name = path_entry.get("pageName")
    site_classes = classes_by_page.get(page_name, [])

    final_sites.append({
        "pageName": page_name,
        "siteImage": '',
        "baseUrl": path_entry.get("url", ''),
        "isPcComponent": False,
        "isSetup": False,
        "paths": path_entry.get("paths", []),
        "elements": site_classes,                                # ahora sí es una lista de clases encontradas
        # "pagination": {},
        # "maxPages": 1
    })

with open("response/final_sites_full.json", "w", encoding="utf-8") as f:
    json.dump(final_sites, f, indent=2, ensure_ascii=False)

print("Finalizado el proceso !!!!! de hacer todo la puta madre !!")

