import fs from 'fs';
let code = fs.readFileSync('src/pages/process-document.tsx', 'utf8');

const replacement = `        await addDoc(collection(db, 'emis'), {
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
        });`;

code = code.replace(/await addDoc\(collection\(db, 'emis'\), \{[\s\S]*?createdAt: serverTimestamp\(\),\n        \}\);/, replacement);
fs.writeFileSync('src/pages/process-document.tsx', code);
