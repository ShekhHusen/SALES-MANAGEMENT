import re
import os

def fix_file(file_path):
    if not os.path.exists(file_path):
        return
    with open(file_path, 'r') as f:
        c = f.read()

    # 1. Remove if (!) { ... } completely
    c = re.sub(r'if\s*\(\!\)\s*\{[^\}]+\}', '', c, flags=re.DOTALL)
    
    # 2. Remove the UI elements for the On-Demand panel that got left behind
    # Parties:
    c = re.sub(r'<div\s+className="space-y-1\.5">\s*<label[^>]+>Load Type Selection<\/label>[\s\S]*?<\/Select>\s*<\/div>', '', c)
    c = re.sub(r'\{\s*===\s*\'date\'\s*&&\s*\([\s\S]*?\)\s*\}', '', c)
    c = re.sub(r'<Button[^>]+onClick=\{[^}]+\}\s*>\s*<Search[^>]+>\s*Load Records\s*<\/Button>', '', c)
    # Also remove the wrapper div that might be empty
    c = re.sub(r'<div\s+className="flex-1 grid gap-4 grid-cols-1 sm:grid-cols-3">\s*<\/div>', '', c)
    
    with open(file_path, 'w') as f:
        f.write(c)

for file in ['src/pages/internal-accounts.tsx', 'src/pages/parties.tsx', 'src/pages/inventory.tsx', 'src/pages/purchases.tsx', 'src/pages/sales.tsx']:
    fix_file(file)

