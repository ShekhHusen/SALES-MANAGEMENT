import fs from 'fs';
const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
config.firestoreDatabaseId = 'ai-studio-e5e03ab2-ddcf-42bf-a5fd-8bf5f05d41ff';
fs.writeFileSync('firebase-applet-config.json', JSON.stringify(config, null, 2));
