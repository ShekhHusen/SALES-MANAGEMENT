import re

# Fix inventory.tsx
with open('src/pages/inventory.tsx', 'r') as f:
    c = f.read()

c = c.replace("const { vehicles, companies, models, colors, parties, purchases, sales } = useGlobalData();", "const { vehicles, companies, models, colors, parties, purchases, sales, refreshVehicles } = useGlobalData();")
with open('src/pages/inventory.tsx', 'w') as f:
    f.write(c)

# Fix sales.tsx
with open('src/pages/sales.tsx', 'r') as f:
    c = f.read()

if 'runTransaction' not in c.split('\n')[2]:
    c = c.replace("import { collection, onSnapshot, query, where, Timestamp, writeBatch, doc, getDocs, orderBy, limit, deleteDoc, updateDoc, deleteField } from '@/lib/trackedFirestore';", "import { collection, onSnapshot, query, where, Timestamp, writeBatch, doc, getDocs, orderBy, limit, deleteDoc, updateDoc, deleteField, runTransaction } from '@/lib/trackedFirestore';")

with open('src/pages/sales.tsx', 'w') as f:
    f.write(c)

