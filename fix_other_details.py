import re

with open('src/pages/internal-accounts.tsx', 'r') as f:
    c = f.read()

# Remove otherDetails state
c = re.sub(r'const \[otherDetails, setOtherDetails\].*?\n', '', c)
c = re.sub(r'onSnapshot\(collection\(db, \'otherDetails\'\).*?\n', '', c)

# Replace otherDetail variable mapping
c = c.replace('const otherDetail = otherDetails.find(od => od.saleId === s.id);', 'const otherDetail = s.otherDetails;')
c = c.replace('const details = otherDetails.find(d => d.saleId === sale.id);', 'const details = sale.otherDetails;')

with open('src/pages/internal-accounts.tsx', 'w') as f:
    f.write(c)

