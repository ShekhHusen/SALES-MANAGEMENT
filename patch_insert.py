import re

with open('src/pages/process-document.tsx', 'r') as f:
    content = f.read()

select_funcs = """  const handleSelectSale = async (sale: Sale) => {
    setSelectedSale(sale);
    try {
      const docRef = doc(db, 'sale_other_details', sale.id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setVehiclePrice(data.vehiclePrice ?? '');
        setPaidAmount(data.paidAmount ?? '');
        setDuesAmount(data.duesAmount ?? '');
        setFathersName(data.fathersName ?? '');
        setGrandFathersName(data.grandFathersName ?? '');
        setCustomerAltNumber(data.customerAltNumber ?? '');
        setEngineNumber(data.engineNumber ?? '');
        setVehicleNumber(data.vehicleNumber ?? '');
        setCitizenshipNumber(data.citizenshipNumber ?? '');
        setOnEmi(data.onEmi ?? false);
        setEmiVehiclePrice(data.emiVehiclePrice ?? '');
        setEmiDownPayment(data.emiDownPayment ?? '');
        setEmiPeriod(data.emiPeriod ?? '');
        setEmiInterest(data.emiInterest ?? '');
        setEmiStartDate(data.emiStartDate ?? '');
        setBatteryType(data.batteryType ?? '');
        setBatteryBrand(data.batteryBrand ?? '');
        setBluetoothId(data.bluetoothId ?? '');
        setProductId(data.productId ?? '');
        setNotes(data.notes ?? '');
        setNoOfBattery(data.noOfBattery ?? '');
        setSerialNumbers(data.serialNumbers ?? []);
      } else {
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
        setEmiStartDate('');
        setBatteryType('');
        setBatteryBrand('');
        setBluetoothId('');
        setProductId('');
        setNotes('');
        setNoOfBattery('');
        setSerialNumbers([]);
      }
    } catch (error) {
      console.error("Failed to load other details:", error);
    }
  };

  const handleViewSale = async (sale: Sale) => {
    try {
      const docRef = doc(db, 'sale_other_details', sale.id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setViewSale({ ...sale, otherDetails: docSnap.data() as any });
      } else {
        setViewSale(sale);
      }
    } catch (error) {
      console.error("Failed to fetch other details:", error);
      setViewSale(sale);
    }
    setViewSheetOpen(true);
  };
"""

content = content.replace("  const handleSaveDriveLink", select_funcs + "\n  const handleSaveDriveLink")

with open('src/pages/process-document.tsx', 'w') as f:
    f.write(content)

