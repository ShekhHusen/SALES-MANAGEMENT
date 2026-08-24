const ExcelJS = require('@protobi/exceljs');
const workbook = new ExcelJS.Workbook();
const sheet = workbook.addWorksheet('All Data');
sheet.addRow(['Vendor', 'Amount']);
sheet.addRow(['Vendor A', 100]);
sheet.addRow(['Vendor B', 200]);
console.log(typeof workbook.addPivotTable);
console.log(typeof sheet.addPivotTable);
