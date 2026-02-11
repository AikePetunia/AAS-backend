import json                                     # we use json for loading and saving data
import joblib                                   # load models
import pandas as pd                             # reading
import importlib.util
import os
import re
import sys
from collections import defaultdict             # formating the json
from urllib.parse import urlparse               # url parsing

# Ensure pickle resolves the custom tokenizer function from local training code.
training_dir = os.path.join(os.path.dirname(__file__), "training")
tokenizers_path = os.path.join(training_dir, "tokenizers.py")
spec = importlib.util.spec_from_file_location("tokenizers", tokenizers_path)
tokenizers_module = importlib.util.module_from_spec(spec)
sys.modules["tokenizers"] = tokenizers_module
spec.loader.exec_module(tokenizers_module)

model = joblib.load("./training/models/modelForPaths.pkl")
vectorizer = joblib.load("./training/models/vectorizerForPaths.pkl")

with open('../extractPagesInfo/resultPaths/pathsToClassify.json', 'r', encoding="utf-8") as f:
    data = json.load(f)

rows = []
for domain, paths in data.items():
    for path in paths:
        rows.append((domain, path))

df = pd.DataFrame(rows, columns=['domain', 'path'])

vec_x = vectorizer.transform(df['path'])
preds = model.predict(vec_x)
df['prediction'] = preds

def pagename(domain):
    parsed = urlparse(domain)
    hostname = parsed.hostname or ''
    hostname = hostname.replace('www.', '')
    hostname = re.sub(r'\.(com|ar|net|com\.ar)$', '', hostname)
    return hostname

grouped = defaultdict(lambda: {'pageName': None, 'url': None, 'paths': []})

for _, row in df.iterrows():
    p_name = pagename(row['domain'])

    if grouped[p_name]['pageName'] is None:
        grouped[p_name]['pageName'] = p_name
        grouped[p_name]['url'] = row['domain'] #.rstrip('/')

    grouped[p_name]['paths'].append(row['path'])

grouped_list = list(grouped.values()) # no name at the beggining if it's a list and not a diccionary

with open("response/classified/classifiedPaths.json", "w", encoding="utf-8") as f:
    json.dump(grouped_list, f, indent=4, ensure_ascii=False)

print("classified all paths")
