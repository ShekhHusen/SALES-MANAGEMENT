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

    # match {!hasLoadedData ? ( ... ) : (
    # We can use regex with DOTALL, up to ") : ("
    # The div inside might have parenthesis, so we match non-greedily up to "\n          ) : ("
    
    content = re.sub(r'\{\!hasLoadedData \? \([\s\S]*?\) : \(\s*<\>', '<>', content)
    # in some files there is no <>, just <Table> or <div
    content = re.sub(r'\{\!hasLoadedData \? \([\s\S]*?\) : \(\s*', '', content)
    
    # Now we have unbalanced `)}` at the end of the replaced blocks.
    # Where is it?
    # In sales.tsx:
    #             </>
    #           )}
    #         </CardContent>
    # Let's replace `</>\n          )}\n        </CardContent>` with `</>\n        </CardContent>`
    content = re.sub(r'<\/>\s*\)\}\s*<\/CardContent>', '</>\n        </CardContent>', content)
    content = re.sub(r'<\/Table>\s*\)\}\s*<\/CardContent>', '</Table>\n        </CardContent>', content)
    content = re.sub(r'<\/div>\s*\)\}\s*<\/CardContent>', '</div>\n        </CardContent>', content)
    # internal accounts:
    #             </Accordion>
    #           )}
    #         </CardContent>
    content = re.sub(r'<\/Accordion>\s*\)\}\s*<\/CardContent>', '</Accordion>\n        </CardContent>', content)
    
    with open(file_path, 'w') as f:
        f.write(content)
