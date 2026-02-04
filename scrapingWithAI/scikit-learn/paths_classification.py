import json                                     # we use json for loading and saving data
import joblib                                   # load models
import pandas as pd                             # reading
from collections import defaultdict             #formating the json
from urllib.parse import urlparse               # url parsing
import re
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

def pageName(domain):
    parsed = urlparse(domain)
    hostname = parsed.hostname or ''
    hostname = hostname.replace('www.', '')
    hostname = re.sub(r'\.(com|ar|net|com\.ar)$', '', hostname)
    return hostname

grouped = defaultdict(lambda: {'pageName': None, 'url': None, 'paths': []})
for _, row in df.iterrows():
    p_name = pageName(row['domain'])

    if grouped[p_name]['pageName'] is None:
        grouped[p_name]['pageName'] = p_name
        grouped[p_name]['url'] = row['domain'] #.rstrip('/')

    grouped[p_name]['paths'].append(row['path'])

grouped_list = list(grouped.values()) # no name at the beggining if it's a list and not a diccionary

with open("./response/filtered/paths_filtered.json", "w") as f:
    json.dump(grouped_list, f, indent=4, ensure_ascii=False)

print("filtered all paths")
