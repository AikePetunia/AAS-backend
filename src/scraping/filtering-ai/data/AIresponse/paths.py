
"""
Paso 1: ¿Qué tipo de predicción querés?

    ¿Querés decir si una ruta es útil o no? → clasificación binaria

    ¿Querés identificar si un selector es título, precio o imagen? → clasificación multiclase2

"""
import pandas as pd                                 # reading csv files
from sklearn.ensemble import RandomForestClassifier # comparing from strings
from sklearn.pipeline import Pipeline               # prepare pipeline for the model

import matplotlib.pylab as plt                      # for graphic views

x_paths = pd.read_csv('../x_paths.csv')
y_pred = pd.read_csv('../y_pred.csv')

enc = OneHotEncoder(sparse_output=False, handle_unknown='ignore2')
enc.fit(x_paths, y_pred)

print(x_paths.head(3))
print(y_pred.head(3))