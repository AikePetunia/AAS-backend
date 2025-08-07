import pandas as pd                                         # reading csv files
from sklearn.ensemble import RandomForestClassifier         # Model
from sklearn.metrics import accuracy_score                  # accuracy
from sklearn.feature_extraction.text import CountVectorizer # traits strings for the randomForestClassifier
from sklearn.model_selection import train_test_split
import joblib  # easy simple parallel computing

# data loading
r_csv = pd.read_csv('../datasets/paths.csv')
x = r_csv["path"].values.astype('U') # gives NaN if it's not Unicode
y = r_csv["is_valid"]
original_paths = x

# split and prepares data, vectorization (representation of non-numerical input data)
def slash_tokenizer(x):
    return x.split('/')
vectorizer = CountVectorizer(tokenizer=slash_tokenizer) # changed from lamba to def,  causes pickle error
vec_x = vectorizer.fit_transform(x)

# train are the exercises, test is the test
# Trees in the forest use the best split strategy
vec_x_train, vec_x_test, y_train, y_test, paths_train, paths_test = train_test_split(
    vec_x, y, original_paths, test_size=0.1, random_state=42
)

# train model
model = RandomForestClassifier(n_estimators=100) # how many trees
model.fit(vec_x_train, y_train)

# pred, evaluate
y_pred = model.predict(vec_x_test)
acc = accuracy_score(y_test, y_pred)
print("Accuracy", acc )

# saves the correct data
def complete_output(y_all_pred):
    complete = pd.DataFrame({
        "path": x,
        "prediction": y_all_pred,
        "is_valid": y,
    })
    complete.to_csv("../response/paths/complete.csv", index=False)
    print("complete paths saved successfully")

def filter_fine(y_all_pred):
    fine_paths = x[y_all_pred == 1]
    fine_output = pd.DataFrame({
        "path": fine_paths
    })
    fine_output.to_csv("../response/paths/fine.csv", index=False)
    print("fine paths saved successfully")

vec_x_total = vectorizer.transform(x)
y_all_pred = model.predict(vec_x_total)
filter_fine(y_all_pred)
complete_output(y_all_pred)

joblib.dump(model, "../model/model_paths.pkl")
joblib.dump(vectorizer, "../model/vectorizer_paths.pkl")
# es basico, pero concluimos que la manera de que se usa playwright para scrapear y dar un
# un resultado es bastante mala, entonces deberiamos cambiar totalmente toda la clasificacion
