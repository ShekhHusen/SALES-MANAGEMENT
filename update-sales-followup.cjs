const fs = require('fs');
let code = fs.readFileSync('src/pages/sales.tsx', 'utf-8');

const useEffectRegex = /  useEffect\(\(\) => \{\n    if \(selectedSaleForFollowUp\) \{\n      const q = query\(collection\(db, 'salesFollowUps'\), where\('saleId', '==', selectedSaleForFollowUp\.id\)\);\n      const unsubscribe = onSnapshot\(q, \(snapshot\) => \{\n        const list = snapshot\.docs\.map\(doc => \(\{ id: doc\.id, \.\.\.doc\.data\(\) \}\)\);\n        list\.sort\(\(a: any, b: any\) => \{\n          const tA = a\.createdAt\?\.seconds \|\| 0;\n          const tB = b\.createdAt\?\.seconds \|\| 0;\n          return tB - tA;\n        \}\);\n        setFollowUpsList\(list\);\n      \}, \(err\) => \{\n        console\.error\('Follow-ups snapshot error:', err\);\n      \}\);\n      return \(\) => unsubscribe\(\);\n    \} else \{\n      setFollowUpsList\(\[\]\);\n    \}\n  \}, \[selectedSaleForFollowUp\]\);/g;

const useEffectReplacement = `  useEffect(() => {
    if (selectedSaleForFollowUp) {
      let salesFollowUps: any[] = [];
      let emiFollowUps: any[] = [];
      
      const updateList = () => {
        const combined = [...salesFollowUps, ...emiFollowUps];
        combined.sort((a: any, b: any) => {
          const tA = a.createdAt?.seconds || 0;
          const tB = b.createdAt?.seconds || 0;
          return tB - tA;
        });
        setFollowUpsList(combined);
      };

      const qSales = query(collection(db, 'salesFollowUps'), where('saleId', '==', selectedSaleForFollowUp.id));
      const unsubSales = onSnapshot(qSales, (snapshot) => {
        salesFollowUps = snapshot.docs.map(doc => ({ id: doc.id, type: 'sales', ...doc.data() }));
        updateList();
      }, (err) => {
        console.error('Sales Follow-ups snapshot error:', err);
      });

      let unsubEmi: (() => void) | null = null;
      let isUnmounted = false;

      // Find the corresponding EMI record
      const emiQuery = query(collection(db, 'emis'), where('saleId', '==', selectedSaleForFollowUp.id));
      getDocs(emiQuery).then(emiSnapshot => {
        if (isUnmounted) return;
        if (!emiSnapshot.empty) {
           const emiId = emiSnapshot.docs[0].id;
           const qEmi = query(collection(db, 'emiFollowUps'), where('emiId', '==', emiId));
           unsubEmi = onSnapshot(qEmi, (snapshot) => {
             emiFollowUps = snapshot.docs.map(doc => ({ id: doc.id, type: 'emi', ...doc.data() }));
             updateList();
           }, (err) => {
             console.error('EMI Follow-ups snapshot error:', err);
           });
        }
      }).catch(err => {
         console.error('Error fetching EMI for followups:', err);
      });

      return () => {
        isUnmounted = true;
        unsubSales();
        if (unsubEmi) unsubEmi();
      };
    } else {
      setFollowUpsList([]);
    }
  }, [selectedSaleForFollowUp]);`;

code = code.replace(useEffectRegex, useEffectReplacement);

const deleteRegex = /  const handleDeleteFollowUp = async \(id: string\) => \{\n    try \{\n      await deleteDoc\(doc\(db, 'salesFollowUps', id\)\);\n      toast\.success\('Follow up deleted'\);\n    \} catch \(error\) \{\n      console\.error\('Error deleting follow up', error\);\n      toast\.error\('Failed to delete follow up'\);\n    \}\n  \};/g;

const deleteReplacement = `  const handleDeleteFollowUp = async (id: string, type: 'emi' | 'sales' = 'sales') => {
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

const onClickRegex = /onClick=\{\(\) => \{\n                                    if\(confirm\('Are you sure you want to delete this follow up\?'\)\) \{\n                                      handleDeleteFollowUp\(item\.id\);\n                                    \}\n                                  \}\}/g;

const onClickReplacement = `onClick={() => {
                                    if(confirm('Are you sure you want to delete this follow up?')) {
                                      handleDeleteFollowUp(item.id, item.type || 'sales');
                                    }
                                  }}`;

code = code.replace(onClickRegex, onClickReplacement);

const badgeAddRegex = /<TableRow key=\{item\.id\} className="hover:bg-slate-50\/50 dark:hover:bg-slate-800\/50">\s*<TableCell className="font-medium text-xs whitespace-nowrap">\s*\{item\.recentDate\}\s*<\/TableCell>/g;
const badgeAddReplacement = `<TableRow key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                            <TableCell className="font-medium text-xs whitespace-nowrap">
                              <div className="flex flex-col gap-1">
                                <span>{item.recentDate}</span>
                                {item.type === 'emi' && (
                                  <Badge variant="outline" className="w-fit text-[9px] py-0 px-1 bg-purple-50 text-purple-700 border-purple-200">
                                    EMI Follow-up
                                  </Badge>
                                )}
                              </div>
                            </TableCell>`;

code = code.replace(badgeAddRegex, badgeAddReplacement);

fs.writeFileSync('src/pages/sales.tsx', code);
