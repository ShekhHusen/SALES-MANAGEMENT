import re

with open('src/pages/internal-accounts.tsx', 'r') as f:
    c = f.read()

bad_refresh = """    const refreshInternalData = async () => {
        try {
            setLoading(true);
            const [usersSnap, openingsSnap, transactionsSnap, metadataSnap, mappingsSnap] = await Promise.all([
                getDocs(collection(db, 'users')),
                getDocs(collection(db, 'internal_openings')),
                getDocs(collection(db, 'internal_transactions')),
                getDocs(collection(db, 'account_metadata')),
                getDoc(doc(db, 'internal_data', 'mappings'))
            ]);
            
            setUsers(usersSnap.docs.map(d => ({ ...(d.data() as UserProfile), uid: d.id })));
            setOpenings(openingsSnap.docs.map(d => ({ id: d.id, ...d.data() } as OpeningBalance)));
            setRawTransactions(transactionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
            setAccountMetadata(metadataSnap.docs.map(d => ({ id: d.id, ...d.data() } as AccountMetadata)));
            
            if (mappingsSnap.exists()) {
                 setMappings(mappingsSnap.data()?.mappings || {});
                 setHiddenParties(mappingsSnap.data()?.hiddenParties || []);
            } else {
                 setMappings({});
                 setHiddenParties([]);
            }
        } catch (e) {
            console.error('Error fetching internal data:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshInternalData();
    }, []);"""

good_refresh = """    const [fullDataLoaded, setFullDataLoaded] = useState(false);

    const refreshInternalData = async (forceFullLoad = false) => {
        try {
            setLoading(true);
            
            const promises: Promise<any>[] = [
                getDocs(collection(db, 'users')),
                getDocs(collection(db, 'account_metadata')),
                getDoc(doc(db, 'internal_data', 'mappings'))
            ];
            
            const needsFullLoad = forceFullLoad || activeTab === 'summary' || activeTab === 'transactions' || activeTab === 'openings';
            
            if (needsFullLoad) {
                promises.push(getDocs(collection(db, 'internal_openings')));
                promises.push(getDocs(collection(db, 'internal_transactions')));
            }
            
            const results = await Promise.all(promises);
            
            const usersSnap = results[0];
            const metadataSnap = results[1];
            const mappingsSnap = results[2];
            
            setUsers(usersSnap.docs.map((d: any) => ({ ...(d.data() as UserProfile), uid: d.id })));
            setAccountMetadata(metadataSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as AccountMetadata)));
            
            if (mappingsSnap.exists()) {
                 setMappings(mappingsSnap.data()?.mappings || {});
                 setHiddenParties(mappingsSnap.data()?.hiddenParties || []);
            } else {
                 setMappings({});
                 setHiddenParties([]);
            }
            
            if (needsFullLoad) {
                const openingsSnap = results[3];
                const transactionsSnap = results[4];
                setOpenings(openingsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as OpeningBalance)));
                setRawTransactions(transactionsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Transaction)));
                setFullDataLoaded(true);
            }
            
            // Re-fetch statement data if needed
            if (selectedAccount) {
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
            }

        } catch (e) {
            console.error('Error fetching internal data:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshInternalData();
    }, [activeTab]);"""

c = c.replace(bad_refresh, good_refresh)

with open('src/pages/internal-accounts.tsx', 'w') as f:
    f.write(c)

