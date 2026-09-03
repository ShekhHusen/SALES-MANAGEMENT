import re

with open('src/components/TallyStatementModal.tsx', 'r') as f:
    content = f.read()

# Replace selectedFyId && fyAccountData ? (fyAccountData.field || 0) : accountInfo?.field
# with selectedFyId ? (fyAccountData?.field || 0) : accountInfo?.field
content = content.replace("selectedFyId && fyAccountData ? (fyAccountData.totalDebit || 0)", "selectedFyId ? (fyAccountData?.totalDebit || 0)")
content = content.replace("selectedFyId && fyAccountData ? (fyAccountData.totalCredit || 0)", "selectedFyId ? (fyAccountData?.totalCredit || 0)")
content = content.replace("selectedFyId && fyAccountData ? (fyAccountData.closingBalance || 0)", "selectedFyId ? (fyAccountData?.closingBalance || 0)")
content = content.replace("selectedFyId && fyAccountData ? (fyAccountData.closingBalanceType || '')", "selectedFyId ? (fyAccountData?.closingBalanceType || '')")

with open('src/components/TallyStatementModal.tsx', 'w') as f:
    f.write(content)
