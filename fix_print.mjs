import fs from 'fs';
let content = fs.readFileSync('src/pages/emi-management.tsx', 'utf8');

// Replace handleDownloadPDF with handlePrint
content = content.replace(
  'const handleDownloadPDF = () => {',
  'const handlePrint = () => {'
);

// Replace doc.save
content = content.replace(
  /doc\.save\(`EMI_Schedule_\$\{selectedEmiForView\.fileNumber \|\| selectedEmiForView\.customerName\}\.pdf`\);/,
  "doc.autoPrint();\n    window.open(doc.output('bloburl'), '_blank');"
);

// Import Printer
content = content.replace(
  "import { Search, Calculator, CheckSquare, Calendar, CarFront, User, FileText, IndianRupee, Download } from 'lucide-react';",
  "import { Search, Calculator, CheckSquare, Calendar, CarFront, User, FileText, IndianRupee, Download, Printer } from 'lucide-react';"
);

// Replace the button
const btnSearch = `<Button variant="outline" size="sm" onClick={handleDownloadPDF} className="gap-2 shrink-0">
                  <Download className="w-4 h-4" />
                  Export PDF
                </Button>`;
const btnReplace = `<Button variant="outline" size="sm" onClick={handlePrint} className="gap-2 shrink-0">
                  <Printer className="w-4 h-4" />
                  Print
                </Button>`;

content = content.replace(btnSearch, btnReplace);

fs.writeFileSync('src/pages/emi-management.tsx', content);
