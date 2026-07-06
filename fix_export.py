import re
with open('src/pages/parties.tsx', 'r') as f:
    c = f.read()

c = c.replace('const exportRecords = () => {', 'const exportRecords = async () => {')
# Also remove await refreshParties() from exportRecords, we don't need to refresh after export!
c = c.replace("await refreshParties();\n      toast.success('Stakeholder records exported');", "toast.success('Stakeholder records exported');")

with open('src/pages/parties.tsx', 'w') as f:
    f.write(c)

