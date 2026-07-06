import re

with open('src/pages/purchases.tsx', 'r') as f:
    c = f.read()

c = re.sub(r'''        <Card className="lg:col-span-4 shadow-sm border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden h-fit lg:pt-\[5px\] lg:pb-0">
          <div className="bg-slate-50 dark:bg-\[#0f172a\] px-6 py-4 border-b border-slate-200 dark:border-slate-800 lg:pt-\[5px\] lg:pb-\[5px\]">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">\{editingPurchase \? "Edit Invoice Reference" : "Invoice Reference"\}</h3>
          </div>
          <CardContent className="p-6 space-y-6 lg:pt-0 lg:pb-\[10px\]">''',
'''        <Card className={cn(isInvoiceExpanded ? "lg:col-span-4" : "lg:col-span-12", "shadow-sm border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden h-fit lg:pt-[5px] lg:pb-0")}>
          <div 
            className="bg-slate-50 dark:bg-[#0f172a] px-6 py-4 border-b border-slate-200 dark:border-slate-800 lg:pt-[5px] lg:pb-[5px] flex justify-between items-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
            onClick={() => setIsInvoiceExpanded(!isInvoiceExpanded)}
          >
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">{editingPurchase ? "Edit Invoice Reference" : "Invoice Reference"}</h3>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-slate-200 dark:hover:bg-slate-700">
                {isInvoiceExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
          {isInvoiceExpanded && (
          <CardContent className="p-6 space-y-6 lg:pt-0 lg:pb-[10px]">''', c)


c = re.sub(r'''              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-8 shadow-sm border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden lg:pt-\[5px\] lg:pb-0">''',
'''              </div>
            </div>
          </CardContent>
          )}
        </Card>

        <Card className={cn(isInvoiceExpanded ? "lg:col-span-8" : "lg:col-span-12", "shadow-sm border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden lg:pt-[5px] lg:pb-0")}>''', c)

with open('src/pages/purchases.tsx', 'w') as f:
    f.write(c)

