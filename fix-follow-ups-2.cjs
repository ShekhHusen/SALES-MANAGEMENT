const fs = require('fs');
let code = fs.readFileSync('src/pages/follow-ups.tsx', 'utf-8');

// 1. Add parties to useGlobalData
code = code.replace(
  "const { sales, loadSales, isSalesLoaded, vehicles, loadVehicles, isVehiclesLoaded } = useGlobalData();",
  "const { sales, loadSales, isSalesLoaded, vehicles, loadVehicles, isVehiclesLoaded, parties, loadParties, isPartiesLoaded } = useGlobalData();"
);

// 2. Add dependencies to useEffect
code = code.replace(
  "  useEffect(() => {\n    if (!isSalesLoaded) loadSales();\n    if (!isVehiclesLoaded) loadVehicles();\n  }, [isSalesLoaded, loadSales, isVehiclesLoaded, loadVehicles]);",
  "  useEffect(() => {\n    if (!isSalesLoaded) loadSales();\n    if (!isVehiclesLoaded) loadVehicles();\n    if (!isPartiesLoaded) loadParties();\n  }, [isSalesLoaded, loadSales, isVehiclesLoaded, loadVehicles, isPartiesLoaded, loadParties]);"
);

// 3. Fix the lookup logic in getProcessedList
const oldLookupRegex = /        if \(fu\.entityType === 'sales'\) \{\n          const sale = sales\.find\(s => s\.id === fu\.saleId\);\n          if \(sale\) \{\n            customerName = sale\.customerName;\n            address = sale\.customerAddress \|\| '--\-';\n            contact = sale\.customerContact \|\| '--\-';\n            fileNumber = sale\.fileNumber \|\| '--\-';\n            saleId = sale\.id;\n          \}\n        \} else if \(fu\.entityType === 'emi'\) \{\n          const emi = emis\.find\(e => e\.id === fu\.emiId\);\n          if \(emi\) \{\n            customerName = emi\.customerName;\n            address = emi\.customerAddress \|\| '--\-';\n            contact = emi\.customerContact \|\| '--\-';\n            fileNumber = emi\.fileNumber \|\| '--\-';\n            saleId = emi\.saleId;\n          \}\n        \}/g;

const newLookup = `        if (fu.entityType === 'sales') {
          const sale = sales.find(s => s.id === fu.saleId);
          if (sale) {
            const customer = parties.find(p => p.id === sale.customerId);
            if (customer) {
              customerName = customer.name || 'Unknown';
              address = customer.address || '---';
              contact = customer.contactNumber || '---';
            }
            fileNumber = sale.fileNumber || '---';
            saleId = sale.id;
          }
        } else if (fu.entityType === 'emi') {
          const emi = emis.find(e => e.id === fu.emiId);
          if (emi) {
            const customer = parties.find(p => p.id === emi.customerId);
            if (customer) {
              customerName = customer.name || 'Unknown';
              address = customer.address || '---';
              contact = customer.contactNumber || '---';
            }
            const sale = sales.find(s => s.id === emi.saleId);
            fileNumber = sale?.fileNumber || '---';
            saleId = emi.saleId;
          }
        }`;

code = code.replace(oldLookupRegex, newLookup);

fs.writeFileSync('src/pages/follow-ups.tsx', code);
