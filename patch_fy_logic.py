import re

with open('src/components/TallyStatementModal.tsx', 'r') as f:
    content = f.read()

# 1. Update running balance initialization
target_bal = r'''  // Initialize running balance
  let currentBalance = 0;
  if \(accountInfo\?\.openingBalance\) \{
     currentBalance = accountInfo\.openingBalanceType === 'Cr' 
        \? -parseAmt\(accountInfo\.openingBalance\) 
        : parseAmt\(accountInfo\.openingBalance\);
  \}'''

replacement_bal = r'''  // Initialize running balance based on FY selection
  let currentBalance = 0;
  let activeOpBal = selectedFyId && fyAccountData ? (fyAccountData.openingBalance || 0) : (accountInfo?.openingBalance || 0);
  let activeOpBalType = selectedFyId && fyAccountData ? (fyAccountData.openingBalanceType || '') : (accountInfo?.openingBalanceType || '');
  
  if (activeOpBal) {
     currentBalance = activeOpBalType === 'Cr' 
        ? -parseAmt(activeOpBal) 
        : parseAmt(activeOpBal);
  }'''

content = re.sub(target_bal, replacement_bal, content)

# 2. Update PDF Generation Opening Balance Row
target_pdf_op = r'''                          <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #e2e8f0; text-align: right;" colspan="3">OPENING BALANCE</td>
                          <td style="padding: 12px; text-align: center; border-bottom: 1px solid #e2e8f0;">-</td>
                          <td style="padding: 12px; text-align: center; border-bottom: 1px solid #e2e8f0;">-</td>
                          <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #2563eb;">\$\{formatAmt\(accountInfo\?\.openingBalance\)\} \$\{accountInfo\?\.openingBalanceType \?\? ''\}</td>'''

replacement_pdf_op = r'''                          <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #e2e8f0; text-align: right;" colspan="3">OPENING BALANCE</td>
                          <td style="padding: 12px; text-align: center; border-bottom: 1px solid #e2e8f0;">-</td>
                          <td style="padding: 12px; text-align: center; border-bottom: 1px solid #e2e8f0;">-</td>
                          <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #2563eb;">${formatAmt(activeOpBal)} ${activeOpBalType}</td>'''

content = re.sub(target_pdf_op, replacement_pdf_op, content)

# 3. Update PDF Generation Totals Row
target_pdf_tot = r'''                          <td style="padding: 12px; font-weight: bold; text-align: right; border-bottom: 2px solid #334155; font-size: 14px;" colspan="3">TOTALS & CLOSING BALANCE</td>
                          <td style="padding: 12px; text-align: right; border-bottom: 2px solid #334155; font-weight: bold; color: #059669;">\$\{formatAmt\(accountInfo\?\.totalDebit\)\}</td>
                          <td style="padding: 12px; text-align: right; border-bottom: 2px solid #334155; font-weight: bold; color: #e11d48;">\$\{formatAmt\(accountInfo\?\.totalCredit\)\}</td>
                          <td style="padding: 12px; text-align: right; border-bottom: 2px solid #334155; font-weight: bold; color: #2563eb;">\$\{formatAmt\(accountInfo\?\.closingBalance\)\} \$\{accountInfo\?\.closingBalanceType \?\? ''\}</td>'''

replacement_pdf_tot = r'''                          <td style="padding: 12px; font-weight: bold; text-align: right; border-bottom: 2px solid #334155; font-size: 14px;" colspan="3">TOTALS & CLOSING BALANCE</td>
                          <td style="padding: 12px; text-align: right; border-bottom: 2px solid #334155; font-weight: bold; color: #059669;">${formatAmt(selectedFyId && fyAccountData ? (fyAccountData.totalDebit || 0) : accountInfo?.totalDebit)}</td>
                          <td style="padding: 12px; text-align: right; border-bottom: 2px solid #334155; font-weight: bold; color: #e11d48;">${formatAmt(selectedFyId && fyAccountData ? (fyAccountData.totalCredit || 0) : accountInfo?.totalCredit)}</td>
                          <td style="padding: 12px; text-align: right; border-bottom: 2px solid #334155; font-weight: bold; color: #2563eb;">${formatAmt(selectedFyId && fyAccountData ? (fyAccountData.closingBalance || 0) : accountInfo?.closingBalance)} ${selectedFyId && fyAccountData ? (fyAccountData.closingBalanceType || '') : (accountInfo?.closingBalanceType || '')}</td>'''

