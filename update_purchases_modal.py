import re

with open('src/pages/purchases.tsx', 'r') as f:
    c = f.read()

# Add new states for modal and expanded rows
state_regex = re.compile(r"  const \[isInvoiceExpanded, setIsInvoiceExpanded\] = useState\(true\);\n")
c = state_regex.sub("  const [isFormOpen, setIsFormOpen] = useState(false);\n  const [isInvoiceExpanded, setIsInvoiceExpanded] = useState(true);\n  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});\n\n  const toggleRow = (id: string) => {\n    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));\n  };\n", c)


# Update the openNewPurchase / cancelEdit / openEditPurchase logic
open_edit_regex = re.compile(r"  const openEditPurchase = \(purchase: Purchase & \{ id: string \}\) => \{")
c = open_edit_regex.sub("  const openNewPurchase = () => {\n    cancelEdit();\n    setIsFormOpen(true);\n  };\n\n  const openEditPurchase = (purchase: Purchase & { id: string }) => {", c)

# In cancelEdit, set isFormOpen to false
cancel_edit_regex = re.compile(r"    setCurrentChassisEntries\(\[\]\);\n  \};\n")
c = cancel_edit_regex.sub("    setCurrentChassisEntries([]);\n    setIsFormOpen(false);\n  };\n", c)

# Replace the buttons in the header
header_buttons_regex = re.compile(r'<div className="flex gap-3 lg:mr-\[200px\]">.*?</div>', re.DOTALL)
c = header_buttons_regex.sub(r'''<div className="flex gap-3 lg:mr-[200px]">
          <Button 
            onClick={openNewPurchase} 
            size="lg" 
            disabled={!canCreate}
            className="rounded-xl h-12 px-8 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 font-bold"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Purchase
          </Button>
        </div>''', c, count=1)


# Move the form (grid gap-8) into a Dialog
# We need to find the start of the grid and the end of the grid.
grid_start_idx = c.find('<div className="grid gap-8 grid-cols-1 lg:grid-cols-12">')
grid_end_idx = c.find('      {/* Selection Dialog */}')

if grid_start_idx != -1 and grid_end_idx != -1:
    grid_content = c[grid_start_idx:grid_end_idx]
    
    # Replace the buttons inside the form now that they are in the dialog
    dialog_content = f'''
      <Dialog open={{isFormOpen}} onOpenChange={{(open) => !open && cancelEdit()}}>
        <DialogContent className="sm:max-w-[95vw] sm:max-h-[95vh] h-[95vh] rounded-2xl flex flex-col p-0 overflow-hidden bg-slate-50 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] shrink-0">
            <DialogTitle className="text-xl font-black">{{editingPurchase ? 'Edit Purchase Invoice' : 'New Purchase Invoice'}}</DialogTitle>
            <div className="flex items-center gap-3">
               <Button onClick={{cancelEdit}} variant="outline" className="h-10 px-6 font-bold rounded-xl">
                 Cancel
               </Button>
               <Button onClick={{handleSavePurchase}} className="h-10 px-6 font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white">
                 {{editingPurchase ? 'Confirm Updates' : 'Confirm Procurement'}}
               </Button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {grid_content}
          </div>
        </DialogContent>
      </Dialog>
      
      {{/* Selection Dialog */}}'''
      
    c = c[:grid_start_idx] + dialog_content + c[grid_end_idx+26:]


with open('src/pages/purchases.tsx', 'w') as f:
    f.write(c)

