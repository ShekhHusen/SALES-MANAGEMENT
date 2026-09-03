import re

with open('src/components/TallyStatementModal.tsx', 'r') as f:
    content = f.read()

content = content.replace("{formatAmt(accountInfo?.openingBalance)} {accountInfo?.openingBalanceType || ''}", "{formatAmt(activeOpBal)} {activeOpBalType}")

with open('src/components/TallyStatementModal.tsx', 'w') as f:
    f.write(content)
