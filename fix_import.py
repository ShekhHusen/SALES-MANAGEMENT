import re

with open('src/pages/settings.tsx', 'r') as f:
    content = f.read()

# Add Store to lucide-react imports if it's missing
if 'Store' not in content.split('lucide-react')[0]:
    content = content.replace("import { \n  KeyRound, \n  UserPlus,\n  Shield,\n  Trash2,\n  Save,\n  AlertCircle\n} from 'lucide-react';", 
                              "import { \n  KeyRound, \n  UserPlus,\n  Shield,\n  Trash2,\n  Save,\n  AlertCircle,\n  Store\n} from 'lucide-react';")
    
    # Try alternate format
    content = content.replace("import { Trash2, KeyRound } from 'lucide-react';", "import { Trash2, KeyRound, Store } from 'lucide-react';")
    content = content.replace("import { Trash2 } from 'lucide-react';", "import { Trash2, Store } from 'lucide-react';")

with open('src/pages/settings.tsx', 'w') as f:
    f.write(content)

