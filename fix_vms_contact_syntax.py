import re

with open('src/components/TallyStatementModal.tsx', 'r') as f:
    content = f.read()

# Fix summary_new string literals that were incorrectly escaped
content = content.replace(r"${vmsParty?.contactNumber || \'\-\'}", r"${vmsParty?.contactNumber || '-'}")
content = content.replace(r"${vmsParty?.address || \'\-\'}", r"${vmsParty?.address || '-'}")
content = content.replace(r"{vmsParty?.contactNumber || \'-\'}", r"{vmsParty?.contactNumber || '-'}")
content = content.replace(r"{vmsParty?.address || \'-\'}", r"{vmsParty?.address || '-'}")


with open('src/components/TallyStatementModal.tsx', 'w') as f:
    f.write(content)
