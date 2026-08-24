const fs = require('fs');
let code = fs.readFileSync('src/pages/process-document.tsx', 'utf-8');

// 1. Replace state definitions
const stateRegex = /  \/\/ Server-side Pending Sales State\n  const pendingSalesData = useMemo\(\(\) => sales\.filter\(s => s\.documentationCompleted !== true && s\.status !== 'returned'\), \[sales\]\);\n  const \[completedSalesData, setCompletedSalesData\] = useState<Sale\[\]>\(\[\]\);\n  const \[completedCurrentPage, setCompletedCurrentPage\] = useState\(1\);\n  const \[completedItemsPerPage, setCompletedItemsPerPage\] = useState<number \| 'all'>\(5\);\n  const \[completedLoading, setCompletedLoading\] = useState\(false\);\n  const \[completedTotalPages, setCompletedTotalPages\] = useState\(1\);\n  const \[completedTotalItems, setCompletedTotalItems\] = useState<number>\(0\);\n  const \[completedCursors, setCompletedCursors\] = useState<any\[\]>\(\[null\]\); \/\/ index 0 is page 1 start cursor\n  const \[completedError, setCompletedError\] = useState<string \| null>\(null\);/;

const stateReplacement = `  // Pending Sales State
  const pendingSalesData = useMemo(() => sales.filter(s => s.documentationCompleted !== true && s.status !== 'returned'), [sales]);
  // Client-side Completed Sales State
  const completedSalesData = useMemo(() => sales.filter(s => s.documentationCompleted === true), [sales]);
  
  const [completedCurrentPage, setCompletedCurrentPage] = useState(1);
  const [completedItemsPerPage, setCompletedItemsPerPage] = useState<number | 'all'>(5);
  const completedLoading = false;
  const completedError = null;`;

code = code.replace(stateRegex, stateReplacement);

// 2. Remove fetchCompletedSales and its useEffect
// I will use regex to find and remove from "const fetchCompletedSales =" up to the end of its useEffect.
// Since it's multi-line, it's easier to just match the start and end tokens.
const fetchRegex = /  \/\/ Added getCountFromServer to track total items[\s\S]*?  \}, \[activeTab, completedCurrentPage, completedItemsPerPage\]\);/;
code = code.replace(fetchRegex, "");

// 3. Fix handleSaveDriveLink reference to setCompletedSalesData
const driveLinkRegex = /      setCompletedSalesData\(prev => prev\.map\(s => s\.id === driveModalSale\.id \? updatedSale : s\)\);/;
code = code.replace(driveLinkRegex, "// Local mutation handled by global context listener");

// 4. Reset pages when search changes
const searchResetCode = `
  useEffect(() => {
    setSoldCurrentPage(1);
    setCompletedCurrentPage(1);
  }, [searchQuery]);
`;
// Put it near the existing search query definition or just after the states.
code = code.replace(
  "  const [searchQuery, setSearchQuery] = useState('');",
  `  const [searchQuery, setSearchQuery] = useState('');${searchResetCode}`
);

// 5. Update completed sales slicing logic
const completedSlicingRegex = /  const filteredCompletedSales = completedSalesData\.filter\(s => \{[\s\S]*?  const currentCompletedSales = filteredCompletedSales;/;

const completedSlicingReplacement = `  const filteredCompletedSales = completedSalesData.filter(s => {
    const customer = customers.find(c => c.id === s.customerId);
    const searchLow = searchQuery.toLowerCase();
    return ((s.chassisNumber || "").toLowerCase()).includes(searchLow) || 
           (((customer || {}).name || "").toLowerCase()).includes(searchLow) ||
           (((customer || {}).contactNumber || "").toLowerCase()).includes(searchLow);
  });
  
  const completedTotalItems = filteredCompletedSales.length;
  const completedTotalPages = completedItemsPerPage === 'all' ? 1 : Math.ceil(completedTotalItems / (completedItemsPerPage as number));
  
  const currentCompletedSales = completedItemsPerPage === 'all'
    ? filteredCompletedSales
    : filteredCompletedSales.slice((completedCurrentPage - 1) * (completedItemsPerPage as number), completedCurrentPage * (completedItemsPerPage as number));`;

code = code.replace(completedSlicingRegex, completedSlicingReplacement);

fs.writeFileSync('src/pages/process-document.tsx', code);
