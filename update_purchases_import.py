import re

with open('src/pages/purchases.tsx', 'r') as f:
    c = f.read()

c = c.replace("import { useGlobalData } from '@/contexts/GlobalDataContext';", "import { useGlobalData } from '@/contexts/GlobalDataContext';\nimport { cn } from '@/lib/utils';")
c = c.replace("Database } from 'lucide-react';", "Database, ChevronUp, ChevronDown } from 'lucide-react';")

with open('src/pages/purchases.tsx', 'w') as f:
    f.write(c)

