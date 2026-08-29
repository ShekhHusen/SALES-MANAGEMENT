import re

with open('src/pages/process-document.tsx', 'r') as f:
    content = f.read()

# 1. Update imports
content = content.replace(
    "import { collection, query, onSnapshot, orderBy, doc, updateDoc, where, limit, getDocs, startAfter, addDoc } from '@/lib/trackedFirestore';",
    "import { collection, query, onSnapshot, orderBy, doc, updateDoc, where, limit, getDocs, startAfter, addDoc, setDoc, getDoc } from '@/lib/trackedFirestore';"
)

# 2. Add handleSelectSale and handleViewSale before handleProcess
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
content = content.replace("  const handleProcess = (sale: Sale) => {", select_funcs + "\n  const handleProcess = (sale: Sale) => {")

# 3. Replace setSelectedSale(sale) with handleSelectSale(sale) inside the render method where it's clicked
content = content.replace("onClick={() => setSelectedSale(sale)}", "onClick={() => handleSelectSale(sale)}")
# And in handleProcess ? handleProcess does setUnlockedTabs and setActiveTab. Wait, if handleProcess calls setSelectedSale, we should replace that too.
# Let's check handleProcess: it says setSelectedSale(sale). Let's change it.
content = content.replace("setSelectedSale(sale);\n    setUnlockedTabs", "handleSelectSale(sale);\n    setUnlockedTabs")
# Also in loadProcessDocumentData, if tSale is found: setSelectedSale(tSale);
content = content.replace("setSelectedSale(tSale);", "handleSelectSale(tSale);")

# 4. Replace setViewSale(sale); setViewSheetOpen(true); with handleViewSale(sale)
content = content.replace("setViewSale(sale);\n                                  setViewSheetOpen(true);", "handleViewSale(sale);")

# 5. Update handleConfirmCrossCheck to save the details
old_crosscheck = """  const handleConfirmCrossCheck = () => {
    setShowCrossCheckModal(false);
    setUnlockedTabs(prev => ({ ...prev, documents: true }));
    setActiveTab('documents');
  };"""

new_crosscheck = """  const handleConfirmCrossCheck = async () => {
    setShowCrossCheckModal(false);
    
    if (selectedSale) {
      setLoading(true);
      try {
        await setDoc(doc(db, 'sale_other_details', selectedSale.id), {
          saleId: selectedSale.id,
          vehiclePrice,
          paidAmount,
          duesAmount,
          fathersName,
          grandFathersName,
          customerAltNumber,
          engineNumber,
          vehicleNumber,
          citizenshipNumber,
          onEmi,
          emiVehiclePrice,
          emiDownPayment,
          emiPeriod,
          emiInterest,
          emiStartDate,
          batteryType,
          batteryBrand,
          bluetoothId,
          productId,
          notes,
          noOfBattery,
          serialNumbers,
          updatedAt: serverTimestamp()
        });
      } catch (error) {
        console.error("Failed to save other details:", error);
        toast.error("Failed to save details.");
      } finally {
        setLoading(false);
      }
    }
    
    setUnlockedTabs(prev => ({ ...prev, documents: true }));
    setActiveTab('documents');
  };"""

content = content.replace(old_crosscheck, new_crosscheck)

with open('src/pages/process-document.tsx', 'w') as f:
    f.write(content)

