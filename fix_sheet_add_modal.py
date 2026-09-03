import re

with open('src/components/ProcessDocumentSheet.tsx', 'r') as f:
    content = f.read()

# Add imports
content = content.replace("import { openPopup } from '@/lib/utils';", "import { openPopup } from '@/lib/utils';\nimport { TallyStatementModal } from '@/components/TallyStatementModal';")

# Add state
state_pattern = r'const customers = parties.filter\(p => p.type === \'customer\'\);'
new_state = r'''const customers = parties.filter(p => p.type === 'customer');
  const [statementModalOpen, setStatementModalOpen] = useState(false);'''
content = re.sub(state_pattern, new_state, content)

# Add Statement button next to Drive Link button
header_pattern = r'(\{viewSale && \(\s*<div className="flex items-center gap-2">)'
new_header = r'''\1
                  {(() => {
                    const party = parties.find(p => p.id === viewSale.customerId);
                    if (party && party.tallyAccountId) {
                      return (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 text-indigo-600 hover:text-white border-indigo-200 hover:bg-indigo-600 font-bold text-xs rounded-xl shadow-sm px-4 flex items-center gap-2 mr-2"
                          onClick={() => setStatementModalOpen(true)}
                        >
                          <FileText className="h-4 w-4" />
                          STATEMENT
                        </Button>
                      );
                    }
                    return null;
                  })()}'''
content = re.sub(header_pattern, new_header, content)

# Add TallyStatementModal outside Sheet
sheet_end_pattern = r'(</Sheet>\s*\);\s*\})'
new_sheet_end = r'''</Sheet>
    
    {(() => {
      const party = viewSale ? parties.find(p => p.id === viewSale.customerId) : null;
      return (
        <TallyStatementModal 
          open={statementModalOpen}
          onOpenChange={setStatementModalOpen}
          tallyAccountId={party?.tallyAccountId || null}
          partyName={party?.name || ''}
        />
      );
    })()}
  </>
  );
}'''

# Replace return ( <Sheet ... ) with return ( <> <Sheet ...
content = content.replace("return (\n    <Sheet open={open} onOpenChange={onOpenChange}>", "return (\n    <>\n    <Sheet open={open} onOpenChange={onOpenChange}>")
content = re.sub(sheet_end_pattern, new_sheet_end, content)

with open('src/components/ProcessDocumentSheet.tsx', 'w') as f:
    f.write(content)
