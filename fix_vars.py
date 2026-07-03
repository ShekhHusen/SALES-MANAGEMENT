import re

files = [
    'src/pages/sales.tsx',
    'src/pages/parties.tsx',
    'src/pages/inventory.tsx',
    'src/pages/purchases.tsx',
    'src/pages/internal-accounts.tsx'
]

injection = """
  const hasLoadedData = true;
  const loadMode = 'all';
  const loadFromDate = '';
  const loadToDate = '';
  const setHasLoadedData = () => {};
  const setLoadMode = () => {};
  const setLoadToDate = () => {};
"""

for file_path in files:
    with open(file_path, 'r') as f:
        content = f.read()

    # Find the export function line
    content = re.sub(r'(export function \w+\(\) \{)', r'\1\n' + injection, content, count=1)
    
    with open(file_path, 'w') as f:
        f.write(content)

