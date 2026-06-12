import { useState, useEffect, useMemo } from 'react';
import { Party } from '@/types';
import { useGlobalData } from '@/contexts/GlobalDataContext';

export function useAccountBalances(parties: Party[]) {
    const { internalOpenings: openings, internalTransactions: transactions, mappings } = useGlobalData();

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

    return { partyBalances, mappings, openings, transactions };
}
