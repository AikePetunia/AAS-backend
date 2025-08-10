import json                                     # we use json for loading and saving data
import joblib                                   # load models
import pandas as pd                             # reading
from collections import defaultdict
# loads the data from the json, that comes from the playwright classes
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
            "tag": element.get("tag", ""),
            "class": element.get("class", ""),
            "text_preview": element.get("text_preview", "")
        })

# in elements there is tag, class, text_preview
df = pd.DataFrame(rows)

model = joblib.load('./training/models/model_classes.pkl')
vectorizer = joblib.load('./training/models/vectorizer_classes.pkl')

df['input_text'] = df[['tag', 'class', 'text_preview']].astype(str).apply(lambda row: ' '.join(row), axis=1)
vec_x = vectorizer.transform(df['input_text'])

preds = model.predict(vec_x)
df['pred_is_valid'] = preds[:, 0]
df['pred_type'] = preds[:, 1]

filtered_df = df[df['pred_is_valid'] == "1"]

grouped = defaultdict(list)
for _, row in filtered_df.iterrows():
    grouped[row['pageName']].append({
        "tag": row['tag'],
        "type": row['pred_type']
    })

# Guardar
with open('./response/filtered/classes_filtered.json', 'w', encoding='utf-8') as f:
    json.dump(grouped, f, indent=4, ensure_ascii=False)
"""
input
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
"""

"""
expected output:
elements: [
tag: ""
type: ""
]
"""

