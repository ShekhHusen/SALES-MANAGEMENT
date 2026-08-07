import fs from 'fs';
let rules = fs.readFileSync('firestore.rules', 'utf8');
rules = rules.replace(/match \/emis\/{emiId} {/, "match /emis/{emiId} { // Trigger reload");
fs.writeFileSync('firestore.rules', rules);
