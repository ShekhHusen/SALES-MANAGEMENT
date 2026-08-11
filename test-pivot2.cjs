const ExcelJS = require('@protobi/exceljs');
const workbook = new ExcelJS.Workbook();
const sourceSheet = workbook.addWorksheet('Data');
sourceSheet.addRow(['Vendor', 'Category', 'Amount', 'CountId']);
sourceSheet.addRow(['Vendor A', 'Food', 100, 'id1']);
sourceSheet.addRow(['Vendor A', 'Drinks', 50, 'id2']);
sourceSheet.addRow(['Vendor B', 'Food', 200, 'id3']);

const pivotSheet = workbook.addWorksheet('Pivot');
pivotSheet.addPivotTable({
  sourceSheet: sourceSheet,
  rows: ['Vendor'],
  columns: ['Category'],
  values: ['Amount'],
  metric: 'sum'
});

workbook.xlsx.writeFile('test-pivot.xlsx').then(() => console.log('Done')).catch(console.error);
