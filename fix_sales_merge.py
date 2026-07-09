import re

with open('src/pages/sales.tsx', 'r') as f:
    c = f.read()

# Make sure useGlobalData has addLocal, updateLocal, removeLocal
if "updateLocal" not in c:
    c = c.replace("""const { sales, vehicles: allVehicles, parties: allParties, refreshSales } = useGlobalData();""", """const { sales, vehicles: allVehicles, parties: allParties, refreshSales, addLocal, updateLocal, removeLocal } = useGlobalData();""")

# For Edit Sale
c = c.replace("""      await refreshSales();
      toast.success('Sale record updated successfully');""", """      updateLocal('sales', editingSale.id, updatePayload);
      if (updatePayload.chassisNumber !== editingSale.chassisNumber) {
         updateLocal('vehicles', editingSale.chassisNumber, { status: 'in-stock' });
         updateLocal('vehicles', updatePayload.chassisNumber, { status: 'sold' });
      }
      toast.success('Sale record updated successfully');""")

# For Return Sale
c = c.replace("""      await refreshSales();
      toast.success(`Sale for ${returnSale.chassisNumber} marked as returned.`);""", """      updateLocal('sales', returnSale.id, { status: 'returned', returnDate: Timestamp.now(), returnReason, updatedAt: Timestamp.now() });
      updateLocal('vehicles', returnSale.chassisNumber, { status: 'in-stock' });
      toast.success(`Sale for ${returnSale.chassisNumber} marked as returned.`);""")

# For Delete Sale
c = c.replace("""      await refreshSales();
      toast.success('Sale record successfully removed.');""", """      removeLocal('sales', saleToDelete.id);
      if (saleToDelete.status !== 'returned') {
         updateLocal('vehicles', saleToDelete.chassisNumber, { status: 'in-stock' });
      }
      toast.success('Sale record successfully removed.');""")

# For Create Sale
c = c.replace("""      await refreshSales();
      toast.success(`Sale recorded. File Number: ${nextFileNumber}`);""", """      addLocal('sales', {
          id: saleRef.id,
          chassisNumber: selectedChassis,
          customerId: selectedCustomer,
          fileNumber: nextFileNumber,
          date: Timestamp.fromDate(new Date(saleDate)),
          totalAmount: Number(totalAmount) || 0,
          status: 'active',
          createdAt: Timestamp.now(),
      });
      updateLocal('vehicles', selectedChassis, { status: 'sold' });
      toast.success(`Sale recorded. File Number: ${nextFileNumber}`);""")

with open('src/pages/sales.tsx', 'w') as f:
    f.write(c)

