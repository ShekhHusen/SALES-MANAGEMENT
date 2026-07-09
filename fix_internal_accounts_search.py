import re

with open('src/pages/internal-accounts.tsx', 'r') as f:
    c = f.read()

bad = '(p.contactNumber && (p.contactNumber?.includes || function(){return false;})(mappingSearchQuery))'
good = '(p.contactNumber || "").includes(mappingSearchQuery)'
c = c.replace(bad, good)

with open('src/pages/internal-accounts.tsx', 'w') as f:
    f.write(c)

