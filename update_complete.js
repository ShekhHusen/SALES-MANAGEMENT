const fs = require('fs');

const path = 'src/pages/process-document.tsx';
let content = fs.readFileSync(path, 'utf8');

const completeFunc = `  const handleComplete = async () => {
    if (!selectedSale?.id) return;
    setLoading(true);
    try {
      if (onEmi) {
        const loanAmount = Number(emiVehiclePrice) - Number(emiDownPayment);
        await addDoc(collection(db, 'emis'), {
          saleId: selectedSale.id,
          chassisNumber: selectedSale.chassisNumber,
          customerId: selectedSale.customerId,
          customerName: customers.find(c => c.id === selectedSale.customerId)?.name || '',
          customerContact: customers.find(c => c.id === selectedSale.customerId)?.contactNumber || '',
          loanAmount: loanAmount || 0,
          interestRate: Number(emiInterest) || 0,
          periodMonths: Number(emiPeriod) || 0,
          emiVehiclePrice: Number(emiVehiclePrice) || 0,
          emiDownPayment: Number(emiDownPayment) || 0,
          createdAt: serverTimestamp(),
        });
      }

      // Complete document process without saving otherDetails/documents to DB
      await updateDoc(doc(db, 'sales', selectedSale.id), {
        documentationCompleted: true,
        otherDetails: deleteField()
      });`;

content = content.replace(/const handleComplete = async \(\) => {\s*if \(!selectedSale\?\.id\) return;\s*setLoading\(true\);\s*try {\s*\/\/ Complete document process without saving otherDetails\/documents to DB\s*await updateDoc\(doc\(db, 'sales', selectedSale.id\), {\s*documentationCompleted: true,\s*otherDetails: deleteField\(\)\s*}\);/m, completeFunc);

fs.writeFileSync(path, content);
