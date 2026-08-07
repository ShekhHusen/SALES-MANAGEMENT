import fs from 'fs';
let code = fs.readFileSync('src/pages/process-document.tsx', 'utf8');

const replacement = `    const handleComplete = async () => {
    if (!selectedSale?.id) return;
    setLoading(true);
    try {
      if (onEmi) {
        const loanAmount = Number(emiVehiclePrice) - Number(emiDownPayment);
        try {
          await addDoc(collection(db, 'emis'), {
            saleId: selectedSale.id,
            chassisNumber: selectedSale.chassisNumber,
            customerId: selectedSale.customerId,
            customerName: customers.find(c => c.id === selectedSale.customerId)?.name || '',
            customerContact: customers.find(c => c.id === selectedSale.customerId)?.contactNumber || '',
            fileNumber: selectedSale.fileNumber || '',
            saleDate: selectedSale.date || null,
            loanAmount: loanAmount || 0,
            interestRate: Number(emiInterest) || 0,
            periodMonths: Number(emiPeriod) || 0,
            emiVehiclePrice: Number(emiVehiclePrice) || 0,
            emiDownPayment: Number(emiDownPayment) || 0,
            createdAt: serverTimestamp(),
          });
        } catch (e: any) {
          console.error("Error creating EMI:", e);
          handleFirestoreError(e, OperationType.CREATE, \`emis\`);
          throw e; // stop execution
        }
      }

// Complete document process without saving otherDetails/documents to DB
      try {
        await updateDoc(doc(db, 'sales', selectedSale.id), {
          documentationCompleted: true,
          otherDetails: deleteField()
        });
      } catch(e: any) {
        console.error("Error updating sale:", e);
        handleFirestoreError(e, OperationType.UPDATE, \`sales/\${selectedSale.id}\`);
        throw e;
      }
      
      toast.success('Documentation completed successfully!');
      setUnlockedTabs({ sold_vehicle: true, others_details: false, documents: false, completed: true });
      setActiveTab('completed');
      setSelectedSale(null);
      setVehiclePrice('');
      setPaidAmount('');
      setDuesAmount('');
      setFathersName('');
      setGrandFathersName('');
      setCustomerAltNumber('');
      setEngineNumber('');
      setVehicleNumber('');
      setCitizenshipNumber('');
      setOnEmi(false);
      setEmiVehiclePrice('');
      setEmiDownPayment('');
      setEmiPeriod('');
      setEmiInterest('');
      setBatteryType('');
      setBatteryBrand('');
      setBluetoothId('');
      setProductId('');
      setNotes('');
      setNoOfBattery('');
      setSerialNumbers([]);
      setImages({});
} catch (error: any) {
      console.error('Error updating document process', error);
      if (error?.code === 'not-found') {
        toast.error('This sale record has been deleted. Cannot save process.');
      } else {
        toast.error('Failed to save document process');
      }
    } finally {
      setLoading(false);
    }
  };`;

// replace from `const handleComplete` to `finally {` part
const rx = /    const handleComplete = async \(\) => \{[\s\S]*?handleFirestoreError\(error, OperationType\.UPDATE, `sales\/\$\{selectedSale\.id\}`\);\n    \} finally \{\n      setLoading\(false\);\n    \}\n  \};/;
code = code.replace(rx, replacement);
fs.writeFileSync('src/pages/process-document.tsx', code);
