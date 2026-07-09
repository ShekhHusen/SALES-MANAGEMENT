import re

with open('src/pages/internal-accounts.tsx', 'r') as f:
    c = f.read()

bad_usememo_op = """    const statementOpening = useMemo(() => {
        if (!selectedAccount) return null;
        // Sum up all openings for this account just in case there are multiple
        const acts = openings.filter(o => (o.accountName || '').trim() === selectedAccount);
        if (acts.length === 0) return null;
        const totalDebit = acts.reduce((acc, a) => acc + (a.debit || 0), 0);
        const totalCredit = acts.reduce((acc, a) => acc + (a.credit || 0), 0);
        return { debit: totalDebit, credit: totalCredit };
    }, [selectedAccount, openings]);"""

bad_usememo_tx = """    const statementTransactions = useMemo(() => {
        if (!selectedAccount) return [];
        let filtered = transactions.filter(t => (t.particulars || '').trim() === selectedAccount);
        
        // 1. Sort chronologically to compute running balance
        filtered.sort((a, b) => {
            const timeA = a.date && typeof (a.date as any).toDate === 'function' ? (a.date as any).toDate().getTime() : (a.date ? new Date(a.date).getTime() : 0);
            const timeB = b.date && typeof (b.date as any).toDate === 'function' ? (b.date as any).toDate().getTime() : (b.date ? new Date(b.date).getTime() : 0);
            const numA = isNaN(timeA) ? 0 : timeA;
            const numB = isNaN(timeB) ? 0 : timeB;
            return numA - numB;
        });

        // 2. Apply statement sorting if any
        if (statementSort) {
            filtered.sort((a, b) => {
                let valA = a[statementSort.key];
                let valB = b[statementSort.key];
                
                if (statementSort.key === 'date') {
                    const timeA = a.date && typeof (a.date as any).toDate === 'function' ? (a.date as any).toDate().getTime() : (a.date ? new Date(a.date).getTime() : 0);
                    const timeB = b.date && typeof (b.date as any).toDate === 'function' ? (b.date as any).toDate().getTime() : (b.date ? new Date(b.date).getTime() : 0);
                    valA = isNaN(timeA) ? 0 : timeA;
                    valB = isNaN(timeB) ? 0 : timeB;
                }
                
                if (valA < valB) return statementSort.direction === 'asc' ? -1 : 1;
                if (valA > valB) return statementSort.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        
        return filtered;
    }, [selectedAccount, transactions, statementSort, statementOpening]);"""

good_fetch = """    const [fetchedStatementOpening, setFetchedStatementOpening] = useState<{ debit: number; credit: number } | null>(null);
    const [fetchedStatementTransactions, setFetchedStatementTransactions] = useState<Transaction[]>([]);

    useEffect(() => {
        if (!selectedAccount) {
            setFetchedStatementOpening(null);
            setFetchedStatementTransactions([]);
            return;
        }

        const fetchStatementData = async () => {
            setLoading(true);
            try {
                // Fetch openings for the selected account
                const opQ = query(collection(db, 'internal_openings'), where('accountName', '==', selectedAccount));
                const txQ = query(collection(db, 'internal_transactions'), where('particulars', '==', selectedAccount));
                
                const [opSnap, txSnap] = await Promise.all([getDocs(opQ), getDocs(txQ)]);
                
                const acts = opSnap.docs.map(d => d.data() as OpeningBalance);
                if (acts.length > 0) {
                    const totalDebit = acts.reduce((acc, a) => acc + (a.debit || 0), 0);
                    const totalCredit = acts.reduce((acc, a) => acc + (a.credit || 0), 0);
                    setFetchedStatementOpening({ debit: totalDebit, credit: totalCredit });
                } else {
                    setFetchedStatementOpening(null);
                }

                const txs = txSnap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));
                setFetchedStatementTransactions(txs);
            } catch (e) {
                console.error("Error fetching statement data:", e);
            } finally {
                setLoading(false);
            }
        };

        fetchStatementData();
    }, [selectedAccount]);

    const statementOpening = fetchedStatementOpening;

    const statementTransactions = useMemo(() => {
        let filtered = [...fetchedStatementTransactions];
        
        // 1. Sort chronologically to compute running balance
        filtered.sort((a, b) => {
            const timeA = a.date && typeof (a.date as any).toDate === 'function' ? (a.date as any).toDate().getTime() : (a.date ? new Date(a.date).getTime() : 0);
            const timeB = b.date && typeof (b.date as any).toDate === 'function' ? (b.date as any).toDate().getTime() : (b.date ? new Date(b.date).getTime() : 0);
            const numA = isNaN(timeA) ? 0 : timeA;
            const numB = isNaN(timeB) ? 0 : timeB;
            return numA - numB;
        });

        // 2. Apply statement sorting if any
        if (statementSort) {
            filtered.sort((a, b) => {
                let valA = a[statementSort.key];
                let valB = b[statementSort.key];
                
                if (statementSort.key === 'date') {
                    const timeA = a.date && typeof (a.date as any).toDate === 'function' ? (a.date as any).toDate().getTime() : (a.date ? new Date(a.date).getTime() : 0);
                    const timeB = b.date && typeof (b.date as any).toDate === 'function' ? (b.date as any).toDate().getTime() : (b.date ? new Date(b.date).getTime() : 0);
                    valA = isNaN(timeA) ? 0 : timeA;
                    valB = isNaN(timeB) ? 0 : timeB;
                }
                
                if (valA < valB) return statementSort.direction === 'asc' ? -1 : 1;
                if (valA > valB) return statementSort.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        
        return filtered;
    }, [fetchedStatementTransactions, statementSort]);"""

c = c.replace(bad_usememo_op, "")
c = c.replace(bad_usememo_tx, good_fetch)

with open('src/pages/internal-accounts.tsx', 'w') as f:
    f.write(c)

