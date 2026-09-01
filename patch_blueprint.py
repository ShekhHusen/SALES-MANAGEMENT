import re

with open('firebase-blueprint.json', 'r') as f:
    content = f.read()

target = """        "type": {
          "type": "string",
          "enum": ["vendor", "customer"],
          "description": "Whether the party is a vendor (purchases) or a customer (sales)"
        }"""
        
replacement = target + """,
        "tallyAccountId": {
          "type": "string",
          "description": "Optional ID to link with an account in Tally Analyzer"
        }"""

content = content.replace(target, replacement)

with open('firebase-blueprint.json', 'w') as f:
    f.write(content)
