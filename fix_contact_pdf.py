import re

with open('src/components/PdfTemplates.tsx', 'r') as f:
    content = f.read()

old_str = "<span>: <span className=\"text-[#e11d48] font-bold uppercase\">{customer?.contactNumber || ''}</span></span>"
new_str = "<span>: <span className=\"text-[#e11d48] font-bold uppercase\">{customer?.contactNumber || ''}{customer?.alternateNumber ? '/' + customer.alternateNumber : ''}</span></span>"

content = content.replace(old_str, new_str)

with open('src/components/PdfTemplates.tsx', 'w') as f:
    f.write(content)
