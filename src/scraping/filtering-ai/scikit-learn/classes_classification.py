import json                                     # we use json for loading and saving data
import joblib                                   # load models
import pandas as pd                             # reading
from collections import defaultdict             # loads the data from the json, that comes from the playwright classes
from urllib.parse import urlparse               # url parsing
import re
with open('../playwright/resultsClasses/elements_by_pages.json', 'r') as f:
    data = json.load(f)


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
            "text_preview": element.get("text_preview", "") # testing only
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

filtered_df = df[(df['pred_is_valid'] == "1") & (df['pred_type'] != 'nan')]

def validate_types(elements):

    validations = {
        "title": 0,
        "link": 0,
        "price": 0,
        "image": 0,
        "productWrapper": 0,
        "isStocked": 0,
        "cuotas": 0,
    }

    for el in elements:
        for key in validations:
            if key in el:
                validations[key] += 1

    isError = validations["title"] == 0 | validations["link"] == 0
    isWarning = validations["price"] == 0 | validations["productWrapper"] == 0  | validations["price"] == 0 | validations['image'] == 0
    isAlert = validations["cuotas"] == 0 | validations["isStocked"] == 0

    return {
            "validations": validations,
            "error": isError,
            "warning": isWarning,
            "alert": isAlert
        }

grouped = defaultdict(lambda: {'pageName': None, 'url': None,  'elements': []})

for _, row in filtered_df.iterrows():
    page = row['pageName']
    p_name = pageName(row['url'])
    # if url and elements exist, in the second iteration doesn't add it.
    if grouped[page]['pageName'] is None:
        grouped[page]['pageName'] = p_name
        grouped[page]['url'] = row['url']

    grouped[page]['elements'].append({
        "tag": row['tag'],
        row['pred_type']: row['class'],
        # "text_preview": row["text_preview"], # only to see the content
    })

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

print('filtered all classes')

"""
input:
[
  {
    "pageName": "tiendatrade.com.ar",
    "url": "https://www.tiendatrade.com.ar/listado/computacion/perifericos-pc/",
    "elements": [
      {
        "tag": "andes-modal",
        "class": "andes-modal--iframe",
        "text_preview": ""
      },

expected output:

elements: [
tag: ""
type: class
]
"""

