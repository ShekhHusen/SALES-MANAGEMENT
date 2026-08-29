import re

with open('src/pages/process-document.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "const handleDownloadPDF = async (docType: 'quotation' | 'traffic', sale: Sale, action: 'download' | 'print' = 'download') => {",
    "const handleDownloadPDF = async (docType: 'quotation' | 'traffic' | 'bikrinama', sale: Sale, action: 'download' | 'print' = 'download') => {"
)

with open('src/pages/process-document.tsx', 'w') as f:
    f.write(content)
