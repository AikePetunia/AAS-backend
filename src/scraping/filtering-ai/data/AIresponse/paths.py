
"""
Paso 1: ¿Qué tipo de predicción querés?

    ¿Querés decir si una ruta es útil o no? → clasificación binaria

    ¿Querés identificar si un selector es título, precio o imagen? → clasificación multiclase2

"""
import pandas as pd                                         # reading csv files
from sklearn.ensemble import RandomForestClassifier         # comparing from strings
from sklearn.metrics import accuracy_score                  # accuracy
from sklearn.feature_extraction.text import CountVectorizer # separate the '/'
from sklearn.model_selection import train_test_split

# actualmente, solo devuelve lo de test_size,
# y devuelve mezclado con clasificiacion real

#data loading
r_csv = pd.read_csv('../x_paths.csv')
x = r_csv["ruta"].values.astype('U') # gives NaN if it's not unicode
y = r_csv["es_valida"]
original_paths = x

# split and prepares data, vectorization (representation of non-numerical input data)
vectorizer = CountVectorizer(tokenizer= lambda x: x.split('/'))
vec_x = vectorizer.fit_transform(x)

# train are the exercises, test is the test
# Trees in the forest use the best split strategy
vec_x_train, vec_x_test, y_train, y_test, rutas_train, rutas_test = train_test_split(
    vec_x, y, original_paths, test_size=0.1, random_state=42
)

# train model
model = RandomForestClassifier(n_estimators=100) # how many trees
model.fit(vec_x_train, y_train)

# pred, evaluate
y_pred = model.predict(vec_x_test)
acc = accuracy_score(y_test, y_pred)
print("Accuracy", acc )

# give all the paths
def complete_output():
    complete = pd.DataFrame({
        "ruta": rutas_test,
        "prediccion": y_pred,
        "valor_real": y_test.values
    })
    complete.to_csv("complete_output.csv", index=False)
    print("complete paths saved successfully")

complete_output()


# only save correct paths that gave 1
def filter_fine():
    path_fine = rutas_test[y_test == 1]
    fine_output = pd.DataFrame({
        "ruta": path_fine
    })
    fine_output.to_csv("fine_output.csv", index=False)
    print("fine paths saved successfully")
filter_fine()

# es basico, pero concluimos que la manera de que se usa playwright para scrapear y dar un
# un resultado es bastante mala, entonces deberiamos cambiar totalmente toda la clasificacion
