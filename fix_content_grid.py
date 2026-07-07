import re

with open('src/pages/purchases.tsx', 'r') as f:
    c = f.read()

c = c.replace('<CardContent className="p-6 space-y-6 lg:pt-0 lg:pb-[10px]">', '<CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 lg:pt-[10px] lg:pb-[10px] items-end">')

with open('src/pages/purchases.tsx', 'w') as f:
    f.write(c)

