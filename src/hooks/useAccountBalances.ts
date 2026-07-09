import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc } from '@/lib/trackedFirestore';
import { db } from '@/lib/firebase';
import { Party } from '@/types';

interface OpeningBalance {
    id: string;
    accountName: string;
    debit: number;
    credit: number;
}

interface Transaction {
    id: string;
    particulars: string;
    debit: number;
    credit: number;
}

export function useAccountBalances(parties: Party[]) {
    const [openings, setOpenings] = useState<OpeningBalance[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [mappings, setMappings] = useState<Record<string, string>>({});

    const refresh = async () => {
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
    }, []);

    const partyBalances = useMemo(() => {
        const accMap = new Map<string, { closing: number }>();

        parties.forEach(p => {
            const mappedAccountName = Object.keys(mappings).find(key => mappings[key] === p.id);
            if (mappedAccountName) {
                const key = mappedAccountName.trim().toLowerCase();
                if (!accMap.has(key)) accMap.set(key, { closing: 0 });
            } else if (p.name) {
                const key = p.name.trim().toLowerCase();
                if (!accMap.has(key)) accMap.set(key, { closing: 0 });
            }
        });

        openings.forEach(o => {
            if (o.accountName) {
                const key = o.accountName.trim().toLowerCase();
                if (accMap.has(key)) {
                    accMap.get(key)!.closing += (o.debit || 0) - (o.credit || 0);
                }
            }
        });

        transactions.forEach(t => {
            if (t.particulars) {
                const key = t.particulars.trim().toLowerCase();
                if (accMap.has(key)) {
                    accMap.get(key)!.closing += (t.debit || 0) - (t.credit || 0);
                }
            }
        });

        const balancesByPartyId: Record<string, number> = {};
        parties.forEach(p => {
            const mappedAccountName = Object.keys(mappings).find(key => mappings[key] === p.id);
            const accountName = mappedAccountName || p.name;
            if (accountName) {
                const key = accountName.trim().toLowerCase();
                if (accMap.has(key)) {
                    balancesByPartyId[p.id] = accMap.get(key)!.closing;
                } else {
                    balancesByPartyId[p.id] = 0;
                }
            } else {
                balancesByPartyId[p.id] = 0;
            }
        });

        return balancesByPartyId;
    }, [parties, mappings, openings, transactions]);

    return { partyBalances, mappings, openings, transactions, refresh };
}
