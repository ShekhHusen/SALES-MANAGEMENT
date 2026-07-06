import re

with open('src/pages/purchases.tsx', 'r') as f:
    c = f.read()

c = c.replace('<h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Invoice Reference</h3>', '<h3 className="text-sm font-black uppercase tracking-widest text-slate-500">{editingPurchase ? "Edit Invoice Reference" : "Invoice Reference"}</h3>')
c = c.replace('<h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Chassis Manifest</h3>', '<h3 className="text-sm font-black uppercase tracking-widest text-slate-500">{editingPurchase ? "Edit Chassis Manifest" : "Chassis Manifest"}</h3>')

with open('src/pages/purchases.tsx', 'w') as f:
    f.write(c)

