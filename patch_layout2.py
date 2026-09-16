import re

with open('src/components/layout.tsx', 'r') as f:
    content = f.read()

# Fix the weird import line if it still exists
content = content.replace("import { import { Button", "import { Button")
content = content.replace("} from 'lucide-react';", "  FileSignature,\n} from 'lucide-react';")

with open('src/components/layout.tsx', 'w') as f:
    f.write(content)
