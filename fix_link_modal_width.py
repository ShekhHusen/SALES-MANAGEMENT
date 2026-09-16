import re

with open('src/components/TallyLinkModal.tsx', 'r') as f:
    content = f.read()

target = 'DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col"'
replacement = 'DialogContent className="max-w-3xl sm:max-w-3xl md:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col"'

content = content.replace(target, replacement)

with open('src/components/TallyLinkModal.tsx', 'w') as f:
    f.write(content)
