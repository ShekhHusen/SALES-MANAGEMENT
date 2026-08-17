const fs = require('fs');
let code = fs.readFileSync('src/pages/follow-ups.tsx', 'utf-8');

const regex = /    const latestFollowUps = new Map<string, any>\(\);\n\n    \/\/ Process sales follow-ups\n    salesFollowUps\.forEach\(fu => \{\n      if \(!latestFollowUps\.has\(fu\.saleId\) \|\| latestFollowUps\.get\(fu\.saleId\)\.createdAt\?\.seconds < fu\.createdAt\?\.seconds\) \{\n        latestFollowUps\.set\(fu\.saleId, \{ \.\.\.fu, entityType: 'sales', entityId: fu\.saleId \}\);\n      \}\n    \}\);\n\n    \/\/ Process EMI follow-ups\n    emiFollowUps\.forEach\(fu => \{\n      if \(!latestFollowUps\.has\(fu\.emiId\) \|\| latestFollowUps\.get\(fu\.emiId\)\.createdAt\?\.seconds < fu\.createdAt\?\.seconds\) \{\n        latestFollowUps\.set\(fu\.emiId, \{ \.\.\.fu, entityType: 'emi', entityId: fu\.emiId \}\);\n      \}\n    \}\);/g;

const replacement = `    const latestFollowUps = new Map<string, any>();

    const getTime = (d: any) => {
      if (!d) return 0;
      if (d.seconds) return d.seconds * 1000;
      if (typeof d.toMillis === 'function') return d.toMillis();
      if (d instanceof Date) return d.getTime();
      return new Date(d).getTime() || 0;
    };

    // Process sales follow-ups
    salesFollowUps.forEach(fu => {
      if (!latestFollowUps.has(fu.saleId) || getTime(latestFollowUps.get(fu.saleId).createdAt) < getTime(fu.createdAt)) {
        latestFollowUps.set(fu.saleId, { ...fu, entityType: 'sales', entityId: fu.saleId });
      }
    });

    // Process EMI follow-ups
    emiFollowUps.forEach(fu => {
      if (!latestFollowUps.has(fu.emiId) || getTime(latestFollowUps.get(fu.emiId).createdAt) < getTime(fu.createdAt)) {
        latestFollowUps.set(fu.emiId, { ...fu, entityType: 'emi', entityId: fu.emiId });
      }
    });`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/pages/follow-ups.tsx', code);