content = re.sub(target_pdf_tot, replacement_pdf_tot, content)

# 4. Update UI Opening Balance Row
target_ui_op = r'''                        <TableCell colSpan=\{4\} className="text-right font-black text-slate-700 dark:text-slate-300">
                          OPENING BALANCE
                        </TableCell>
                        <TableCell className="text-center text-slate-400">-</TableCell>
                        <TableCell className="text-center text-slate-400">-</TableCell>
                        <TableCell className="text-right font-black text-blue-600 dark:text-blue-400 font-mono">
                          \{formatAmt\(accountInfo\?\.openingBalance\)\} \{accountInfo\?\.openingBalanceType \?\? ''\}
                        </TableCell>'''

replacement_ui_op = r'''                        <TableCell colSpan={4} className="text-right font-black text-slate-700 dark:text-slate-300">
                          OPENING BALANCE
                        </TableCell>
                        <TableCell className="text-center text-slate-400">-</TableCell>
                        <TableCell className="text-center text-slate-400">-</TableCell>
                        <TableCell className="text-right font-black text-blue-600 dark:text-blue-400 font-mono">
                          {formatAmt(activeOpBal)} {activeOpBalType}
                        </TableCell>'''

content = re.sub(target_ui_op, replacement_ui_op, content)

# 5. Update UI Totals Row
target_ui_tot = r'''                          <TableCell colSpan=\{4\} className="text-right font-black text-slate-900 dark:text-white py-4 text-sm">
                            TOTALS & CLOSING BALANCE
                          </TableCell>
                          <TableCell className="text-right font-black text-emerald-600 font-mono py-4 text-xs">
                            \{formatAmt\(accountInfo\?\.totalDebit\)\}
                          </TableCell>
                          <TableCell className="text-right font-black text-rose-600 font-mono py-4 text-xs">
                            \{formatAmt\(accountInfo\?\.totalCredit\)\}
                          </TableCell>
                          <TableCell className="text-right font-black text-blue-600 dark:text-blue-400 font-mono py-4 text-sm">
                            \{formatAmt\(accountInfo\?\.closingBalance\)\} \{accountInfo\?\.closingBalanceType \?\? ''\}
                          </TableCell>'''

replacement_ui_tot = r'''                          <TableCell colSpan={4} className="text-right font-black text-slate-900 dark:text-white py-4 text-sm">
                            TOTALS & CLOSING BALANCE
                          </TableCell>
                          <TableCell className="text-right font-black text-emerald-600 font-mono py-4 text-xs">
                            {formatAmt(selectedFyId && fyAccountData ? (fyAccountData.totalDebit || 0) : accountInfo?.totalDebit)}
                          </TableCell>
                          <TableCell className="text-right font-black text-rose-600 font-mono py-4 text-xs">
                            {formatAmt(selectedFyId && fyAccountData ? (fyAccountData.totalCredit || 0) : accountInfo?.totalCredit)}
                          </TableCell>
                          <TableCell className="text-right font-black text-blue-600 dark:text-blue-400 font-mono py-4 text-sm">
                            {formatAmt(selectedFyId && fyAccountData ? (fyAccountData.closingBalance || 0) : accountInfo?.closingBalance)} {selectedFyId && fyAccountData ? (fyAccountData.closingBalanceType || '') : (accountInfo?.closingBalanceType || '')}
                          </TableCell>'''

content = re.sub(target_ui_tot, replacement_ui_tot, content)

with open('src/components/TallyStatementModal.tsx', 'w') as f:
    f.write(content)
