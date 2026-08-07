import fs from 'fs';
let rules = fs.readFileSync('firestore.rules', 'utf8');

if (!rules.includes("match /emis/")) {
  rules = rules.replace(
    /match \/sales\/{saleId} {[\s\S]*?}/,
    "match /sales/{saleId} {\n      allow read, list: if isSignedIn();\n      allow create, update, delete: if isSignedIn();\n    }\n\n    match /emis/{emiId} {\n      allow read, list: if isSignedIn();\n      allow create, update, delete: if isSignedIn();\n    }"
  );
  fs.writeFileSync('firestore.rules', rules);
}
