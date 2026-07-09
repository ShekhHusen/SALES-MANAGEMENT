import re

with open('src/App.tsx', 'r') as f:
    c = f.read()

c = c.replace("import { FollowUps } from '@/pages/follow-ups';", "")
c = c.replace("import { InternalAccounts } from '@/pages/internal-accounts';", "")
c = c.replace("<Route path=\"/internal-accounts\" element={<InternalAccounts />} />", "")
c = c.replace("<Route path=\"/follow-ups\" element={<FollowUps />} />", "")

with open('src/App.tsx', 'w') as f:
    f.write(c)

