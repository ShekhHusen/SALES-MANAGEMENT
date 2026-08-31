import re

with open('src/types/index.ts', 'r') as f:
    content = f.read()

content = content.replace(
    "export type NaamsariStatus = 'Pending' | 'Names of JBMT' | 'Customer Done';",
    "export type NaamsariStatus = 'Pending' | 'Names of JBMT' | 'Customer Done' | 'VAT Bill Issued';"
)

with open('src/types/index.ts', 'w') as f:
    f.write(content)
