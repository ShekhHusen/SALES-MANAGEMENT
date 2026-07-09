import re

with open('src/pages/inventory.tsx', 'r') as f:
    c = f.read()

bad = 'const matchesSearch = !search || (v.chassisNumber?.toLowerCase() || "").includes(search.toLowerCase()) || (customer?.name?.toLowerCase().includes(search.toLowerCase()) || false);'
good = 'const matchesSearch = !search || (v.chassisNumber?.toLowerCase() || "").includes(search.toLowerCase()) || (customer?.name || "").toLowerCase().includes(search.toLowerCase());'

c = c.replace(bad, good)

with open('src/pages/inventory.tsx', 'w') as f:
    f.write(c)

