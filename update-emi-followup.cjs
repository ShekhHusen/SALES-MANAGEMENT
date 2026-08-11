const fs = require('fs');
let code = fs.readFileSync('src/pages/emi-management.tsx', 'utf-8');

const useEffectRegex = /  useEffect\(\(\) => \{\n    if \(selectedEmiForFollowUp\) \{\n      const q = query\(collection\(db, 'emiFollowUps'\), where\('emiId', '==', selectedEmiForFollowUp\.id\)\);\n      const unsubscribe = onSnapshot\(q, \(snapshot\) => \{\n        const list = snapshot\.docs\.map\(doc => \(\{ id: doc\.id, \.\.\.doc\.data\(\) \}\)\);\n        list\.sort\(\(a: any, b: any\) => \{\n          const tA = a\.createdAt\?\.seconds \|\| 0;\n          const tB = b\.createdAt\?\.seconds \|\| 0;\n          return tB - tA;\n        \}\);\n        setFollowUpsList\(list\);\n      \}, \(err\) => \{\n        console\.error\('Follow-ups snapshot error:', err\);\n      \}\);\n      return \(\) => unsubscribe\(\);\n    \} else \{\n      setFollowUpsList\(\[\]\);\n    \}\n  \}, \[selectedEmiForFollowUp\]\);/g;

const useEffectReplacement = `  useEffect(() => {
    if (selectedEmiForFollowUp) {
      const qEmi = query(collection(db, 'emiFollowUps'), where('emiId', '==', selectedEmiForFollowUp.id));
      const qSales = query(collection(db, 'salesFollowUps'), where('saleId', '==', selectedEmiForFollowUp.saleId));
      
      let emiFollowUps: any[] = [];
      let salesFollowUps: any[] = [];

      const updateList = () => {
        const combined = [...emiFollowUps, ...salesFollowUps];
        combined.sort((a: any, b: any) => {
          const tA = a.createdAt?.seconds || 0;
          const tB = b.createdAt?.seconds || 0;
          return tB - tA;
        });
        setFollowUpsList(combined);
      };

      const unsubEmi = onSnapshot(qEmi, (snapshot) => {
        emiFollowUps = snapshot.docs.map(doc => ({ id: doc.id, type: 'emi', ...doc.data() }));
        updateList();
      }, (err) => {
        console.error('EMI Follow-ups snapshot error:', err);
      });

      const unsubSales = onSnapshot(qSales, (snapshot) => {
        salesFollowUps = snapshot.docs.map(doc => ({ id: doc.id, type: 'sales', ...doc.data() }));
        updateList();
      }, (err) => {
        console.error('Sales Follow-ups snapshot error:', err);
      });

      return () => {
        unsubEmi();
        unsubSales();
      };
    } else {
      setFollowUpsList([]);
    }
  }, [selectedEmiForFollowUp]);`;

code = code.replace(useEffectRegex, useEffectReplacement);

const deleteRegex = /  const handleDeleteFollowUp = async \(id: string\) => \{\n    try \{\n      await deleteDoc\(doc\(db, 'emiFollowUps', id\)\);\n      toast\.success\('Follow up deleted'\);\n    \} catch \(error\) \{\n      console\.error\('Error deleting follow up', error\);\n      toast\.error\('Failed to delete follow up'\);\n    \}\n  \};/g;

const deleteReplacement = `  const handleDeleteFollowUp = async (id: string, type: 'emi' | 'sales' = 'emi') => {
    try {
      const collectionName = type === 'sales' ? 'salesFollowUps' : 'emiFollowUps';
      await deleteDoc(doc(db, collectionName, id));
      toast.success('Follow up deleted');
    } catch (error) {
      console.error('Error deleting follow up', error);
      toast.error('Failed to delete follow up');
    }
  };`;

code = code.replace(deleteRegex, deleteReplacement);

const onClickRegex = /onClick=\{\(\) => handleDeleteFollowUp\(item\.id\)\}/g;
const onClickReplacement = `onClick={() => handleDeleteFollowUp(item.id, item.type || 'emi')}`;

code = code.replace(onClickRegex, onClickReplacement);

const badgeAddRegex = /<TableRow key=\{item\.id\} className="hover:bg-slate-50\/50 dark:hover:bg-slate-800\/50">\s*<TableCell className="text-xs font-semibold text-slate-700 dark:text-slate-300">\s*\{item\.recentDate \? new Date\(item\.recentDate\)\.toLocaleDateString\('en-GB'\) : '---\'\}\s*<\/TableCell>/g;
const badgeAddReplacement = `<TableRow key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                            <TableCell className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              <div className="flex flex-col gap-1">
                                <span>{item.recentDate ? new Date(item.recentDate).toLocaleDateString('en-GB') : '---'}</span>
                                {item.type === 'sales' && (
                                  <Badge variant="outline" className="w-fit text-[9px] py-0 px-1 bg-amber-50 text-amber-700 border-amber-200">
                                    Sales Follow-up
                                  </Badge>
                                )}
                              </div>
                            </TableCell>`;

code = code.replace(badgeAddRegex, badgeAddReplacement);

fs.writeFileSync('src/pages/emi-management.tsx', code);
