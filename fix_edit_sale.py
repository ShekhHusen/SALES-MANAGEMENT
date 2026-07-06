import re

with open('src/pages/sales.tsx', 'r') as f:
    c = f.read()

c = re.sub(
r'''      const batch = writeBatch\(db\);
      const saleRef = doc\(db, 'sales', editingSale\.id\);
      
      const updateData: any = \{
        date: Timestamp\.fromDate\(new Date\(editSaleDate\)\),
        fileNumber: editFileNumber,
        companyId: editingSale\.companyId
      \};

      if \(editChassisNumber !== editingSale\.chassisNumber\) \{
        updateData\.chassisNumber = editChassisNumber;
        
        // Find the new vehicle
        const newVehicle = allVehicles\.find\(v => v\.chassisNumber === editChassisNumber\);
        if \(newVehicle\) \{
          updateData\.companyId = newVehicle\.companyId;

          // Make the old vehicle available again
          if \(editingSale\.chassisNumber\) \{
            const oldVehicleRef = doc\(db, 'vehicles', editingSale\.chassisNumber\);
            batch\.update\(oldVehicleRef, \{
              status: 'available',
              saleId: deleteField\(\),
              currentOwnerId: deleteField\(\),
              updatedAt: Timestamp\.now\(\),
            \}\);
          \}

          // Mark the new vehicle as sold
          const newVehicleRef = doc\(db, 'vehicles', editChassisNumber\);
          batch\.update\(newVehicleRef, \{
            status: 'sold',
            saleId: editingSale\.id,
            currentOwnerId: editingSale\.customerId,
            updatedAt: Timestamp\.now\(\),
          \}\);
        \}
      \}

      batch\.update\(saleRef, updateData\);
      await batch\.commit\(\);''',
'''      const saleRef = doc(db, 'sales', editingSale.id);
      
      const updateData: any = {
        date: Timestamp.fromDate(new Date(editSaleDate)),
        fileNumber: editFileNumber,
        companyId: editingSale.companyId
      };

      if (editChassisNumber !== editingSale.chassisNumber) {
        updateData.chassisNumber = editChassisNumber;
        
        const newVehicle = allVehicles.find(v => v.chassisNumber === editChassisNumber);
        if (newVehicle) {
          updateData.companyId = newVehicle.companyId;

          await runTransaction(db, async (tx) => {
            const newVehicleRef = doc(db, 'vehicles', editChassisNumber);
            const newVehicleSnap = await tx.get(newVehicleRef);
            
            if (newVehicleSnap.exists() && newVehicleSnap.data().status === 'sold') {
               throw new Error('Ye new vehicle already sold ho chuki hai — please refresh inventory.');
            }

            // Make the old vehicle available again
            if (editingSale.chassisNumber) {
              const oldVehicleRef = doc(db, 'vehicles', editingSale.chassisNumber);
              tx.update(oldVehicleRef, {
                status: 'in-stock', // changed from 'available' to 'in-stock'
                saleId: deleteField(),
                currentOwnerId: deleteField(),
                updatedAt: Timestamp.now(),
              });
            }

            // Mark the new vehicle as sold
            tx.update(newVehicleRef, {
              status: 'sold',
              saleId: editingSale.id,
              currentOwnerId: editingSale.customerId,
              updatedAt: Timestamp.now(),
            });

            tx.update(saleRef, updateData);
          });
        } else {
           // just update sale if new vehicle not found locally (edge case)
           await updateDoc(saleRef, updateData);
        }
      } else {
         await updateDoc(saleRef, updateData);
      }''', c)

with open('src/pages/sales.tsx', 'w') as f:
    f.write(c)

