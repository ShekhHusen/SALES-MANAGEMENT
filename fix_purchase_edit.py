import re

with open('src/pages/purchases.tsx', 'r') as f:
    c = f.read()

# 1. Update openEditPurchase
c = re.sub(
r'''  const openEditPurchase = \(purchase: Purchase & \{ id: string \}\) => \{.*?  \};''',
'''  const openEditPurchase = (purchase: Purchase & { id: string }) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setEditingPurchase(purchase);
    
    setPurchaseDate(purchase.date instanceof Timestamp ? purchase.date.toDate().toISOString().split('T')[0] : String(purchase.date));
    setInvoiceNumber(purchase.invoiceNumber || '');
    setSelectedVendor(purchase.vendorId || '');

    const entries = (purchase.chassisNumbers || []).map(chassis => {
       const v = allVehicles.find(veh => veh.chassisNumber === chassis);
       if (v) {
         return v;
       }
       return { chassisNumber: chassis, status: 'in-stock' } as Partial<Vehicle>;
    });
    
    setCurrentChassisEntries(entries);
  };

  const cancelEdit = () => {
    setEditingPurchase(null);
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setInvoiceNumber('');
    setSelectedVendor('');
    setCurrentChassisEntries([]);
  };
''', c, flags=re.DOTALL)


# 2. Update handleSavePurchase
handle_save_start = c.find('  const handleSavePurchase = async () => {')
handle_save_end = c.find('  const exportPurchases = () => {')

if handle_save_start != -1 and handle_save_end != -1:
    new_handle_save = '''  const handleSavePurchase = async () => {
    if (!selectedVendor || !invoiceNumber || currentChassisEntries.length === 0) {
      toast.error('Please fill all required fields');
      return;
    }

    // Sanitize entries
    const sanitizedEntries = currentChassisEntries.map(e => ({
      ...e,
      chassisNumber: (e.chassisNumber || '').trim().toUpperCase()
    }));

    // Check for duplicates in current form
    const chassisNumbers = sanitizedEntries.map(e => e.chassisNumber);
    if (chassisNumbers.some(c => !c)) {
      toast.error('Chassis numbers cannot be empty');
      return;
    }

    if (new Set(chassisNumbers).size !== chassisNumbers.length) {
      toast.error('Duplicate chassis numbers in this purchase entries');
      return;
    }

    try {
      if (editingPurchase) {
          if (purchases.some(p => p.vendorId === selectedVendor && p.invoiceNumber === invoiceNumber && p.id !== editingPurchase.id)) {
              toast.error('An invoice with this number already exists for this vendor');
              return;
          }
      } else {
          if (purchases.some(p => p.vendorId === selectedVendor && p.invoiceNumber === invoiceNumber)) {
              toast.error('An invoice with this number already exists for this vendor');
              return;
          }
      }

      let removedChassis: string[] = [];
      if (editingPurchase) {
          removedChassis = (editingPurchase.chassisNumbers || []).filter(c => !chassisNumbers.includes(c));
          
          for (const rc of removedChassis) {
             const vData = allVehicles.find(v => v.chassisNumber === rc);
             if (vData && vData.status === 'sold') {
                 toast.error(`Cannot remove chassis ${rc} from this purchase because it is already sold.`);
                 return;
             }
          }
      }

      const newChassis = editingPurchase ? chassisNumbers.filter(c => !(editingPurchase.chassisNumbers || []).includes(c)) : chassisNumbers;
      
      for (const chassis of newChassis) {
        if (!chassis) continue;
        const vehicleDoc = await getDoc(doc(db, 'vehicles', chassis));
        
        if (vehicleDoc.exists()) {
           const vehicleData = vehicleDoc.data();
           if (vehicleData.purchaseId) {
             toast.error(`Chassis number ${chassis} is already linked to a purchase.`);
             return;
           }
           if (vehicleData.status === 'sold') {
             toast.error(`Chassis number ${chassis} is marked as sold and cannot be purchased.`);
             return;
           }
        }
      }

      let batch = writeBatch(db);
      let ops = 0;
      
      const purchaseRef = editingPurchase ? doc(db, 'purchases', editingPurchase.id) : doc(collection(db, 'purchases'));
      
      if (editingPurchase) {
         batch.update(purchaseRef, {
            date: Timestamp.fromDate(new Date(purchaseDate)),
            invoiceNumber,
            vendorId: selectedVendor,
            chassisNumbers,
            updatedAt: Timestamp.now(),
         });
      } else {
         batch.set(purchaseRef, {
            date: Timestamp.fromDate(new Date(purchaseDate)),
            invoiceNumber,
            vendorId: selectedVendor,
            chassisNumbers,
            createdAt: Timestamp.now(),
         });
      }
      ops++;

      for (const rc of removedChassis) {
         batch.update(doc(db, 'vehicles', rc), {
             purchaseId: null,
             currentOwnerId: null,
             status: 'ready-to-purchase',
             updatedAt: Timestamp.now()
         });
         ops++;
         if (ops >= 400) { await batch.commit(); batch = writeBatch(db); ops = 0; }
      }

      for (const entry of sanitizedEntries) {
        if (!entry.chassisNumber) continue;
        const vehicleRef = doc(db, 'vehicles', entry.chassisNumber);
        
        const isNewToPurchase = newChassis.includes(entry.chassisNumber);
        const existingVehicle = allVehicles.find(v => v.chassisNumber === entry.chassisNumber);

        batch.set(vehicleRef, {
          ...entry,
          status: existingVehicle && existingVehicle.status === 'sold' ? 'sold' : 'in-stock',
          purchaseId: purchaseRef.id,
          currentOwnerId: selectedVendor,
          updatedAt: Timestamp.now(),
          ...(isNewToPurchase && !existingVehicle ? { bluebookStatus: 'Not Received', naamsariStatus: 'Pending' } : {})
        }, { merge: true });
        ops++;
        
        if (ops >= 400) {
            await batch.commit();
            batch = writeBatch(db);
            ops = 0;
        }
      }
      
      if (ops > 0) {
          await batch.commit();
      }
      
      if (user) {
        logAction(user.uid, user.email || '', editingPurchase ? 'UPDATE' : 'CREATE', 'Purchase', purchaseRef.id, {
          invoiceNumber,
          vendorId: selectedVendor,
          chassisNumbers,
        });
      }

      await refreshPurchases();
      toast.success(editingPurchase ? 'Purchase updated successfully' : 'Purchase recorded and inventory updated');
      
      // Reset
      cancelEdit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'purchases/vehicles');
    }
  };

'''
    c = c[:handle_save_start] + new_handle_save + c[handle_save_end:]

# 3. Remove the handleUpdatePurchase block entirely
update_regex = re.compile(r'  const handleUpdatePurchase = async \(\) => \{.*?\n  };\n', re.DOTALL)
c = update_regex.sub('', c)

# 4. Remove the Edit Purchase Dialog
dialog_regex = re.compile(r'      \{\/\* Edit Purchase Dialog \*\/}.*?</Dialog>', re.DOTALL)
c = dialog_regex.sub('', c)

with open('src/pages/purchases.tsx', 'w') as f:
    f.write(c)

