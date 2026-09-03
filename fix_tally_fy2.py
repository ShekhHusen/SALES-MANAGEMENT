import re

with open('src/components/TallyStatementModal.tsx', 'r') as f:
    content = f.read()

use_effect_pattern = r'''  useEffect\(\(\) => \{\s*if \(open && tallyAccountId\) \{\s*fetchData\(\);\s*\}\s*\}, \[open, tallyAccountId\]\);'''

new_use_effect = r'''  useEffect(() => {
    if (open) {
      fetchFiscalYears();
    }
  }, [open]);

  useEffect(() => {
    if (open && tallyAccountId && selectedFyId) {
      fetchData();
    }
  }, [open, tallyAccountId, selectedFyId]);

  const fetchFiscalYears = async () => {
    try {
      const snap = await getDocs(collection(tallyDb, 'fiscalYears'));
      const fys: any[] = [];
      snap.forEach(doc => {
        fys.push({ id: doc.id, ...doc.data() });
      });
      fys.sort((a, b) => {
        const dateA = new Date(a.startDate || 0).getTime();
        const dateB = new Date(b.startDate || 0).getTime();
        return dateB - dateA;
      });
      setFiscalYears(fys);
      if (fys.length > 0 && !selectedFyId) {
        const today = new Date().toISOString().split('T')[0];
        const currentFy = fys.find(fy => fy.startDate <= today && fy.endDate >= today);
        setSelectedFyId(currentFy ? currentFy.id : fys[0].id);
      }
    } catch (e) {
      console.error("Error fetching fiscal years:", e);
    }
  };'''

content = re.sub(use_effect_pattern, new_use_effect, content)

with open('src/components/TallyStatementModal.tsx', 'w') as f:
    f.write(content)
