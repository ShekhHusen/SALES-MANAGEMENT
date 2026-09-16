import re

with open('src/components/TallyStatementModal.tsx', 'r') as f:
    content = f.read()

# Add imports
content = content.replace("import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';", "import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';\nimport { ProcessDocumentSheet } from '@/components/ProcessDocumentSheet';")

# Add state
state_pattern = r'const \[showFullDetails, setShowFullDetails\] = useState\(false\);\s*const \{ businessProfile, parties \} = useGlobalData\(\);'
new_state = r'const [showFullDetails, setShowFullDetails] = useState(false);\n  const [viewSheetOpen, setViewSheetOpen] = useState(false);\n  const [viewSale, setViewSale] = useState<any>(null);\n  const { businessProfile, parties, sales } = useGlobalData();'
content = re.sub(state_pattern, new_state, content)

# Add View button next to Tally Connected badge
view_btn = r"""              </div>
              
              {/* Add View button if vmsParty is a customer and has sales */}
              {vmsParty?.type === 'customer' && (() => {
                const customerSales = sales.filter(s => s.customerId === vmsParty.id);
                if (customerSales.length > 0) {
                  return (
                    <div className="ml-auto flex items-center pr-4">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-9 text-emerald-600 hover:text-white border-emerald-200 hover:bg-emerald-600 font-bold text-xs rounded-xl shadow-sm px-4 flex items-center gap-2"
                        onClick={() => {
                          const latestSale = customerSales.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())[0];
                          setViewSale(latestSale);
                          setViewSheetOpen(true);
                        }}
                      >
                        <FileText className="h-4 w-4" />
                        VIEW DOCUMENT
                      </Button>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
            
            <ProcessDocumentSheet 
              open={viewSheetOpen}
              onOpenChange={setViewSheetOpen}
              viewSale={viewSale}
            />"""

content = content.replace("              </div>\n            </div>\n            \n                        ", view_btn + "\n                        ")

with open('src/components/TallyStatementModal.tsx', 'w') as f:
    f.write(content)

