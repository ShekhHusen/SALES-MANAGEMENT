# Dashboard Stats Card Excel Export: Purchase Price Column Integration

Enriches the Excel export generated from the Dashboard's **Namsari Pending** and **Names of JBMT** stats cards by adding a **Purchase Price** column positioned immediately to the right of the Vendor and Invoice No. columns, retrieving each vehicle's recorded procurement price as a real numeric value for spreadsheet calculations.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following confirmed choices govern this feature:

- **Confirmed Decision 1**: **Numeric Value Format** — The purchase price will be output as a native numeric value (rather than a static text string) so spreadsheet formulas (such as `SUM`, `AVERAGE`, and pivot tables) work seamlessly in Microsoft Excel and Google Sheets.
- **Confirmed Decision 2**: **Unset Price Handling** — If a vehicle has no purchase price recorded, the cell will remain empty (blank/empty string `''`) rather than displaying `0.00`, preventing skewing of spreadsheet averages and keeping reports clean.
- **Confirmed Decision 3**: **Column Placement** — The **Purchase Price** column will be placed directly after **Vendor** and **Invoice No.**, before **Chassis Number** (`Vendor` ➔ `Invoice No.` ➔ `Purchase Price` ➔ `Chassis Number` ...).
- **Confirmed Decision 4**: **Safe File Modification Guard** — As explicitly instructed, `src/pages/dashboard.tsx` will only be modified after this implementation plan is approved.

---

### 1. Overview & Core Concept

Currently, when users click the Excel export icon on the **Namsari Pending** or **Names of JBMT** cards on the Dashboard, `handleExportGroup` fetches sold vehicles with their linked parties, purchases, and Tally accounts. The exported spreadsheet contains columns starting with:
1. `Vendor`
2. `Invoice No.`
3. `Chassis Number`
...

This update retrieves the newly implemented `purchasePrice` from the `Vehicle` record (with fallback to `purchase.chassisPrices[chassisNumber]`) and inserts the **Purchase Price** column directly after `Invoice No.`, providing immediate procurement cost visibility on sold units under documentation.

---

### 2. User Experience & Visual Design

#### A. Export Workflow

```
[ Dashboard Page ]
       │
       ▼
[ Stats Card: "Namsari Pending" or "Names of JBMT" ]
       │
       ▼ Click Excel Export Button (hover state)
       │
[ handleExportGroup(naamsariStatus, title) ]
  ├── Fetches vehicles, purchases, parties, sales & Tally balances
  ├── Finds linked purchase and retrieves vehicle.purchasePrice / purchase.chassisPrices[chassisNumber]
  └── Generates formatted .xlsx file
       │
       ▼ Download: Namsari_Pending_<timestamp>.xlsx / Names_of_JBMT_<timestamp>.xlsx
```

#### B. Spreadsheet Column Layout

| Col A | Col B | Col C (NEW) | Col D | Col E | Col F | Col G ... |
|---|---|---|---|---|---|---|
| **Vendor** | **Invoice No.** | **Purchase Price** | **Chassis Number** | **Company** | **Model** | **Color** ... |
| Vendor ABC | INV-2024-01 | `250000` | CH-9901 | Company X | Model Y | White ... |
| Vendor XYZ | INV-2024-02 | *(empty)* | CH-9902 | Company X | Model Z | Black ... |

- **Column width**: `18` characters.
- **Cell format**: Numeric value with Excel number formatting (`#,##,##0.00`) so Excel treats it as currency numbers.
- **Header style**: Bold font with standard soft gray background fill matching other headers.

---

### 3. Key Product Decisions & Trade-Offs

| Decision | Chosen Approach | Rationale | Alternatives Considered |
|---|---|---|---|
| **Data Resolution Priority** | Check `v.purchasePrice` first, then fallback to `purchase.chassisPrices?.[v.chassisNumber]` | Prioritizes vehicle doc field while guaranteeing backward compatibility with invoice snapshots. | Checking only vehicle or only purchase (risks missing data if one hasn't updated). |
| **Excel Cell Data Type** | Native `Number` with Excel `numFmt` | Enables instant arithmetic operations (`SUM`, `AVERAGE`) directly in Excel. | Plain string `"Rs. 2,50,000"` (disables math functions). |
| **Blank vs Zero** | Blank `''` when no price exists | Accurate reporting; prevents false 0-rupee costs in business auditing. | Outputting `0.00` (can distort financial reports). |

---

### 4. Technical Architecture & Implementation Steps

#### Code Changes in `src/pages/dashboard.tsx`

1. **Update `ws.columns` in `handleExportGroup`**:
   ```typescript
   ws.columns = [
     { header: 'Vendor', key: 'Vendor', width: 20 },
     { header: 'Invoice No.', key: 'Invoice No.', width: 15 },
     { header: 'Purchase Price', key: 'Purchase Price', width: 18, style: { numFmt: '#,##,##0.00' } },
     { header: 'Chassis Number', key: 'Chassis Number', width: 20 },
     ...
   ];
   ```

2. **Update row data mapping in `handleExportGroup`**:
   ```typescript
   const rawPrice = v.purchasePrice ?? purchase?.chassisPrices?.[v.chassisNumber];
   const purchasePriceNum = (rawPrice !== undefined && rawPrice !== null && rawPrice !== '' && !isNaN(Number(rawPrice)))
     ? Number(rawPrice)
     : '';

   return {
     'Vendor': vendor?.name || '',
     'Invoice No.': purchase?.invoiceNumber || '',
     'Purchase Price': purchasePriceNum,
     'Chassis Number': v.chassisNumber,
     ...
   };
   ```

3. **Verification**:
   - Run `lint_applet` and `compile_applet` to ensure type-safety and smooth build.
