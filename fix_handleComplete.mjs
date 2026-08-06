import fs from 'fs';
let code = fs.readFileSync('src/pages/process-document.tsx', 'utf8');

const replacement = `
      await updateDoc(doc(db, 'sales', selectedSale.id), {
        documentationCompleted: true,
        otherDetails: {
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
          batteryType,
          batteryBrand,
          bluetoothId,
          productId,
          notes,
          noOfBattery,
          serialNumbers,
          images
        }
      });
`;

code = code.replace(/\/\/ Complete document process without saving otherDetails\/documents to DB[\s\S]*?otherDetails: deleteField\(\)\s*\}\);/, replacement.trim());
fs.writeFileSync('src/pages/process-document.tsx', code);
