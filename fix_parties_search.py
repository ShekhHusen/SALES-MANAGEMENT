import re

with open('src/pages/parties.tsx', 'r') as f:
    c = f.read()

bad = 'const matchesSearch = (p.name?.toLowerCase() || "").includes(search.toLowerCase()) || (p.contactNumber?.includes || function(){return false;})(search);'
good = 'const matchesSearch = (p.name?.toLowerCase() || "").includes(search.toLowerCase()) || (p.contactNumber || "").includes(search);'
c = c.replace(bad, good)

with open('src/pages/parties.tsx', 'w') as f:
    f.write(c)

