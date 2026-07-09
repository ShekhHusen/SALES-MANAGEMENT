import re

with open('src/components/ExportData.tsx', 'r') as f:
    c = f.read()

c = re.sub(r"const openingsSnap = await getDocs\(collection\(db, 'internal_openings'\)\);.*?const metadataSnap = await getDocs\(collection\(db, 'account_metadata'\)\);", "", c, flags=re.DOTALL)
c = c.replace("'internal_openings': openingsSnap.docs.map(d => d.data()),", "")
c = c.replace("'internal_transactions': transactionsSnap.docs.map(d => d.data()),", "")
c = c.replace("'account_metadata': metadataSnap.docs.map(d => d.data()),", "")

with open('src/components/ExportData.tsx', 'w') as f:
    f.write(c)

with open('src/pages/settings.tsx', 'r') as f:
    c = f.read()

c = c.replace("const collections = ['vehicles', 'purchases', 'sales', 'parties', 'companies', 'models', 'internal_openings', 'internal_transactions', 'internal_data'];", "const collections = ['vehicles', 'purchases', 'sales', 'parties', 'companies', 'models'];")

# Also there are references to txnsSnap in settings.tsx. Let's see them.

