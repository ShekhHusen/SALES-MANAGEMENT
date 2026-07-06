import re

def patch(file_path, refresh_fn):
    with open(file_path, 'r') as f:
        c = f.read()
    
    if refresh_fn not in c:
        c = re.sub(r'const { (.*?) } = useGlobalData\(\);', rf'const {{ \1, {refresh_fn} }} = useGlobalData();', c, 1)

    c = c.replace("toast.success(", f"await {refresh_fn}();\n      toast.success(")
    
    with open(file_path, 'w') as f:
        f.write(c)

patch('src/pages/sales.tsx', 'refreshSales')
patch('src/pages/purchases.tsx', 'refreshPurchases')
patch('src/pages/parties.tsx', 'refreshParties')

