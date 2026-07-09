import re

with open('src/hooks/useAccountBalances.ts', 'r') as f:
    c = f.read()

bad_hook = """    useEffect(() => {
        const unsubs = [
            onSnapshot(collection(db, 'internal_openings'), (snap) => setOpenings(snap.docs.map(d => ({ id: d.id, ...d.data() } as OpeningBalance)))),
            onSnapshot(collection(db, 'internal_transactions'), (snap) => setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)))),
            onSnapshot(doc(db, 'internal_data', 'mappings'), (snap) => {
                 if (snap.exists()) {
                     setMappings(snap.data()?.mappings || {});
                 }
            })
        ];
        return () => unsubs.forEach(u => u());
    }, []);"""

good_hook = """    const refresh = async () => {
        try {
            const [openingsSnap, transactionsSnap, mappingsSnap] = await Promise.all([
                getDocs(collection(db, 'internal_openings')),
                getDocs(collection(db, 'internal_transactions')),
                getDoc(doc(db, 'internal_data', 'mappings'))
            ]);
            setOpenings(openingsSnap.docs.map(d => ({ id: d.id, ...d.data() } as OpeningBalance)));
            setTransactions(transactionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
            if (mappingsSnap.exists()) {
                 setMappings(mappingsSnap.data()?.mappings || {});
            } else {
                 setMappings({});
            }
        } catch (e) {
            console.error('Error fetching internal data for useAccountBalances:', e);
        }
    };

    useEffect(() => {
        refresh();
    }, []);"""

c = c.replace(bad_hook, good_hook)
if "getDocs" not in c:
    c = c.replace("import { collection, onSnapshot, doc }", "import { collection, getDocs, getDoc, doc }")

c = c.replace("return { partyBalances, mappings, openings, transactions };", "return { partyBalances, mappings, openings, transactions, refresh };")

with open('src/hooks/useAccountBalances.ts', 'w') as f:
    f.write(c)

