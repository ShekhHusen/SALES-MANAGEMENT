import re

with open('src/pages/purchases.tsx', 'r') as f:
    content = f.read()

target = r'''  const openEditPurchase = (purchase: Purchase & { id: string }) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setEditingPurchase(purchase);'''

replacement = r'''  const openEditPurchase = (purchase: Purchase & { id: string }) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setEditingPurchase(purchase);
    setIsFormOpen(true);'''

content = content.replace(target, replacement)

with open('src/pages/purchases.tsx', 'w') as f:
    f.write(content)
