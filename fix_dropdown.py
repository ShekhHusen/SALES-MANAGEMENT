import re

with open('src/components/TallyStatementModal.tsx', 'r') as f:
    content = f.read()

# Add buttonVariants import
if 'buttonVariants' not in content:
    content = content.replace("import { Button } from '@/components/ui/button';", "import { Button, buttonVariants } from '@/components/ui/button';\nimport { cn } from '@/lib/utils';")

# Fix first trigger
content = content.replace('''<DropdownMenuTrigger asChild>
                <Button 
                  variant="default" 
                  size="sm" 
                  className="hidden md:flex items-center gap-2 font-bold bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                >
                  <Printer className="h-4 w-4" /> Export PDF <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>''', '''<DropdownMenuTrigger 
                className={cn(buttonVariants({ variant: "default", size: "sm" }), "hidden md:flex items-center gap-2 font-bold bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900")}
              >
                <Printer className="h-4 w-4" /> Export PDF <ChevronDown className="h-3 w-3 ml-1" />
              </DropdownMenuTrigger>''')

# Fix second trigger
content = content.replace('''<DropdownMenuTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 md:hidden"
                            >
                              <Printer className="h-4 w-4 mr-1" />
                              PDF <ChevronDown className="h-3 w-3 ml-1" />
                            </Button>
                          </DropdownMenuTrigger>''', '''<DropdownMenuTrigger 
                            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 md:hidden")}
                          >
                            <Printer className="h-4 w-4 mr-1" />
                            PDF <ChevronDown className="h-3 w-3 ml-1" />
                          </DropdownMenuTrigger>''')

with open('src/components/TallyStatementModal.tsx', 'w') as f:
    f.write(content)
