import re

with open('src/components/layout.tsx', 'r') as f:
    content = f.read()

content = content.replace("  Store\n  FileSignature,", "  Store,\n  FileSignature,")
content = content.replace("  Store\r\n  FileSignature,", "  Store,\n  FileSignature,")

with open('src/components/layout.tsx', 'w') as f:
    f.write(content)
