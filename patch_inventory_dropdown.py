import re

with open('src/pages/inventory.tsx', 'r') as f:
    content = f.read()

old_dropdown = """                            <DropdownMenuCheckboxItem checked={filterNaamsari.includes('Customer Done')} onCheckedChange={(checked) => setFilterNaamsari(prev => checked ? [...prev, 'Customer Done'] : prev.filter(x => x !== 'Customer Done'))}>
                              Customer Done
                            </DropdownMenuCheckboxItem>
                          </DropdownMenuSubContent>"""

new_dropdown = """                            <DropdownMenuCheckboxItem checked={filterNaamsari.includes('Customer Done')} onCheckedChange={(checked) => setFilterNaamsari(prev => checked ? [...prev, 'Customer Done'] : prev.filter(x => x !== 'Customer Done'))}>
                              Customer Done
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem checked={filterNaamsari.includes('VAT Bill Issued')} onCheckedChange={(checked) => setFilterNaamsari(prev => checked ? [...prev, 'VAT Bill Issued'] : prev.filter(x => x !== 'VAT Bill Issued'))}>
                              VAT Bill Issued
                            </DropdownMenuCheckboxItem>
                          </DropdownMenuSubContent>"""

if old_dropdown in content:
    content = content.replace(old_dropdown, new_dropdown)
    with open('src/pages/inventory.tsx', 'w') as f:
        f.write(content)
    print("Patched dropdown successfully.")
else:
    print("Could not find dropdown snippet.")

