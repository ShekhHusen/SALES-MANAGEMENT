import re

with open('firestore.rules', 'r') as f:
    content = f.read()

new_rule = """    match /sale_other_details/{docId} {
      allow read, list: if isSignedIn();
      allow create, update, delete: if isSignedIn();
    }
"""

content = content.replace("    match /emis/{emiId} {", new_rule + "    match /emis/{emiId} {")

with open('firestore.rules', 'w') as f:
    f.write(content)

