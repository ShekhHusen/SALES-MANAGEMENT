import re

with open('firebase-blueprint.json', 'r') as f:
    content = f.read()

content = content.replace(
    '"Pending",\n            "Names of JBMT",\n            "Customer Done"',
    '"Pending",\n            "Names of JBMT",\n            "Customer Done",\n            "VAT Bill Issued"'
)

with open('firebase-blueprint.json', 'w') as f:
    f.write(content)
