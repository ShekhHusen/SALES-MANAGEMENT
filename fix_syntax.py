import re
import os

def fix_internal_accounts():
    p = 'src/pages/internal-accounts.tsx'
    with open(p, 'r') as f:
        c = f.read()
    c = re.sub(r'const transactions = useMemo\(\(\) => \{\s*return rawTransactions\.filter\(t => \{[\s\S]*?return true;\s*\}\);\s*\}, \[rawTransactions\]\);',
               r'const transactions = useMemo(() => { return rawTransactions; }, [rawTransactions]);', c)
    c = re.sub(r'const \[setLoadFromDate\] = useState\(\(\) => \{[\s\S]*?\}\);', '', c)
    with open(p, 'w') as f:
        f.write(c)

def fix_parties():
    p = 'src/pages/parties.tsx'
    with open(p, 'r') as f:
        c = f.read()
    c = re.sub(r'\.filter\(p => \{else if[\s\S]*?const matchesSearch =', r'.filter(p => {\n    const matchesSearch =', c)
    with open(p, 'w') as f:
        f.write(c)

def fix_purchases():
    p = 'src/pages/purchases.tsx'
    with open(p, 'r') as f:
        c = f.read()
    c = re.sub(r'\.filter\(purchase => \{else if[\s\S]*?// Find the vehicles for this purchase\s*const purchaseVehicles =', r'.filter(purchase => {\n      // Find the vehicles for this purchase\n      const purchaseVehicles =', c)
    with open(p, 'w') as f:
        f.write(c)

def fix_inventory():
    p = 'src/pages/inventory.tsx'
    with open(p, 'r') as f:
        c = f.read()
    c = re.sub(r'\.filter\(vehicle => \{else if[\s\S]*?const matchesSearch =', r'.filter(vehicle => {\n    const matchesSearch =', c)
    with open(p, 'w') as f:
        f.write(c)

def fix_sales():
    p = 'src/pages/sales.tsx'
    with open(p, 'r') as f:
        c = f.read()
    c = re.sub(r'\.filter\(sale => \{else if[\s\S]*?const customer =', r'.filter(sale => {\n      const customer =', c)
    with open(p, 'w') as f:
        f.write(c)

fix_internal_accounts()
fix_parties()
fix_purchases()
fix_inventory()
fix_sales()
