import re

with open('src/pages/process-document.tsx', 'r') as f:
    content = f.read()

# I need to match:
# setViewSale(sale);
# setViewSheetOpen(true);
# And replace with handleViewSale(sale);

content = re.sub(r'setViewSale\(sale\);\s*setViewSheetOpen\(true\);', 'handleViewSale(sale);', content)

with open('src/pages/process-document.tsx', 'w') as f:
    f.write(content)

