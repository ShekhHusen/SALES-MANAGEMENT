import re

with open('src/components/TallyStatementModal.tsx', 'r') as f:
    content = f.read()

# I will replace the fetchData method.
old_fetch = """  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Account Info
      const accDoc = await getDoc(doc(tallyDb, 'accounts', tallyAccountId!));
      if (accDoc.exists()) {
        setAccountInfo({ id: accDoc.id, ...accDoc.data() });
      }

      // Try fetching transactions related to this account
      // We assume there's a field like 'accountId' or 'ledgerId'. 
      // Let's try querying without filter first, then filter locally if needed, 
      // or we just fetch limit 50 to avoid huge reads.
      const q = query(
        collection(tallyDb, 'transactions'), 
        where('accountId', '==', tallyAccountId), 
        limit(100)
      );
      const snap = await getDocs(q).catch(async () => {
        // Fallback: maybe the field is ledgerGuid
        const q2 = query(
          collection(tallyDb, 'transactions'), 
          where('ledgerGuid', '==', tallyAccountId), 
          limit(100)
        );
        return await getDocs(q2).catch(() => null);
      });

      if (snap) {
        const txs: any[] = [];
        snap.forEach(doc => {
          txs.push({ id: doc.id, ...doc.data() });
        });
        setTransactions(txs);
      }
    } catch (e) {
      console.error("Error fetching Tally statement:", e);
    } finally {
      setLoading(false);
    }
  };"""

new_fetch = """  const fetchData = async () => {
    setLoading(true);
    try {
      let accName = '';
      // Fetch Account Info
      const accDoc = await getDoc(doc(tallyDb, 'accounts', tallyAccountId!));
      if (accDoc.exists()) {
        const data = accDoc.data();
        accName = data.name;
        setAccountInfo({ id: accDoc.id, ...data });
      }

      if (accName) {
        // Query where debitAccount == accName OR creditAccount == accName
        const qDebit = query(collection(tallyDb, 'transactions'), where('debitAccount', '==', accName));
        const qCredit = query(collection(tallyDb, 'transactions'), where('creditAccount', '==', accName));
        
        const [snapDebit, snapCredit] = await Promise.all([
          getDocs(qDebit).catch(() => null),
          getDocs(qCredit).catch(() => null)
        ]);

        const txMap = new Map();
        
        if (snapDebit) {
          snapDebit.forEach(doc => txMap.set(doc.id, { id: doc.id, ...doc.data() }));
        }
        if (snapCredit) {
          snapCredit.forEach(doc => txMap.set(doc.id, { id: doc.id, ...doc.data() }));
        }

        // Sort by date descending
        const sortedTxs = Array.from(txMap.values()).sort((a, b) => {
          const dateA = new Date(a.date || 0).getTime();
          const dateB = new Date(b.date || 0).getTime();
          return dateB - dateA;
        });

        setTransactions(sortedTxs);
      }
    } catch (e) {
      console.error("Error fetching Tally statement:", e);
    } finally {
      setLoading(false);
    }
  };"""

content = content.replace(old_fetch, new_fetch)

# Also update the Table rendering
old_table = """                  {transactions.map(tx => (
                    <TableRow key={tx.id}>
                      <TableCell>{tx.date || tx.vchDate || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{tx.vchType || 'N/A'}</Badge>
                        <span className="ml-2 text-xs text-slate-500">{tx.vchNo}</span>
                      </TableCell>
                      <TableCell className="font-medium">{tx.particulars || tx.ledgerName || '-'}</TableCell>
                      <TableCell className="text-right text-emerald-600 font-mono">{tx.debit ? `Rs. ${tx.debit}` : '-'}</TableCell>
                      <TableCell className="text-right text-rose-600 font-mono">{tx.credit ? `Rs. ${tx.credit}` : '-'}</TableCell>
                    </TableRow>
                  ))}"""

new_table = """                  {transactions.map(tx => {
                    const isDebit = tx.debitAccount === accountInfo?.name;
                    const amount = isDebit ? tx.debitAmount : tx.creditAmount;
                    const otherParty = isDebit ? tx.creditAccount : tx.debitAccount;
                    
                    return (
                    <TableRow key={tx.id}>
                      <TableCell className="whitespace-nowrap">{tx.date || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{tx.type || 'N/A'}</Badge>
                        <div className="text-xs text-slate-500 mt-1">{tx.voucherNo}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{otherParty || '-'}</div>
                        {tx.inventory && tx.inventory.length > 0 && (
                          <div className="mt-2 pl-3 border-l-2 border-slate-200 dark:border-slate-700">
                            {tx.inventory.map((inv: any, idx: number) => (
                              <div key={idx} className="text-[10px] text-slate-500">
                                {inv.itemName} - {inv.qty} @ {inv.rate}
                              </div>
                            ))}
                          </div>
                        )}
                        {tx.narration && <div className="text-xs italic text-slate-500 mt-1">{tx.narration}</div>}
                      </TableCell>
                      <TableCell className="text-right text-emerald-600 font-mono">
                        {isDebit ? `Rs. ${amount}` : '-'}
                      </TableCell>
                      <TableCell className="text-right text-rose-600 font-mono">
                        {!isDebit ? `Rs. ${amount}` : '-'}
                      </TableCell>
                    </TableRow>
                  )})}"""

content = content.replace(old_table, new_table)

with open('src/components/TallyStatementModal.tsx', 'w') as f:
    f.write(content)
