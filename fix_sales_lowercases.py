import re

with open('src/pages/sales.tsx', 'r') as f:
    c = f.read()

# Fix 1
bad_1 = 'vehicle?.chassisNumber.toLowerCase().includes(chassisFilter.toLowerCase())'
good_1 = '(vehicle?.chassisNumber || "").toLowerCase().includes(chassisFilter.toLowerCase())'
c = c.replace(bad_1, good_1)

# Fix 2 & 3
bad_2 = 'companies.find(c => c.id === v.companyId)?.name.toLowerCase().includes(searchQuery.toLowerCase())'
good_2 = '(companies.find(c => c.id === v.companyId)?.name || "").toLowerCase().includes(searchQuery.toLowerCase())'
c = c.replace(bad_2, good_2)

with open('src/pages/sales.tsx', 'w') as f:
    f.write(c)

