import re

with open('src/pages/purchases.tsx', 'r') as f:
    c = f.read()

c = c.replace("""      await refreshPurchases();
      await refreshVehicles();""", """      await refreshPurchases();
      await refreshVehicles();""")

# For local merge, we might have multiple vehicles updated. `refreshPurchases` and `refreshVehicles` are called after a complex batch.
# Task 4 & 7 say: "har jagah dekho jaha ek user action ... multiple refresh calls trigger karta hai ... agar possible ho to sirf affected documents ko locally update karo"

