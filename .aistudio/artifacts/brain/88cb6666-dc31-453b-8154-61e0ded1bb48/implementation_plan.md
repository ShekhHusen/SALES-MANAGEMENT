# Total Purchases Chassis Count & Export Customer Details Fix

Display the total purchased chassis count (sum of all chassis numbers across purchase bills) on the Dashboard "Total Purchases" card instead of the purchase document count (99), and fix the customer details fetching in "Export Complete System Data" by linking sales and customer info via `chassisNumber`.

> [!IMPORTANT]
> **User Review & Approval Required Before Modifying Files**
> As per your instruction ("do not change or edit any old file, before editing any old file ask with me"), we will wait for your explicit confirmation of this plan before applying edits to `src/pages/dashboard.tsx` and `src/components/ExportData.tsx`.

- **Total Purchases Calculation**: Total sum of all chassis numbers in all purchase bills (`sum of purchase.chassisNumbers.length`).
- **Export Customer Details**: Match sales by `s.chassisNumber === v.chassisNumber` (where `status !== 'returned'`) and resolve customer details (Name, Address, Contact, File No.) from `parties`.

---

## 1. Problem Diagnosis

1. **Dashboard "Total Purchases" displaying 99**:
   - Currently, `src/pages/dashboard.tsx` counts purchase documents:
     `const purchasesSnap = await getCountFromServer(purchasesRef);`
     `totalProcurement: purchasesSnap.data().count` (which equals 99 bills).
   - Each purchase document contains an array `chassisNumbers: string[]`.
   - The user requested showing the total number of purchased chassis across all purchase bills instead of the bill count.

2. **Customer Details Missing in "Export Complete System Data"**:
   - In `src/components/ExportData.tsx`:
     ```ts
     const sale = sales.find(s => s.id === v.saleId);
     const customer = sale ? parties.find(p => p.id === sale.customerId) : null;
     ```
   - In Firestore, vehicles do not reliably store a `saleId` property, but sales records store `chassisNumber`.
   - Because `v.saleId` was undefined, `sale` was null, causing Customer Name, Address, Contact Number, and File No. to export as blank even though the vehicle's status was `sold`.

---

## 2. Proposed Changes

### File 1: `src/pages/dashboard.tsx`
- Replace `getCountFromServer(purchasesRef)` with fetching the purchase documents:
  ```ts
  const purchasesSnap = await getDocs(purchasesRef);
  let totalPurchasedChassis = 0;
  purchasesSnap.docs.forEach(doc => {
    const data = doc.data();
    if (Array.isArray(data.chassisNumbers)) {
      totalPurchasedChassis += data.chassisNumbers.length;
    }
  });
  ```
- Set `stats.totalProcurement = totalPurchasedChassis`.
- The "Total Purchases" card will now display the exact sum of purchased chassis.

### File 2: `src/components/ExportData.tsx`
- In `allDataRows`:
  ```ts
  // Match sale by chassis number
  const sale = sales.find(s => (s.chassisNumber === v.chassisNumber || (v.saleId && s.id === v.saleId)) && s.status !== 'returned');
  const customer = sale ? parties.find(p => p.id === sale.customerId) : null;
  const purchase = purchases.find(p => (v.purchaseId && p.id === v.purchaseId) || (p.chassisNumbers && p.chassisNumbers.includes(v.chassisNumber)));
  const vendor = purchase ? parties.find(p => p.id === purchase.vendorId) : null;
  ```
- In `inventoryData`:
  ```ts
  const sale = sales.find(s => (s.chassisNumber === v.chassisNumber || (v.saleId && s.id === v.saleId)) && s.status !== 'returned');
  const customer = sale ? parties.find(p => p.id === sale.customerId) : null;
  ```
  Ensure `Sale ID`, `Status` (`sale ? 'sold' : (v.status || 'in-stock')`), and `Current Owner` (`customer?.name || parties.find(p => p.id === v.currentOwnerId)?.name || ''`) are accurately populated.

---

## 3. Verification Plan

1. **Compilation & Type Check**:
   - Run `compile_applet` and `lint_applet` to ensure zero compilation or TypeScript errors.
2. **Dashboard Verification**:
   - Verify that "Total Purchases" reflects the true aggregate count of all purchased chassis rather than 99.
3. **Export Center Verification**:
   - Verify that clicking "Export Complete System Data" outputs an Excel workbook where sold chassis contain their customer's Name, Address, Contact Number, and File Number.
