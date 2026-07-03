import os
import re

files = [
    'src/pages/sales.tsx',
    'src/pages/parties.tsx',
    'src/pages/inventory.tsx',
    'src/pages/purchases.tsx',
    'src/pages/internal-accounts.tsx'
]

for file_path in files:
    with open(file_path, 'r') as f:
        content = f.read()

    # Remove state declarations
    content = re.sub(r'^\s*const\s*\[hasLoadedData.*?useState.*?;\n', '', content, flags=re.MULTILINE)
    content = re.sub(r'^\s*const\s*\[loadMode.*?useState.*?;\n', '', content, flags=re.MULTILINE)
    content = re.sub(r'^\s*const\s*\[loadFromDate.*?useState.*?;\n', '', content, flags=re.MULTILINE)
    content = re.sub(r'^\s*const\s*\[loadToDate.*?useState.*?;\n', '', content, flags=re.MULTILINE)

    # Remove early returns / filter blocks
    content = re.sub(r'^\s*if\s*\(!hasLoadedData\)\s*return.*?\n', '', content, flags=re.MULTILINE)
    content = re.sub(r'^\s*if\s*\(loadMode\s*===\s*\'date\'\)\s*\{[^\}]+\}\n', '', content, flags=re.MULTILINE)
    
    # Remove variables from dependencies
    content = re.sub(r'(hasLoadedData|loadMode|loadFromDate|loadToDate),\s*', '', content)
    content = re.sub(r',\s*(hasLoadedData|loadMode|loadFromDate|loadToDate)', '', content)
    
    # Remove On-Demand Panel
    # Finds {/* On-Demand Data Loader Panel */} up to </Card> right before <Card className="rounded-2xl border-slate-100...
    content = re.sub(r'\{\/\*\s*On-Demand Data Loader Panel\s*\*\/\}.*?<\/Card>\s*(?=<Card)', '', content, flags=re.DOTALL)

    # Remove {!hasLoadedData ? ( ... ) : ( <> ... </> )} wrapper
    # We want to replace `{!hasLoadedData ? ( ... ) : (` with empty string, but we also have to remove the closing `)}` or `)}`
    # Let's just do a string replacement
    
    # Match the whole {!hasLoadedData ? ( ... ) : ( <something> )} 
    # It's tricky because <something> could be large.
    # Alternatively:
    
    parts = content.split('{!hasLoadedData ? (')
    if len(parts) > 1:
        new_content = parts[0]
        for part in parts[1:]:
            # Find the split for ) : (
            sub_parts = part.split(') : (', 1)
            if len(sub_parts) == 2:
                # the rest is inside ( ... )
                # wait, in sales.tsx it is:
                # ) : (
                #   <>
                #     <Table> ...
                #   </>
                # )}
                # Let's replace the ending `)}` for this block
                rest = sub_parts[1]
                # find the last `)}` in rest? No, that's dangerous.
                # just replace `{!hasLoadedData ? ( ... ) : (\n            <>\n` with `<>\n`
                pass
        
    with open(file_path, 'w') as f:
        f.write(content)
