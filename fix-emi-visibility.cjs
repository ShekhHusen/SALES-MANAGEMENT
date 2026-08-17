const fs = require('fs');
let code = fs.readFileSync('src/pages/emi-management.tsx', 'utf-8');

// Add viewMode state
code = code.replace(
  "const [statusFilter, setStatusFilter] = useState('all');",
  "const [statusFilter, setStatusFilter] = useState('all');\n  const [viewMode, setViewMode] = useState<'active' | 'closed'>('active');"
);

// Reset pagination when viewMode changes
code = code.replace(
  "  }, [searchQuery, emiMonthFilter, statusFilter, pageSize, sortField, sortOrder]);",
  "  }, [searchQuery, emiMonthFilter, statusFilter, pageSize, sortField, sortOrder, viewMode]);"
);

// Update filteredEmis
const filterRegex = /  const filteredEmis = enhancedEmis\.filter\(emi => \{\n    const searchLower = searchQuery\.toLowerCase\(\);/;

const filterReplacement = `  const filteredEmis = enhancedEmis.filter(emi => {
    if (viewMode === 'active' && emi.isClosed) return false;
    if (viewMode === 'closed' && !emi.isClosed) return false;

    const searchLower = searchQuery.toLowerCase();`;
code = code.replace(filterRegex, filterReplacement);

// Update Header
const headerRegex = /<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-1 mb-1 shrink-0">\n\s*<div>\n\s*<h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white lg:mt-\[24px\]">EMI Management<\/h1>\n\s*<\/div>\n\s*<\/div>/;

const headerReplacement = `<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2 shrink-0 w-full">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white lg:mt-[24px]">
            {viewMode === 'active' ? 'EMI Management' : 'Closed EMI Files'}
          </h1>
        </div>
        <div className="flex items-center lg:mt-[24px]">
          <Button 
            variant={viewMode === 'closed' ? 'default' : 'outline'}
            onClick={() => setViewMode(viewMode === 'active' ? 'closed' : 'active')}
            className={\`rounded-xl h-10 \${viewMode === 'closed' ? 'bg-red-600 hover:bg-red-700 text-white' : 'border-slate-200 dark:border-slate-800'}\`}
          >
            {viewMode === 'active' ? 'View Closed Files' : 'View Active Files'}
          </Button>
        </div>
      </div>`;
code = code.replace(headerRegex, headerReplacement);

fs.writeFileSync('src/pages/emi-management.tsx', code);
