import re

with open('src/pages/purchases.tsx', 'r') as f:
    c = f.read()

# Replace the buttons in the header if not already done correctly
if "New Purchase" not in c:
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
grid_start_idx = c.find('<div className="grid gap-8 grid-cols-1 lg:grid-cols-12">')
grid_end_idx = c.find('      <Dialog open={isSelectorOpen}')

if grid_start_idx != -1 and grid_end_idx != -1:
    grid_content = c[grid_start_idx:grid_end_idx]
    
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
      
      <Dialog open={{isSelectorOpen}}'''
      
    c = c[:grid_start_idx] + dialog_content + c[grid_end_idx + len('      <Dialog open={isSelectorOpen}'):]


with open('src/pages/purchases.tsx', 'w') as f:
    f.write(c)

