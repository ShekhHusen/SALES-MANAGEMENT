import re

with open('src/pages/purchases.tsx', 'r') as f:
    c = f.read()

c = c.replace('<div className="grid gap-8 grid-cols-1 lg:grid-cols-12">', '<div className="flex flex-col gap-8">')
c = c.replace('<Card className={cn(isInvoiceExpanded ? "lg:col-span-4" : "lg:col-span-12", "shadow-sm border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden h-fit lg:pt-[5px] lg:pb-0")}>', '<Card className="shadow-sm border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden h-fit shrink-0">')
c = c.replace('<Card className={cn(isInvoiceExpanded ? "lg:col-span-8" : "lg:col-span-12", "shadow-sm border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden lg:pt-[5px] lg:pb-0")}>', '<Card className="shadow-sm border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex-1 flex flex-col min-h-[400px]">')

with open('src/pages/purchases.tsx', 'w') as f:
    f.write(c)

