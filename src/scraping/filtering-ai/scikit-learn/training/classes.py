import pandas as pd                                         # reading csv files
from sklearn.ensemble import RandomForestClassifier         # models
from sklearn.feature_extraction.text import CountVectorizer # traits strings for the randomForestClassifier
from sklearn.model_selection import train_test_split        # we have y_type, y_pred
from sklearn.multioutput import MultiOutputClassifier       # ya que necesitamos saber además si es valido, el tipo
from sklearn.metrics import classification_report           # accuracy
import joblib                                               # easy simple parallel computing and importing the mdoel

# data loading
r_csv = pd.read_csv('./datasets/classes.csv')
x = r_csv[["tag","class","text_preview"]].values.astype(str)
y = r_csv[["is_valid", "type"]].values.astype(str)

# separate the data and vectorize
x_raw = r_csv[["tag", "class", "text_preview"]].astype(str)
x_joined = x_raw.apply(lambda row: ' '.join(row), axis=1)
vectorizer = CountVectorizer()
vec_x = vectorizer.fit_transform(x_joined)

#trains
vec_x_train, vec_x_test, y_train, y_test, paths_train, paths_test = train_test_split(
    vec_x, y, x_raw, test_size=0.1, random_state=42
)

#train
model = MultiOutputClassifier(RandomForestClassifier(n_estimators=100))
model.fit(vec_x_train, y_train)
y_pred = model.predict(vec_x_test)

# accuracy per thing
print("is_valid:")
print(classification_report(y_test[:, 0], y_pred[:, 0]))
print("type:")
print(classification_report(y_test[:, 1], y_pred[:, 1]))

"""
def complete_output(y_all_pred):
    complete = pd.DataFrame({
        "tag": r_csv["tag"].values.astype(str),
        "class": r_csv["class"].values.astype(str),
        "text_preview": r_csv["text_preview"].values.astype(str),
        # y_all_pred has y_pred, y_type
        "pred_is_valid": y_all_pred[:, 0], # is_valid
        "pred_type": y_all_pred[:, 1], # type
        "true_is_valid": y[:, 0],
        "true_type": y[:, 1],
    })
    complete.to_csv("./response/paths/classes_pred.csv", index=False)
    print("complete paths saved successfully")

def filter_fine(y_all_pred):
    mask_valid = y_all_pred[:, 0] == "1"
    filtered_df = r_csv.loc[mask_valid, ["tag", "class", "text_preview", "type"]].copy()
    filtered_df.to_csv("./response/paths/fine_class.csv", index=False)
    print(f"fine paths saved successfully, {len(filtered_df)} rows")
"""

vec_x_total = vectorizer.transform(x_joined)
y_all_pred = model.predict(vec_x_total)
# complete_output(y_all_pred)
# filter_fine(y_all_pred)

# importing the model
joblib.dump(model, "./training/models/model_classes.pkl")
joblib.dump(vectorizer, "./training/models/vectorizer_classes.pkl")