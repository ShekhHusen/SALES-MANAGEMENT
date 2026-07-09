import re

with open('src/contexts/GlobalDataContext.tsx', 'r') as f:
    c = f.read()

c = c.replace("""      refreshVehicles,
      refreshParties,
      refreshPurchases,
      refreshVehicles,
      refreshSales,""", """      refreshVehicles,
      refreshParties,
      refreshPurchases,
      refreshSales,""")

with open('src/contexts/GlobalDataContext.tsx', 'w') as f:
    f.write(c)

