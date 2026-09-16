import re

# Fix FollowUpModal.tsx
with open("src/components/FollowUpModal.tsx", "r") as f:
    content = f.read()
content = content.replace("const followUpData = {", "const followUpData: any = {")
with open("src/components/FollowUpModal.tsx", "w") as f:
    f.write(content)

# Fix UpdateFollowUpModal.tsx
with open("src/components/UpdateFollowUpModal.tsx", "r") as f:
    content = f.read()
content = content.replace("const updatePayload = {", "const updatePayload: any = {")
with open("src/components/UpdateFollowUpModal.tsx", "w") as f:
    f.write(content)

# Fix emi-management.tsx
with open("src/pages/emi-management.tsx", "r") as f:
    content = f.read()
content = content.replace("const cust = customers.find(c => c.id === emi.customerId);", "const cust = parties.find((c: any) => c.id === emi.customerId);")
if "import FollowUpModal" not in content:
    # Actually it's imported at the top, but let's check
    pass
with open("src/pages/emi-management.tsx", "w") as f:
    f.write(content)

# Fix sales.tsx
with open("src/pages/sales.tsx", "r") as f:
    content = f.read()
# Remove duplicate import { useAuth }
content = re.sub(r"import \{ useAuth \} from '@/hooks/use-auth';\n", "", content, count=1)
with open("src/pages/sales.tsx", "w") as f:
    f.write(content)

# Fix follow-ups.tsx
with open("src/pages/follow-ups.tsx", "r") as f:
    content = f.read()
content = content.replace("const usersList = snapshot.docs.map(doc => ({", "const usersList: any[] = snapshot.docs.map(doc => ({")
content = content.replace("let data = snapshot.docs.map(doc => ({", "let data: any[] = snapshot.docs.map(doc => ({")
content = content.replace("const usersData = snapshot.docs.map(doc => ({", "const usersData: any[] = snapshot.docs.map(doc => ({")

# Fix TallyStatementModal props
content = content.replace("<TallyStatementModal partyName={statementAccountName} tallyAccountId={null} \n        isOpen={isStatementOpen}\n        onClose={() => { setIsStatementOpen(false); setStatementAccountName(''); }}\n        accountName={statementAccountName}\n      />", 
"<TallyStatementModal \n        open={isStatementOpen}\n        onOpenChange={(v) => { if (!v) { setIsStatementOpen(false); setStatementAccountName(''); } }}\n        tallyAccountId={null}\n        partyName={statementAccountName}\n      />")

with open("src/pages/follow-ups.tsx", "w") as f:
    f.write(content)
