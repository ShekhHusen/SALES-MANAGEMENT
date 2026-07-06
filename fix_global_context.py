import re

with open('src/contexts/GlobalDataContext.tsx', 'r') as f:
    content = f.read()

# Make sure getDocs is imported
if 'getDocs' not in content:
    content = content.replace("import { collection, onSnapshot, query, orderBy } from '@/lib/trackedFirestore';", "import { collection, onSnapshot, query, orderBy, getDocs } from '@/lib/trackedFirestore';")

# We want to add refresh functions to GlobalDataState
state_additions = """
  refreshVehicles: () => Promise<void>;
  refreshParties: () => Promise<void>;
  refreshPurchases: () => Promise<void>;
  refreshSales: () => Promise<void>;
  refreshFollowups: () => Promise<void>;
"""
content = content.replace("loadProcessDocumentData: () => void;\n}", "loadProcessDocumentData: () => void;" + state_additions + "\n}")

initial_additions = """
  refreshVehicles: async () => {},
  refreshParties: async () => {},
  refreshPurchases: async () => {},
  refreshSales: async () => {},
  refreshFollowups: async () => {},
"""
content = content.replace("loadProcessDocumentData: () => {},\n};", "loadProcessDocumentData: () => {}," + initial_additions + "\n};")

# Find the useEffect body
# We will replace all unsubXXX and onSnapshot with load functions using getDocs.

with open('src/contexts/GlobalDataContext.tsx', 'w') as f:
    f.write(content)

