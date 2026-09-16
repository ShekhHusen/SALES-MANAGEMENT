import re

with open('src/components/TallyStatementModal.tsx', 'r') as f:
    content = f.read()

target_bal = r'''  // Initialize running balance based on FY data if available, fallback to global
  let currentBalance = 0;
  let opBal = fyAccountData\?\.openingBalance \?\? accountInfo\?\.openingBalance \?\? 0;
  let opBalType = fyAccountData\?\.openingBalanceType \?\? accountInfo\?\.openingBalanceType \?\? '';'''

replacement_bal = r'''  // Initialize running balance based on FY data if available
  let currentBalance = 0;
  let opBal = selectedFyId ? (fyAccountData?.openingBalance || 0) : (accountInfo?.openingBalance || 0);
  let opBalType = selectedFyId ? (fyAccountData?.openingBalanceType || '') : (accountInfo?.openingBalanceType || '');'''

content = re.sub(target_bal, replacement_bal, content)

target_pdf_total = r'''                          <td style="padding: 12px; text-align: right; border-bottom: 2px solid #334155; font-weight: bold; color: #059669;">\$\{formatAmt\(fyAccountData\?\.totalDebit \?\? accountInfo\?\.totalDebit\)\}</td>
                          <td style="padding: 12px; text-align: right; border-bottom: 2px solid #334155; font-weight: bold; color: #e11d48;">\$\{formatAmt\(fyAccountData\?\.totalCredit \?\? accountInfo\?\.totalCredit\)\}</td>
                          <td style="padding: 12px; text-align: right; border-bottom: 2px solid #334155; font-weight: bold; color: #2563eb;">\$\{formatAmt\(fyAccountData\?\.closingBalance \?\? accountInfo\?\.closingBalance\)\} \$\{fyAccountData\?\.closingBalanceType \?\? accountInfo\?\.closingBalanceType \?\? ''\}</td>'''

replacement_pdf_total = r'''                          <td style="padding: 12px; text-align: right; border-bottom: 2px solid #334155; font-weight: bold; color: #059669;">${formatAmt(selectedFyId ? (fyAccountData?.totalDebit || 0) : accountInfo?.totalDebit)}</td>
                          <td style="padding: 12px; text-align: right; border-bottom: 2px solid #334155; font-weight: bold; color: #e11d48;">${formatAmt(selectedFyId ? (fyAccountData?.totalCredit || 0) : accountInfo?.totalCredit)}</td>
                          <td style="padding: 12px; text-align: right; border-bottom: 2px solid #334155; font-weight: bold; color: #2563eb;">${formatAmt(selectedFyId ? (fyAccountData?.closingBalance || 0) : accountInfo?.closingBalance)} ${selectedFyId ? (fyAccountData?.closingBalanceType || '') : (accountInfo?.closingBalanceType || '')}</td>'''

content = re.sub(target_pdf_total, replacement_pdf_total, content)

target_ui_total = r'''                            <TableCell className="text-right font-black text-emerald-600 font-mono py-4 text-xs">
                              \{formatAmt\(fyAccountData\?\.totalDebit \?\? accountInfo\?\.totalDebit\)\}
                            </TableCell>
                            <TableCell className="text-right font-black text-rose-600 font-mono py-4 text-xs">
                              \{formatAmt\(fyAccountData\?\.totalCredit \?\? accountInfo\?\.totalCredit\)\}
                            </TableCell>
                            <TableCell className="text-right font-black text-blue-600 dark:text-blue-400 font-mono py-4 text-sm">
                              \{formatAmt\(fyAccountData\?\.closingBalance \?\? accountInfo\?\.closingBalance\)\} \{fyAccountData\?\.closingBalanceType \?\? accountInfo\?\.closingBalanceType \?\? ''\}
                            </TableCell>'''

replacement_ui_total = r'''                            <TableCell className="text-right font-black text-emerald-600 font-mono py-4 text-xs">
                              {formatAmt(selectedFyId ? (fyAccountData?.totalDebit || 0) : accountInfo?.totalDebit)}
                            </TableCell>
                            <TableCell className="text-right font-black text-rose-600 font-mono py-4 text-xs">
                              {formatAmt(selectedFyId ? (fyAccountData?.totalCredit || 0) : accountInfo?.totalCredit)}
                            </TableCell>
                            <TableCell className="text-right font-black text-blue-600 dark:text-blue-400 font-mono py-4 text-sm">
                              {formatAmt(selectedFyId ? (fyAccountData?.closingBalance || 0) : accountInfo?.closingBalance)} {selectedFyId ? (fyAccountData?.closingBalanceType || '') : (accountInfo?.closingBalanceType || '')}
                            </TableCell>'''

content = re.sub(target_ui_total, replacement_ui_total, content)

with open('src/components/TallyStatementModal.tsx', 'w') as f:
    f.write(content)

