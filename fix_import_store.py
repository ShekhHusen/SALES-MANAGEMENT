import re

with open('src/pages/settings.tsx', 'r') as f:
    content = f.read()

content = content.replace("import { Trash2, Plus, ChevronDown, ChevronUp, KeyRound } from 'lucide-react';", "import { Trash2, Plus, ChevronDown, ChevronUp, KeyRound, Store } from 'lucide-react';")

with open('src/pages/settings.tsx', 'w') as f:
    f.write(content)
