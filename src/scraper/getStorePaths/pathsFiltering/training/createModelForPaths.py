import pandas as pd  # reading csv files
from sklearn.ensemble import RandomForestClassifier             # Model
from sklearn.metrics import accuracy_score                      # accuracy
from sklearn.feature_extraction.text import CountVectorizer     # traits strings for the randomForestClassifier
from sklearn.model_selection import train_test_split            # we have y_type, y_pred
import joblib                                                   # easy simple parallel computing and importing the model
from tokenizers import slash_tokenizer

r_csv = pd.read_csv('../datasets/formatedPathsForTraining.csv')
x = r_csv["path"].values.astype('U')
y = r_csv["is_valid"]

# Remove rows where the training label is missing.
valid_rows_mask = y.notna()
x = x[valid_rows_mask]
y = y[valid_rows_mask].astype(int)
original_paths = x

vectorizer = CountVectorizer(tokenizer=slash_tokenizer, token_pattern=None)
vec_x = vectorizer.fit_transform(x)

vec_x_train, vec_x_test, y_train, y_test, paths_train, paths_test = (
    train_test_split(vec_x, y, original_paths, test_size=0.1, random_state=42))

model = RandomForestClassifier(n_estimators=100)
model.fit(vec_x_train, y_train)

y_pred = model.predict(vec_x_test)
acc = accuracy_score(y_test, y_pred)
print("Accuracy", acc)

vec_x_total = vectorizer.transform(x)
y_all_pred = model.predict(vec_x_total)
# filter_fine(y_all_pred)
# complete_output(y_all_pred)

joblib.dump(model, "models/modelForPaths.pkl")
joblib.dump(vectorizer, "models/vectorizerForPaths.pkl")


"""
def filter_fine(y_all_pred):
    fine_paths = x[y_all_pred == 1]
    fine_output = pd.DataFrame({
        "path": fine_paths
    })
    fine_output.to_csv("./trainingResults/paths/onlyFinePaths.csv", index=False)
    print("fine paths saved successfully")
    
# saves the correct data (useful to see training results)
def complete_output(y_all_pred):
    complete = pd.DataFrame({
        "path": x,
        "prediction": y_all_pred,
        "is_valid": y,
    })
    complete.to_csv("./response/paths/completePathsClassification.csv", index=False)
    print("complete paths saved successfully")


"""
