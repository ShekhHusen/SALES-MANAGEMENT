import re

with open('src/components/TallyStatementModal.tsx', 'r') as f:
    content = f.read()

# Add states for FY
state_pattern = r'const \[loading, setLoading\] = useState\(false\);'
new_state = r'''const [loading, setLoading] = useState(false);
  const [fiscalYears, setFiscalYears] = useState<any[]>([]);
  const [selectedFyId, setSelectedFyId] = useState<string>('');
  const [fyAccountData, setFyAccountData] = useState<any>(null);'''
content = re.sub(state_pattern, new_state, content)

# Modify useEffect and add fetchFY
use_effect_pattern = r'''  useEffect\(\(\) => \{
    if \(open && tallyAccountId\) \{
      fetchData\(\);
    \}
  \}, \[open, tallyAccountId\]\);'''

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
      // Sort by startDate descending
      fys.sort((a, b) => {
        const dateA = new Date(a.startDate || 0).getTime();
        const dateB = new Date(b.startDate || 0).getTime();
        return dateB - dateA;
      });
      setFiscalYears(fys);
      if (fys.length > 0 && !selectedFyId) {
        // Select current FY based on today's date if possible, else the latest
        const today = new Date().toISOString().split('T')[0];
        const currentFy = fys.find(fy => fy.startDate <= today && fy.endDate >= today);
        setSelectedFyId(currentFy ? currentFy.id : fys[0].id);
      }
    } catch (e) {
      console.error("Error fetching fiscal years:", e);
    }
  };'''
content = content.replace(use_effect_pattern, new_use_effect)

# Modify fetchData to fetch fy data and filter transactions
fetch_data_pattern = r'''      let accName = '';
      const accDoc = await getDoc\(doc\(tallyDb, 'accounts', tallyAccountId!\)\);
      if \(accDoc.exists\(\)\) \{
        const data = accDoc.data\(\);
        accName = data.name;
        setAccountInfo\(\{ id: accDoc.id, ...data \}\);
      \}

      if \(accName\) \{'''

new_fetch_data = r'''      let accName = '';
      const accDoc = await getDoc(doc(tallyDb, 'accounts', tallyAccountId!));
      if (accDoc.exists()) {
        const data = accDoc.data();
        accName = data.name;
        setAccountInfo({ id: accDoc.id, ...data });
      }

      // Fetch FY specific account data
      if (selectedFyId) {
        const fyAccDoc = await getDoc(doc(tallyDb, `accounts/${tallyAccountId}/fiscalYears`, selectedFyId));
        if (fyAccDoc.exists()) {
          setFyAccountData(fyAccDoc.data());
        } else {
          setFyAccountData(null);
        }
      }

      if (accName) {'''
content = re.sub(fetch_data_pattern, new_fetch_data, content)


# Filter transactions by selected FY date
tx_sort_pattern = r'''        // Sort by date ASCENDING for correct running balance calculation
        const sortedTxs = Array.from\(txMap.values\(\)\).sort\(\(a, b\) => \{
          const dateA = new Date\(a.date \|\| 0\).getTime\(\);
          const dateB = new Date\(b.date \|\| 0\).getTime\(\);
          return dateA - dateB;
        \}\);

        setTransactions\(sortedTxs\);'''

new_tx_sort = r'''        // Filter by FY dates
        let filteredTxs = Array.from(txMap.values());
        const selectedFy = fiscalYears.find(f => f.id === selectedFyId);
        if (selectedFy) {
          filteredTxs = filteredTxs.filter((tx: any) => {
            const txDate = tx.date || '';
            return txDate >= (selectedFy.startDate || '') && txDate <= (selectedFy.endDate || '9999-99-99');
          });
        }

        // Sort by date ASCENDING for correct running balance calculation
        const sortedTxs = filteredTxs.sort((a: any, b: any) => {
          const dateA = new Date(a.date || 0).getTime();
          const dateB = new Date(b.date || 0).getTime();
          return dateA - dateB;
        });

        setTransactions(sortedTxs);'''
content = re.sub(tx_sort_pattern, new_tx_sort, content)


# Modify current balance initialization
balance_pattern = r'''  // Initialize running balance
  let currentBalance = 0;
  if \(accountInfo\?\.openingBalance\) \{ 
     currentBalance = accountInfo\.openingBalanceType === 'Cr' 
         \? -parseAmt\(accountInfo\.openingBalance\) 
         : parseAmt\(accountInfo\.openingBalance\);
  \}'''

new_balance = r'''  // Initialize running balance based on FY data if available, fallback to global
  let currentBalance = 0;
  let opBal = fyAccountData?.openingBalance ?? accountInfo?.openingBalance ?? 0;
  let opBalType = fyAccountData?.openingBalanceType ?? accountInfo?.openingBalanceType ?? '';

  if (opBal) { 
     currentBalance = opBalType === 'Cr' 
         ? -parseAmt(opBal) 
         : parseAmt(opBal);
  }'''
content = re.sub(balance_pattern, new_balance, content)


# Modify generatePDF opening balance
pdf_balance_pattern = r'''    let currentBal = accountInfo\?\.openingBalanceType === 'Cr' 
       \? -parseAmt\(accountInfo\?\.openingBalance\) 
       : parseAmt\(accountInfo\?\.openingBalance\);'''
new_pdf_balance = r'''    let currentBal = opBalType === 'Cr' 
       ? -parseAmt(opBal) 
       : parseAmt(opBal);'''
content = re.sub(pdf_balance_pattern, new_pdf_balance, content)

pdf_total_pattern = r'''                          <td style="padding: 12px; text-align: right; border-bottom: 2px solid #334155; font-weight: bold; color: #059669;">\$\{formatAmt\(accountInfo\?\.totalDebit\)\}</td>
                          <td style="padding: 12px; text-align: right; border-bottom: 2px solid #334155; font-weight: bold; color: #e11d48;">\$\{formatAmt\(accountInfo\?\.totalCredit\)\}</td>
                          <td style="padding: 12px; text-align: right; border-bottom: 2px solid #334155; font-weight: bold; color: #2563eb;">\$\{formatAmt\(accountInfo\?\.closingBalance\)\} \$\{accountInfo\?\.closingBalanceType \|\| ''\}</td>'''

new_pdf_total = r'''                          <td style="padding: 12px; text-align: right; border-bottom: 2px solid #334155; font-weight: bold; color: #059669;">${formatAmt(fyAccountData?.totalDebit ?? accountInfo?.totalDebit)}</td>
                          <td style="padding: 12px; text-align: right; border-bottom: 2px solid #334155; font-weight: bold; color: #e11d48;">${formatAmt(fyAccountData?.totalCredit ?? accountInfo?.totalCredit)}</td>
                          <td style="padding: 12px; text-align: right; border-bottom: 2px solid #334155; font-weight: bold; color: #2563eb;">${formatAmt(fyAccountData?.closingBalance ?? accountInfo?.closingBalance)} ${fyAccountData?.closingBalanceType ?? accountInfo?.closingBalanceType ?? ''}</td>'''
content = re.sub(pdf_total_pattern, new_pdf_total, content)


pdf_header_pattern = r'''              <div style="font-size: 13px; color: #64748b; margin-top: 4px;">As of \$\{new Date\(\)\.toLocaleDateString\('en-IN', \{ day: 'numeric', month: 'short', year: 'numeric' \}\)\}</div>'''
new_pdf_header = r'''              <div style="font-size: 13px; color: #64748b; margin-top: 4px;">
                ${fiscalYears.find(f => f.id === selectedFyId)?.name ? `Fiscal Year: ${fiscalYears.find(f => f.id === selectedFyId)?.name}` : `As of ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
              </div>'''
content = re.sub(pdf_header_pattern, new_pdf_header, content)

pdf_table_op = r'''                          <td style="padding: 12px; text-align: right; color: #059669; font-weight: bold;">\$\{accountInfo\?\.openingBalanceType === 'Dr' \? formatAmt\(accountInfo\?\.openingBalance\) : '-'\}</td>
                          <td style="padding: 12px; text-align: right; color: #e11d48; font-weight: bold;">\$\{accountInfo\?\.openingBalanceType === 'Cr' \? formatAmt\(accountInfo\?\.openingBalance\) : '-'\}</td>
                          <td style="padding: 12px; text-align: right; font-weight: bold;">\$\{formatAmt\(accountInfo\?\.openingBalance\)\} \$\{accountInfo\?\.openingBalanceType \|\| ''\}</td>'''

new_pdf_table_op = r'''                          <td style="padding: 12px; text-align: right; color: #059669; font-weight: bold;">${opBalType === 'Dr' ? formatAmt(opBal) : '-'}</td>
                          <td style="padding: 12px; text-align: right; color: #e11d48; font-weight: bold;">${opBalType === 'Cr' ? formatAmt(opBal) : '-'}</td>
                          <td style="padding: 12px; text-align: right; font-weight: bold;">${formatAmt(opBal)} ${opBalType}</td>'''
content = re.sub(pdf_table_op, new_pdf_table_op, content)


# UI Updates
ui_header_pattern = r'''              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800 shadow-sm px-3 py-1 font-bold">
                Tally Connected
              </Badge>'''
new_ui_header = r'''              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800 shadow-sm px-3 py-1 font-bold">
                Tally Connected
              </Badge>
              {fiscalYears.length > 0 && (
                <div className="relative">
                  <select
                    value={selectedFyId}
                    onChange={(e) => setSelectedFyId(e.target.value)}
                    className="appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-sm"
                  >
                    {fiscalYears.map(fy => (
                      <option key={fy.id} value={fy.id}>{fy.name || fy.id}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              )}'''
content = re.sub(ui_header_pattern, new_ui_header, content)


ui_op_bal = r'''                            <TableCell className="text-right font-black text-emerald-600 font-mono text-xs pt-4">
                              \{accountInfo\?\.openingBalanceType === 'Dr' \? formatAmt\(accountInfo\?\.openingBalance\) : '-'\}
                            </TableCell>
                            <TableCell className="text-right font-black text-rose-600 font-mono text-xs pt-4">
                              \{accountInfo\?\.openingBalanceType === 'Cr' \? formatAmt\(accountInfo\?\.openingBalance\) : '-'\}
                            </TableCell>
                            <TableCell className="text-right font-black text-slate-700 dark:text-slate-300 font-mono text-xs pt-4">
                              \{formatAmt\(accountInfo\?\.openingBalance\)\} \{accountInfo\?\.openingBalanceType \|\| ''\}
                            </TableCell>'''

new_ui_op_bal = r'''                            <TableCell className="text-right font-black text-emerald-600 font-mono text-xs pt-4">
                              {opBalType === 'Dr' ? formatAmt(opBal) : '-'}
                            </TableCell>
                            <TableCell className="text-right font-black text-rose-600 font-mono text-xs pt-4">
                              {opBalType === 'Cr' ? formatAmt(opBal) : '-'}
                            </TableCell>
                            <TableCell className="text-right font-black text-slate-700 dark:text-slate-300 font-mono text-xs pt-4">
                              {formatAmt(opBal)} {opBalType}
                            </TableCell>'''
content = re.sub(ui_op_bal, new_ui_op_bal, content)

ui_totals = r'''                            <TableCell className="text-right font-black text-emerald-600 font-mono py-4 text-xs">
                              \{formatAmt\(accountInfo\?\.totalDebit\)\}
                            </TableCell>
                            <TableCell className="text-right font-black text-rose-600 font-mono py-4 text-xs">
                              \{formatAmt\(accountInfo\?\.totalCredit\)\}
                            </TableCell>
                            <TableCell className="text-right font-black text-blue-600 dark:text-blue-400 font-mono py-4 text-sm">
                              \{formatAmt\(accountInfo\?\.closingBalance\)\} \{accountInfo\?\.closingBalanceType \|\| ''\}
                            </TableCell>'''

new_ui_totals = r'''                            <TableCell className="text-right font-black text-emerald-600 font-mono py-4 text-xs">
                              {formatAmt(fyAccountData?.totalDebit ?? accountInfo?.totalDebit)}
                            </TableCell>
                            <TableCell className="text-right font-black text-rose-600 font-mono py-4 text-xs">
                              {formatAmt(fyAccountData?.totalCredit ?? accountInfo?.totalCredit)}
                            </TableCell>
                            <TableCell className="text-right font-black text-blue-600 dark:text-blue-400 font-mono py-4 text-sm">
                              {formatAmt(fyAccountData?.closingBalance ?? accountInfo?.closingBalance)} {fyAccountData?.closingBalanceType ?? accountInfo?.closingBalanceType ?? ''}
                            </TableCell>'''
content = re.sub(ui_totals, new_ui_totals, content)


with open('src/components/TallyStatementModal.tsx', 'w') as f:
    f.write(content)

