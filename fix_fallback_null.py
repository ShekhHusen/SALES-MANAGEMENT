import re

with open('src/components/TallyStatementModal.tsx', 'r') as f:
    content = f.read()

target1 = r'''  let activeOpBal = selectedFyId && fyAccountData \? \(fyAccountData\.openingBalance \|\| 0\) : \(accountInfo\?\.openingBalance \|\| 0\);'''
replacement1 = r'''  let activeOpBal = selectedFyId ? (fyAccountData?.openingBalance || 0) : (accountInfo?.openingBalance || 0);'''

target2 = r'''  let activeOpBalType = selectedFyId && fyAccountData \? \(fyAccountData\.openingBalanceType \|\| ''\) : \(accountInfo\?\.openingBalanceType \|\| ''\);'''
replacement2 = r'''  let activeOpBalType = selectedFyId ? (fyAccountData?.openingBalanceType || '') : (accountInfo?.openingBalanceType || '');'''

content = re.sub(target1, replacement1, content)
content = re.sub(target2, replacement2, content)

with open('src/components/TallyStatementModal.tsx', 'w') as f:
    f.write(content)
