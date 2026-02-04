import json                                     # we use json for loading and saving data
import joblib                                   # load models
import pandas as pd                             # reading
from collections import defaultdict             # loads the data from the json, that comes from the playwright classes
from urllib.parse import urlparse               # url parsing
import re
with open('../playwright/resultsClasses/elements_by_pages.json', 'r') as f:
    data = json.load(f)

# classes & tag is no longer being used for this version
# row["pred_type"]: row["class"],
# row["tag"]: row["tag"]
rows = []
for page in data:
    pageName = page["pageName"]
    url = page["url"]
    for element in page["elements"]:
        rows.append({
            "pageName": pageName,
            "url": url,
            "tag": element.get("tag", ""), # testing only
            "class": element.get("class", ""),
            "text_preview": element.get("text_preview", "").replace('EN STOCK', ''),
            "href": element.get('href', '')
        })


def pageName(domain):
    parsed = urlparse(domain)
    hostname = parsed.hostname or ''
    hostname = hostname.replace('www.', '')
    hostname = re.sub(r'\.(com|ar|net|com\.ar)$', '', hostname)
    return hostname

# in elements there is tag, class, text_preview
df = pd.DataFrame(rows)

model = joblib.load('./training/models/model_classes.pkl')
vectorizer = joblib.load('./training/models/vectorizer_classes.pkl')

df['input_text'] = df[['tag', 'class', 'text_preview']].astype(str).apply(lambda row: ' '.join(row), axis=1)
vec_x = vectorizer.transform(df['input_text'])

preds = model.predict(vec_x)
df['pred_is_valid'] = preds[:, 0]
df['pred_type'] = preds[:, 1]

filtered_df = df[(df['pred_is_valid'] == "1") & (pd.notna(df['pred_type']))]

def validate_types(elements):
    keys = ["title","link","price","image","productWrapper","isStocked","cuotas"]
    validations = {k: sum(1 for el in elements if k in el) for k in keys}

    isError   = (validations["title"] == 0) or (validations["link"] == 0)
    isWarning = (validations["price"] == 0) or (validations["productWrapper"] == 0) or (validations["image"] == 0)
    isAlert   = (validations["cuotas"] == 0) or (validations["isStocked"] == 0)

    return {"validations": validations, "error": isError, "warning": isWarning, "alert": isAlert}


def _has(val):
    return val is not None and pd.notna(val) and str(val).strip() != ""

def clean_value(kind: str, text: str | None) -> str | None:
    t = (text or "")
    t = re.sub(r"\s+", " ", t).strip()
    if not t:
        return None
    if kind == "title":
        t = re.sub(r"(?:ars|\$|usd|u\$s|u\$d)\s*[\d.,]+", "", t, flags=re.I)
        t = re.sub(r"\b(en\s+stock|disponible|sin\s+stock|agotado|out\s+of\s+stock)\b", "", t, flags=re.I)
        t = re.sub(r"\s+", " ", t).strip()
        return t or None
    if kind == "price":
        m = re.search(r"(?:ars|\$|usd|u\$s|u\$d)?\s*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)", t, flags=re.I)
        return m.group(0).strip() if m else None
    if kind == "isStocked":
        if re.search(r"\b(agotado|sin\s+stock|no\s+disponible|out\s+of\s+stock)\b", t, flags=re.I):
            return "Sin stock"
        if re.search(r"\b(en\s+stock|disponible|in\s+stock)\b", t, flags=re.I):
            return "En stock"
        return t or None
    if kind == "cuotas":
        m = re.search(r"\b(\d{1,2})\s+cuotas?\b(?:.*?sin\s+inter[eé]s)?", t, flags=re.I)
        return (m.group(0) if m else t) or None

grouped = defaultdict(lambda: {'pageName': None, 'url': None, 'elements': []})
ALLOWED_SUFFIXES = ('.jpg', '.jpeg', '.png', '.avif', '.webp', ".svg")
for _, row in filtered_df.iterrows():

    page = row["pageName"]
    p_name = pageName(row["url"])
    kind = row["pred_type"]

    grouped.setdefault(page, {"pageName": None, "url": None, "elements": []})
    if grouped[page]["pageName"] is None:
        grouped[page]["pageName"] = p_name
        grouped[page]["url"] = row["url"]

    item = {
        row["pred_type"]: row.get("text_preview"),
    }

    if kind == "link":
        href = row.get("href")
        if _has(href):
            item["link"] = href
    elif kind == "image":
        src = row.get("href")
        if _has(src) and not str(src).startswith("data:image/") and src.endswith(ALLOWED_SUFFIXES):
            item["image"] = str(src).strip()
    else:
        # title / price / isStocked / cuotas
        item[kind] = clean_value(kind, row.get("text_preview"))
    grouped[page]["elements"].append(item)

"""
expected answer for using ON THIS STATE them:
title
link
price
image
isStocked
Cuotas

gracias a dios, parece q estan separados correctamente y diferenciaods. El tema es como mierda doy una respuesta q contenga
los 6 y nose saltee nunca nada xd
podriamos pensarlo como una linked list? tiene que si o si empezar con el ciclo que tiene arriba
y si el siguiente elemento, es el igual al mismo, que se elimine (yta que debe haber uno solo, y no repetidos)
"""


grouped_list = list(grouped.values())
countError = countWarning = countAlert = countOk = 0
pageError = []
pageWarning = []
pageAlert = []
pageOk = []
for page in grouped_list:
    result = validate_types(page["elements"])
    if result["error"]:
        print(f"[ERROR] {page['pageName']} missing critical elements: {result['validations']}")
        countError +=  1
        pageError.append(page['pageName'])
    elif result["warning"]:
        print(f"[WARNING] {page['pageName']} missing important elements: {result['validations']}")
        countWarning +=  1
        pageWarning.append(page['pageName'])
    elif result["alert"]:
        print(f"[ALERT] {page['pageName']} missing detail elements: {result['validations']}")
        countAlert += 1
        pageAlert.append(page['pageName'])
    else:
        print(f"[OK] {page['pageName']} validated")
        countOk +=  1
        pageOk.append(page['pageName'])

print("------*------*------*------")
print("------*------*------*------")
print("Stats:")
print(countError, "[ERROR] pages:", pageError)
print(countWarning, "[WARNING] pages:", pageWarning)
print(countAlert, "[ALERT] pages:", pageAlert)
print(countOk, "[Ok] pages:", pageOk)
print("------*------*------*------")
print("------*------*------*------")

with open('./response/filtered/classes_filtered.json', 'w', encoding='utf-8') as f:
    json.dump(grouped_list, f, indent=4, ensure_ascii=False)

