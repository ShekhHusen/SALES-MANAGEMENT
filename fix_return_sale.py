import re

with open('src/pages/sales.tsx', 'r') as f:
    c = f.read()

c = re.sub(
r'''      const batch = writeBatch\(db\);
      const saleRef = doc\(db, 'sales', returnSale\.id\);
      batch\.update\(saleRef, \{
        status: 'returned',
        returnedAt: Timestamp\.now\(\),
        returnReason: returnReason\.trim\(\)
      \}\);
      
      const vehicleRef = doc\(db, 'vehicles', returnSale\.chassisNumber\);
      batch\.update\(vehicleRef, \{
        status: 'in-stock',
        saleId: null,
        currentOwnerId: null,
        updatedAt: Timestamp\.now\(\),
      \}\);
      
      await batch\.commit\(\);''',
'''      const saleRef = doc(db, 'sales', returnSale.id);
      const vehicleRef = doc(db, 'vehicles', returnSale.chassisNumber);

      await runTransaction(db, async (tx) => {
        // Technically not a race condition to return, but let's keep it atomic
        tx.update(saleRef, {
          status: 'returned',
          returnedAt: Timestamp.now(),
          returnReason: returnReason.trim()
        });
        
        tx.update(vehicleRef, {
          status: 'in-stock',
          saleId: null,
          currentOwnerId: null,
          updatedAt: Timestamp.now(),
        });
      });''', c)

with open('src/pages/sales.tsx', 'w') as f:
    f.write(c)

