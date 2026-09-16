import re

with open("src/pages/emi-management.tsx", "r") as f:
    content = f.read()

if "import FollowUpModal" not in content:
    content = content.replace("import { ProcessDocumentSheet } from '@/components/ProcessDocumentSheet';", 
                              "import { ProcessDocumentSheet } from '@/components/ProcessDocumentSheet';\nimport FollowUpModal from '@/components/FollowUpModal';")

with open("src/pages/emi-management.tsx", "w") as f:
    f.write(content)
