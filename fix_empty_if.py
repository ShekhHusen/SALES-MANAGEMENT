import re
import os

files = [
    'src/pages/internal-accounts.tsx',
    'src/pages/parties.tsx',
    'src/pages/inventory.tsx',
    'src/pages/purchases.tsx',
    'src/pages/sales.tsx'
]

for file_path in files:
    if not os.path.exists(file_path):
        continue
    with open(file_path, 'r') as f:
        content = f.read()

    # Remove `if (!) {\n setLoading(false);\n return;\n }`
    content = re.sub(r'if\s*\(\!\)\s*\{\s*setLoading\(false\);\s*return;\s*\}', '', content)
    # Generic if (!) { return false; }
    content = re.sub(r'if\s*\(\!\)\s*return\s+false;', '', content)
    # Generic if (!somethingThatWasRemoved) { return []; } etc
    content = re.sub(r'if\s*\(\!\)\s*return.*?;', '', content)

    with open(file_path, 'w') as f:
        f.write(content)

