import re

with open('src/pages/purchases.tsx', 'r') as f:
    c = f.read()

bad_check = """        if (vehicleDoc.exists()) {
           const vehicleData = vehicleDoc.data();
           if (vehicleData.purchaseId) {
             toast.error(`Chassis number ${chassis} is already linked to a purchase.`);
             return;
           }"""

good_check = """        if (vehicleDoc.exists()) {
           const vehicleData = vehicleDoc.data();
           if (vehicleData.purchaseId && vehicleData.purchaseId !== (editingPurchase?.id || '')) {
             toast.error(`Chassis number ${chassis} is already linked to a purchase.`);
             return;
           }"""

c = c.replace(bad_check, good_check)

with open('src/pages/purchases.tsx', 'w') as f:
    f.write(c)

