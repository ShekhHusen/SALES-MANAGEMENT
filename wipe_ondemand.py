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

    # 1. Remove the injected variables from previous script
    injection = r"""  const hasLoadedData = true;
  const loadMode: any = 'all';
  const loadFromDate: any = '';
  const loadToDate: any = '';
  const setHasLoadedData = \(val\?: any\) => \{\};
  const setLoadMode = \(val\?: any\) => \{\};
  const setLoadToDate = \(val\?: any\) => \{\};"""
    content = re.sub(injection, '', content)
    
    # 2. Remove the On-Demand Panel (from comment up to </Card> right before another <Card)
    # The panel might look like:
    # {/* On-Demand Data Loader Panel */}
    # <Card className="...">
    # ...
    # </Card>
    # <Card className="...">  <- next card
    
    content = re.sub(r'\{\/\*\s*On-Demand Data Loader Panel\s*\*\/\}.*?<\/Card>\s*(?=<Card)', '', content, flags=re.DOTALL)
    
    # Wait, in internal-accounts.tsx it might be:
    # {/* On-Demand Data Loader Panel */}
    # <Card ...> ... </Card>
    # <Tabs ...>
    content = re.sub(r'\{\/\*\s*On-Demand Data Loader Panel\s*\*\/\}.*?<\/Card>\s*(?=<Tabs)', '', content, flags=re.DOTALL)
    
    # 3. Remove "if (loadMode === 'date') { ... }" blocks
    content = re.sub(r'\s*\/\/\s*On-demand date scope filter\s*if\s*\(loadMode\s*===\s*\'date\'\)\s*\{[^\}]+\}\s*', '', content, flags=re.DOTALL)
    # Without the comment, just in case:
    content = re.sub(r'if\s*\(loadMode\s*===\s*\'date\'\)\s*\{[^\}]+\}\s*', '', content, flags=re.DOTALL)

    # 4. Remove variables from array dependencies
    content = re.sub(r',?\s*hasLoadedData', '', content)
    content = re.sub(r',?\s*loadMode', '', content)
    content = re.sub(r',?\s*loadFromDate', '', content)
    content = re.sub(r',?\s*loadToDate', '', content)
    
    # Also clean up empty dependencies like [ , , ]
    content = re.sub(r'\[\s*,', '[', content)
    content = re.sub(r',\s*\]', ']', content)
    content = re.sub(r',\s*,', ',', content)
    
    with open(file_path, 'w') as f:
        f.write(content)
