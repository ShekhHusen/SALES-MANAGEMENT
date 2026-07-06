import re
import os

files = [
    'src/pages/sales.tsx',
    'src/pages/purchases.tsx',
    'src/pages/inventory.tsx',
    'src/pages/parties.tsx',
    'src/pages/internal-accounts.tsx'
]

for file_path in files:
    if not os.path.exists(file_path):
        continue
    with open(file_path, 'r') as f:
        c = f.read()

    c = c.replace('sale.fileNumber.toString()', '(sale.fileNumber?.toString() || "")')
    c = c.replace('v.chassisNumber.toLowerCase()', '(v.chassisNumber?.toLowerCase() || "")')
    c = c.replace('c.name.toLowerCase()', '(c.name?.toLowerCase() || "")')
    c = c.replace('c.contactNumber.includes', '(c.contactNumber?.includes || function(){return false;})')
    c = c.replace('p.name.toLowerCase()', '(p.name?.toLowerCase() || "")')
    c = c.replace('p.contactNumber.includes', '(p.contactNumber?.includes || function(){return false;})')
    c = c.replace('purchase.chassisNumbers.includes', '(purchase.chassisNumbers || []).includes')

    with open(file_path, 'w') as f:
        f.write(c)

