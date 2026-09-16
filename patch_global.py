import re

with open('src/contexts/GlobalDataContext.tsx', 'r') as f:
    content = f.read()

# Add Quotation to imports
if 'Quotation' not in content:
    content = content.replace(
        "import type { Vehicle, Company, Model, Party, Purchase, Sale, VehicleColor, BusinessProfile } from '../types';",
        "import type { Vehicle, Company, Model, Party, Purchase, Sale, VehicleColor, BusinessProfile, Quotation } from '../types';"
    )

# Add quotations to GlobalDataState
if 'quotations: Quotation[];' not in content:
    content = content.replace(
        "sales: Sale[];",
        "sales: Sale[];\n  quotations: Quotation[];"
    )

# Add isQuotationsLoaded and loadQuotations
if 'isQuotationsLoaded: boolean;' not in content:
    content = content.replace(
        "isSalesLoaded: boolean;",
        "isSalesLoaded: boolean;\n  isQuotationsLoaded: boolean;"
    )
if 'loadQuotations: () => void;' not in content:
    content = content.replace(
        "loadSales: () => void;",
        "loadSales: () => void;\n  loadQuotations: () => void;"
    )

# Add states inside GlobalDataProvider
if 'const [quotations, setQuotations] = useState<Quotation[]>([]);' not in content:
    content = content.replace(
        "const [sales, setSales] = useState<Sale[]>([]);",
        "const [sales, setSales] = useState<Sale[]>([]);\n  const [quotations, setQuotations] = useState<Quotation[]>([]);"
    )
if 'const [isQuotationsLoaded, setIsQuotationsLoaded] = useState(false);' not in content:
    content = content.replace(
        "const [isSalesLoaded, setIsSalesLoaded] = useState(false);",
        "const [isSalesLoaded, setIsSalesLoaded] = useState(false);\n  const [isQuotationsLoaded, setIsQuotationsLoaded] = useState(false);"
    )

# Add loadQuotations function
load_quotations = """  const loadQuotations = useCallback(() => {
    if (unsubs.current.quotations) return; // already loaded
    try {
      const qQuery = query(collection(db, 'quotations'), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(qQuery, (snapshot) => {
        setQuotations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quotation)));
        setIsQuotationsLoaded(true);
      }, (error) => {
        console.error("Error listening to quotations:", error);
        setSubscriptionErrors(prev => [...prev, "Failed to listen to quotations"]);
      });
      unsubs.current.quotations = unsub;
    } catch (err) {
      console.error("Error setting up quotations listener:", err);
    }
  }, []);
"""
if 'unsubs.current.quotations = unsub;' not in content:
    content = content.replace(
        "const loadSales = useCallback(() => {",
        load_quotations + "\n  const loadSales = useCallback(() => {"
    )
    # Also add to return value
    content = content.replace(
        "sales,",
        "sales,\n      quotations,"
    )
    content = content.replace(
        "isSalesLoaded,",
        "isSalesLoaded,\n      isQuotationsLoaded,"
    )
    content = content.replace(
        "loadSales,",
        "loadSales,\n      loadQuotations,"
    )

with open('src/contexts/GlobalDataContext.tsx', 'w') as f:
    f.write(content)
