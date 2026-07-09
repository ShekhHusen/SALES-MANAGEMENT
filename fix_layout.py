import re

with open('src/components/layout.tsx', 'r') as f:
    c = f.read()

c = c.replace("import { FollowUpNotifier } from '@/components/FollowUpNotifier';", "")
c = c.replace("<FollowUpNotifier />", "")
c = c.replace("{ label: 'Follow-ups', icon: BellRing, path: '/follow-ups', roles: ['admin', 'sales_manager'] },", "")
c = c.replace("{ label: 'Internal Accounts', icon: BookOpen, path: '/internal-accounts', roles: ['admin', 'sales_manager'] },", "")

with open('src/components/layout.tsx', 'w') as f:
    f.write(c)

