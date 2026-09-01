import re

with open('src/types/index.ts', 'r') as f:
    content = f.read()

content = content.replace(
    "  type: PartyType;\n  createdAt: Timestamp;",
    "  type: PartyType;\n  tallyAccountId?: string;\n  createdAt: Timestamp;"
)

with open('src/types/index.ts', 'w') as f:
    f.write(content)
