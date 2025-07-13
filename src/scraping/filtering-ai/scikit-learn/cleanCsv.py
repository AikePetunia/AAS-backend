import pandas as pd
import csv

# Ruta de entrada y salida
elements_path = '../playwright/resultsClasses/elements.csv'
out_path = './datasets/elements_clean.csv'

# Leer el CSV de elementos con manejo de comas en campos y líneas erróneas
df = pd.read_csv(
    elements_path,
    engine='python',               # Permite mayor flexibilidad en tokenización
    quotechar='"',               # Reconoce campos entre comillas
    skipinitialspace=True,        # Elimina espacios después de separadores
    on_bad_lines='warn',          # Ignora líneas mal formateadas mostrando advertencia
    quoting=csv.QUOTE_MINIMAL     # Usa el modo mínimo de quoting
)

# Eliminar duplicados basados en 'text_preview', manteniendo la primera aparición
df_clean = df.drop_duplicates(subset=['text_preview'], keep='first')

# Resetear índice para limpieza de registro
df_clean = df_clean.reset_index(drop=True)

# Guardar el CSV limpio
df_clean.to_csv(out_path, index=False)

print(f"Se eliminaron {len(df) - len(df_clean)} duplicados. CSV limpio guardado en: {out_path}")
