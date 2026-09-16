with open("src/pages/emi-management.tsx", "r") as f:
    content = f.read()

if "import FollowUpModal" not in content:
    content = content.replace("import { useAuth } from '@/hooks/use-auth';", 
                              "import { useAuth } from '@/hooks/use-auth';\nimport FollowUpModal from '@/components/FollowUpModal';")

with open("src/pages/emi-management.tsx", "w") as f:
    f.write(content)

with open("src/pages/follow-ups.tsx", "r") as f:
    content = f.read()

content = content.replace("<AccountStatementModal ", "<TallyStatementModal ")

# Handle the TallyStatementModal properly in follow-ups.tsx
import re
content = re.sub(r"<AccountStatementModal.*?\/>", 
"""<TallyStatementModal 
        open={isStatementOpen}
        onOpenChange={(v: boolean) => { if (!v) { setIsStatementOpen(false); setStatementAccountName(''); } }}
        tallyAccountId={null}
        partyName={statementAccountName}
      />""", content, flags=re.DOTALL)

with open("src/pages/follow-ups.tsx", "w") as f:
    f.write(content)

