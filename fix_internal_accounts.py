import re

with open('src/pages/internal-accounts.tsx', 'r') as f:
    c = f.read()

bad_useeffect = """    useEffect(() => {
        
        setLoading(true);
        getDocs(collection(db, 'users')).then(snap => setUsers(snap.docs.map(d => ({ ...(d.data() as UserProfile), uid: d.id })))).catch(e => console.error('Users error:', e));
        const unsubs = [
            onSnapshot(collection(db, 'internal_openings'), (snap) => setOpenings(snap.docs.map(d => ({ id: d.id, ...d.data() } as OpeningBalance))), (e) => console.error("internal_openings error:", e)),
            onSnapshot(collection(db, 'internal_transactions'), (snap) => setRawTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction))), (e) => console.error("internal_transactions error:", e)),
            onSnapshot(collection(db, 'account_metadata'), (snap) => setAccountMetadata(snap.docs.map(d => ({ id: d.id, ...d.data() } as AccountMetadata))), (e) => console.error("account_metadata error:", e)),
            onSnapshot(doc(db, 'internal_data', 'mappings'), (snap) => {
                 if (snap.exists()) {
                     setMappings(snap.data()?.mappings || {});
                     setHiddenParties(snap.data()?.hiddenParties || []);
                 }
                 setLoading(false);
            }, (e) => {
                 console.error("Mappings error:", e);
                 setLoading(false);
            })
        ];
        
        const timeout = setTimeout(() => {
            if (loading) setLoading(false);
        }, 3000);
        
        return () => {
            unsubs.forEach(u => u());
            clearTimeout(timeout);
        };
    }, []);"""

good_useeffect = """    const refreshInternalData = async () => {
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

c = c.replace(bad_useeffect, good_useeffect)
# I also need to add getDoc import since we are using getDoc
if "import { getDocs" not in c and "import { collection, onSnapshot, addDoc, serverTimestamp, query, orderBy, where, doc, setDoc, updateDoc, writeBatch, deleteField, FieldPath, arrayUnion, arrayRemove }" in c:
    c = c.replace("import { collection, onSnapshot, addDoc", "import { collection, onSnapshot, addDoc, getDocs, getDoc")

with open('src/pages/internal-accounts.tsx', 'w') as f:
    f.write(c)

