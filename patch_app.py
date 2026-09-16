import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

content = content.replace("import { Quotation } from '@/pages/quotation';", "import { DocumentPrinting } from '@/pages/document-printing';\nimport { Quotations } from '@/pages/quotations';")
content = content.replace("<Route path=\"/quotation\" element={<TabGuard path=\"/quotation\"><Quotation /></TabGuard>} />", "<Route path=\"/quotation\" element={<TabGuard path=\"/quotation\"><DocumentPrinting /></TabGuard>} />\n          <Route path=\"/quotations\" element={<TabGuard path=\"/quotations\"><Quotations /></TabGuard>} />")

with open('src/App.tsx', 'w') as f:
    f.write(content)

with open('src/pages/document-printing.tsx', 'r') as f:
    dp_content = f.read()

dp_content = dp_content.replace('export function Quotation() {', 'export function DocumentPrinting() {')

with open('src/pages/document-printing.tsx', 'w') as f:
    f.write(dp_content)
