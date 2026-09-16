import re

with open('src/components/TallyStatementModal.tsx', 'r') as f:
    content = f.read()

# Fix the escaped quotes
content = content.replace(r"${accountInfo?.contact || \'-\'}", r"${accountInfo?.contact || '-'}")
content = content.replace(r"${accountInfo?.address || \'-\'}", r"${accountInfo?.address || '-'}")
content = content.replace(r"{accountInfo?.contact || \'-\'}", r"{accountInfo?.contact || '-'}")
content = content.replace(r"{accountInfo?.address || \'-\'}", r"{accountInfo?.address || '-'}")

with open('src/components/TallyStatementModal.tsx', 'w') as f:
    f.write(content)
