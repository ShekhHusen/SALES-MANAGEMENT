const ExcelJS = require('exceljs');
const workbook = new ExcelJS.Workbook();
const sheet = workbook.addWorksheet('All Data');
sheet.addRow(['Name', 'Age']);
sheet.addRow(['Alice', 20]);
sheet.addRow(['Bob', 25]);
console.log(typeof workbook.addPivotTable, typeof workbook.worksheets[0].addPivotTable)
