import re

with open('src/pages/purchases.tsx', 'r') as f:
    c = f.read()

# Add to useGlobalData
if "updateLocal" not in c:
    c = c.replace("""const { purchases, vehicles: allVehicles, parties: allParties, refreshPurchases } = useGlobalData();""", """const { purchases, vehicles: allVehicles, parties: allParties, addLocal, updateLocal, removeLocal } = useGlobalData();""")

# Replace Delete Purchase
c = c.replace("""      await refreshPurchases();
      toast.success('Purchase manifest and linked inventory records purged.');""", """      removeLocal('purchases', purchaseToDelete.id);
      purchaseToDelete.chassisNumbers?.forEach(chassis => {
          removeLocal('vehicles', chassis);
      });
      toast.success('Purchase manifest and linked inventory records purged.');""")

# Replace Create/Update Purchase
c = c.replace("""      await refreshPurchases();
      toast.success(editingPurchase ? 'Purchase updated successfully' : 'Purchase recorded and inventory updated');""", """      if (editingPurchase) {
         updateLocal('purchases', editingPurchase.id, {
            date: Timestamp.fromDate(new Date(purchaseDate)),
            invoiceNumber,
            vendorId: selectedVendor,
            chassisNumbers,
            updatedAt: Timestamp.now(),
         });
      } else {
         addLocal('purchases', {
            id: purchaseRef.id,
            date: Timestamp.fromDate(new Date(purchaseDate)),
            invoiceNumber,
            vendorId: selectedVendor,
            chassisNumbers,
            createdAt: Timestamp.now(),
         });
      }

      removedChassis.forEach(rc => {
         updateLocal('vehicles', rc, { purchaseId: null, currentOwnerId: null, status: 'ready-to-purchase' });
      });

      sanitizedEntries.forEach(entry => {
         const existingVehicle = allVehicles.find(v => v.chassisNumber === entry.chassisNumber);
         const isNewToPurchase = newChassis.includes(entry.chassisNumber);
         if (!existingVehicle) {
             addLocal('vehicles', {
                 ...entry,
                 id: entry.chassisNumber,
                 status: 'in-stock',
                 purchaseId: purchaseRef.id,
                 currentOwnerId: selectedVendor,
                 bluebookStatus: 'Not Received',
                 naamsariStatus: 'Pending',
                 createdAt: Timestamp.now(),
             });
         } else {
             updateLocal('vehicles', entry.chassisNumber, {
                 ...entry,
                 status: existingVehicle.status === 'sold' ? 'sold' : 'in-stock',
                 purchaseId: purchaseRef.id,
                 currentOwnerId: selectedVendor,
             });
         }
      });
      toast.success(editingPurchase ? 'Purchase updated successfully' : 'Purchase recorded and inventory updated');""")

with open('src/pages/purchases.tsx', 'w') as f:
    f.write(c)

