with open('src/components/ProcessDocumentSheet.tsx', 'r') as f:
    content = f.read()

target = """              {viewSale && (
                <div className="flex items-center gap-2 mr-6">"""

replacement = """              {viewSale && (
                <div className="flex items-center gap-2 mr-6">
                  {(() => {
                    const party = parties.find(p => p.id === viewSale.customerId);
                    if (party && party.tallyAccountId) {
                      return (
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl font-bold gap-2 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
                          onClick={() => setStatementModalOpen(true)}
                        >
                          <FileText className="w-4 h-4 text-indigo-600" />
                          STATEMENT
                        </Button>
                      );
                    }
                    return null;
                  })()}"""
                  
content = content.replace(target, replacement)

with open('src/components/ProcessDocumentSheet.tsx', 'w') as f:
    f.write(content)
