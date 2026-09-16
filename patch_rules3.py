import sys

with open("firestore.rules", "r") as f:
    content = f.read()

new_rules = """    // Quotations
    match /quotations/{quotationId} {
      allow read, list: if isSignedIn();
      allow create, update, delete: if isSignedIn();
    }

    // Users"""

content = content.replace("    // Users", new_rules)

with open("firestore.rules", "w") as f:
    f.write(content)

print("Rules patched")
