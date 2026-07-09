import re

with open('src/contexts/GlobalDataContext.tsx', 'r') as f:
    c = f.read()

c = c.replace("const [veh, comp, mod, col, part, pur, sal, fol, usrs] = await Promise.all([", "const [veh, comp, mod, col, part, pur, sal, usrs] = await Promise.all([")

with open('src/contexts/GlobalDataContext.tsx', 'w') as f:
    f.write(c)

