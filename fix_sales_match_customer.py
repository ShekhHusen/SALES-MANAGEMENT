import re

with open('src/pages/sales.tsx', 'r') as f:
    c = f.read()

bad = 'const matchesCustomer = customer?.name?.toLowerCase().includes(customerFilter.toLowerCase()) || false;'
good = 'const matchesCustomer = (customer?.name || "").toLowerCase().includes(customerFilter.toLowerCase());'

c = c.replace(bad, good)

with open('src/pages/sales.tsx', 'w') as f:
    f.write(c)

