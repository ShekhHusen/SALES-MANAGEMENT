import re

with open('src/pages/purchases.tsx', 'r') as f:
    c = f.read()

bad_check2 = """           if (vehicleData.status === 'sold') {
             toast.error(`Chassis number ${chassis} is marked as sold and cannot be purchased.`);
             return;
           }"""

good_check2 = """           if (vehicleData.status === 'sold' && vehicleData.purchaseId !== (editingPurchase?.id || '')) {
             toast.error(`Chassis number ${chassis} is marked as sold and cannot be purchased.`);
             return;
           }"""

c = c.replace(bad_check2, good_check2)

with open('src/pages/purchases.tsx', 'w') as f:
    f.write(c)

