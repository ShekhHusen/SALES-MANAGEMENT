import re

with open('src/pages/purchases.tsx', 'r') as f:
    c = f.read()

c = c.replace("""  const openEditPurchase = (purchase: Purchase & { id: string }) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setEditingPurchase(purchase);""", """  const openEditPurchase = (purchase: Purchase & { id: string }) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setEditingPurchase(purchase);
    setIsFormOpen(true);""")

with open('src/pages/purchases.tsx', 'w') as f:
    f.write(c)

