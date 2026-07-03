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
  const loadMode: any = 'all';
  const loadFromDate: any = '';
  const loadToDate: any = '';
  const setHasLoadedData = (val?: any) => {};
  const setLoadMode = (val?: any) => {};
  const setLoadToDate = (val?: any) => {};
"""

for file_path in files:
    with open(file_path, 'r') as f:
        content = f.read()

    # Find the previous injection block and replace it
    # We can just match the block:
    #   const hasLoadedData = true;
    #   ...
    #   const setLoadToDate = () => {};
    
    old_injection = r'  const hasLoadedData = true;\n  const loadMode = \'all\';\n  const loadFromDate = \'\';\n  const loadToDate = \'\';\n  const setHasLoadedData = \(\) => \{\};\n  const setLoadMode = \(\) => \{\};\n  const setLoadToDate = \(\) => \{\};'
    
    content = re.sub(old_injection, injection.strip(), content)
    
    with open(file_path, 'w') as f:
        f.write(content)

