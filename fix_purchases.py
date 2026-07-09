import re

with open('src/pages/purchases.tsx', 'r') as f:
    c = f.read()

bad_remove = """      for (const rc of removedChassis) {
         batch.update(doc(db, 'vehicles', rc), {
             purchaseId: null,
             currentOwnerId: null,
             status: 'ready-to-purchase',
             updatedAt: Timestamp.now()
         });
         ops++;
         if (ops >= 400) { await batch.commit(); batch = writeBatch(db); ops = 0; }
      }"""

good_remove = """      for (const rc of removedChassis) {
         const vData = allVehicles.find(v => v.chassisNumber === rc);
         if (vData) {
             batch.update(doc(db, 'vehicles', rc), {
                 purchaseId: null,
                 currentOwnerId: null,
                 status: 'ready-to-purchase',
                 updatedAt: Timestamp.now()
             });
             ops++;
             if (ops >= 400) { await batch.commit(); batch = writeBatch(db); ops = 0; }
         }
      }"""

c = c.replace(bad_remove, good_remove)

with open('src/pages/purchases.tsx', 'w') as f:
    f.write(c)

