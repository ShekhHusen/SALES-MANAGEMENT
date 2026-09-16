import re

with open("src/pages/parties.tsx", "r") as f:
    content = f.read()

dedup_code = """  // TEMPORARY DEDUPLICATION
  useEffect(() => {
    if (parties.length > 0) {
      const nameMap = new Map();
      const duplicatesToDelete: any[] = [];
      parties.forEach(p => {
        const key = p.name?.trim().toLowerCase();
        if (!key) return;
        if (nameMap.has(key)) {
          const existing = nameMap.get(key);
          if (p.tallyAccountId && !existing.tallyAccountId) {
            duplicatesToDelete.push(existing);
            nameMap.set(key, p);
          } else if (existing.tallyAccountId && !p.tallyAccountId) {
            duplicatesToDelete.push(p);
          } else {
            duplicatesToDelete.push(p);
          }
        } else {
          nameMap.set(key, p);
        }
      });

      if (duplicatesToDelete.length > 0) {
        console.log("Found duplicates to delete:", duplicatesToDelete.length);
        duplicatesToDelete.forEach(async (dup) => {
          try {
            await deleteDoc(doc(db, 'parties', dup.id));
            console.log("Deleted duplicate:", dup.name, dup.id);
          } catch (e) {
            console.error("Error deleting duplicate", dup.id, e);
          }
        });
      }
    }
  }, [parties]);
"""

content = content.replace("  }, []);\n  const [search", "  }, []);\n" + dedup_code + "\n  const [search")

with open("src/pages/parties.tsx", "w") as f:
    f.write(content)
