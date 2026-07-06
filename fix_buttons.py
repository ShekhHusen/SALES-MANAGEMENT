import re

with open('src/pages/purchases.tsx', 'r') as f:
    c = f.read()

# Replace the "Confirm Procurement" button logic
button_regex = re.compile(r'''        <Button \n          onClick=\{handleSavePurchase\} \n          size="lg" \n          disabled=\{\!canCreate\}\n          className="rounded-xl h-12 px-8 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 font-bold lg:mr-\[200px\]"\n        >\n          Confirm Procurement\n        </Button>''')

new_buttons = '''        <div className="flex gap-3 lg:mr-[200px]">
          {editingPurchase && (
            <Button
              onClick={cancelEdit}
              variant="outline"
              size="lg"
              className="rounded-xl h-12 px-6 font-bold"
            >
              Cancel Edit
            </Button>
          )}
          <Button 
            onClick={handleSavePurchase} 
            size="lg" 
            disabled={!canCreate}
            className="rounded-xl h-12 px-8 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 font-bold"
          >
            {editingPurchase ? 'Confirm Updates' : 'Confirm Procurement'}
          </Button>
        </div>'''

c = button_regex.sub(new_buttons, c)

with open('src/pages/purchases.tsx', 'w') as f:
    f.write(c)

