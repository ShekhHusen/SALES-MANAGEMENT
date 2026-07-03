import re
import os

files = [
    'src/pages/sales.tsx',
    'src/pages/parties.tsx',
    'src/pages/inventory.tsx',
    'src/pages/purchases.tsx',
    'src/pages/internal-accounts.tsx'
]

for file_path in files:
    if not os.path.exists(file_path):
        continue
    with open(file_path, 'r') as f:
        content = f.read()

    # Fix const declarations
    content = re.sub(r'const\s*=\s*true;', '', content)
    content = re.sub(r'const\s*:\s*any\s*=\s*\'all\';', '', content)
    content = re.sub(r'const\s*:\s*any\s*=\s*\'\';', '', content)
    content = re.sub(r'const\s*setHasLoadedData\s*=\s*\(val\?:\s*any\)\s*=>\s*\{\};', '', content)
    content = re.sub(r'const\s*setLoadMode\s*=\s*\(val\?:\s*any\)\s*=>\s*\{\};', '', content)
    content = re.sub(r'const\s*setLoadToDate\s*=\s*\(val\?:\s*any\)\s*=>\s*\{\};', '', content)

    # Fix the broken filter block in sales, inventory, purchases, parties
    # Wait, the broken block looks like:
    # .filter(sale => {else if (sale.date && (sale.date as any).seconds) {
    # Let's just find `.filter(xxx => {else if` or similar and wipe everything up to the next valid assignment.
    # Actually, it's easier to just match `.filter(sale => {[\s\S]*?const customer = customers.find` and replace with `.filter(sale => { const customer = customers.find`
    
    content = re.sub(r'\.filter\(\s*(\w+)\s*=>\s*\{\s*else if[\s\S]*?const customer = customers\.find', r'.filter(\1 => {\n      const customer = customers.find', content)
    content = re.sub(r'\.filter\(\s*(\w+)\s*=>\s*\{\s*else if[\s\S]*?const vendor = parties\.find', r'.filter(\1 => {\n      const vendor = parties.find', content)
    content = re.sub(r'\.filter\(\s*(\w+)\s*=>\s*\{\s*else if[\s\S]*?const party = parties\.find', r'.filter(\1 => {\n      const party = parties.find', content)
    content = re.sub(r'\.filter\(\s*(\w+)\s*=>\s*\{\s*else if[\s\S]*?const matchesFile =', r'.filter(\1 => {\n      const matchesFile =', content)
    content = re.sub(r'\.filter\(\s*(\w+)\s*=>\s*\{\s*else if[\s\S]*?const matchesStatus =', r'.filter(\1 => {\n      const matchesStatus =', content)

    # Internal accounts has:
    # }, \[rawTransactions, , , , \]\);
    # which we can fix by replacing `\[\s*,` and `,\s*,` and `,\s*\]` again, but carefully.
    content = re.sub(r'\[(\s*,)+', '[', content)
    content = re.sub(r'(,\s*)+\]', ']', content)
    content = re.sub(r'(,\s*)+,', ',', content)
    
    with open(file_path, 'w') as f:
        f.write(content)

