import re

with open('firestore.rules', 'r') as f:
    content = f.read()

# Replace the block
old_block = """    match /sale_other_details/{docId} {
      allow read, list: if isSignedIn();
      allow create, update, delete: if isSignedIn();
    }"""
new_block = """    match /sale_other_details/{docId} {
      allow read, write: if isSignedIn();
    }"""

content = content.replace(old_block, new_block)

with open('firestore.rules', 'w') as f:
    f.write(content)
