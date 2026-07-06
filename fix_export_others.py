import re

for file in ['src/pages/purchases.tsx', 'src/pages/sales.tsx']:
    with open(file, 'r') as f:
        c = f.read()

    c = c.replace('const exportRecords = () => {', 'const exportRecords = async () => {')
    c = c.replace("await refreshPurchases();\n      toast.success('Purchase records exported');", "toast.success('Purchase records exported');")
    c = c.replace("await refreshSales();\n      toast.success('Sales records exported');", "toast.success('Sales records exported');")

    with open(file, 'w') as f:
        f.write(c)

