import json                                     # we use json for loading and saving data
import joblib                                   # load models
import pandas as pd                             # reading
from collections import defaultdict             #formating the json
# models needs
def slash_tokenizer(text):
    return text.split('/')

# loads the data from the json, that comes from the gourlex path extraction
with open('../playwright/resultsPaths/paths.json', 'r') as f:
    data = json.load(f)

rows = []
for domain, paths in data.items():
    for path in paths:
        rows.append((domain, path))

df = pd.DataFrame(rows, columns=['domain', 'path'])

# models classification
model = joblib.load("training/models/model_paths.pkl")
vectorizer = joblib.load("training/models/vectorizer_paths.pkl")
vec_x = vectorizer.transform(df['path'])
preds = model.predict(vec_x)

df['prediction'] = preds

grouped = defaultdict(list)
for _, row in df.iterrows():
    grouped[row['domain']].append(row['path'],)

with open("./response/filtered/paths_filtered.json", "w") as f:
    json.dump(grouped, f, indent=4, ensure_ascii=False)

print("filtered all paths")
