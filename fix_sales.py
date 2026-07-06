import re

with open('src/pages/sales.tsx', 'r') as f:
    c = f.read()

# Make sure runTransaction is imported
if 'runTransaction' not in c:
    c = c.replace("import { collection, query, orderBy", "import { collection, query, orderBy, runTransaction")

# Replace handleSaveSale
c = re.sub(
r'''      const batch = writeBatch\(db\);
      
      // 1\. Create Sale record
      const saleRef = doc\(collection\(db, 'sales'\)\);
      batch\.set\(saleRef, \{
        date: Timestamp\.fromDate\(new Date\(saleDate\)\),
        customerId: selectedCustomer,
        chassisNumber: selectedChassis,
        fileNumber: nextFileNumber,
        companyId: currentVehicle\.companyId,
        createdAt: Timestamp\.now\(\),
      \}\);

      // 2\. Update Vehicle
      const vehicleRef = doc\(db, 'vehicles', selectedChassis\);
      batch\.update\(vehicleRef, \{
        status: 'sold',
        saleId: saleRef\.id,
        currentOwnerId: selectedCustomer,
        color: editColor, // Allow editing color at sales
        updatedAt: Timestamp\.now\(\),
      \}\);

      await batch\.commit\(\);''',
'''      const saleRef = doc(collection(db, 'sales'));
      const vehicleRef = doc(db, 'vehicles', selectedChassis);

      await runTransaction(db, async (tx) => {
        const vehicleSnap = await tx.get(vehicleRef);
        
        if (!vehicleSnap.exists()) {
          throw new Error('Vehicle not found in database.');
        }

        if (vehicleSnap.data().status === 'sold') {
          throw new Error('Ye vehicle already sold ho chuki hai — please refresh inventory.');
        }

        tx.set(saleRef, {
          date: Timestamp.fromDate(new Date(saleDate)),
          customerId: selectedCustomer,
          chassisNumber: selectedChassis,
          fileNumber: nextFileNumber,
          companyId: currentVehicle.companyId,
          createdAt: Timestamp.now(),
        });

        tx.update(vehicleRef, {
          status: 'sold',
          saleId: saleRef.id,
          currentOwnerId: selectedCustomer,
          color: editColor,
          updatedAt: Timestamp.now(),
        });
      });''', c)

with open('src/pages/sales.tsx', 'w') as f:
    f.write(c)

