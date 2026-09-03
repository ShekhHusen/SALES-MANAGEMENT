import re

with open('src/pages/parties.tsx', 'r') as f:
    content = f.read()

# Fix imports
if 'getDoc' not in content:
    content = re.sub(
        r'import \{ collection, addDoc, Timestamp, updateDoc, doc, deleteDoc \} from \'@/lib/trackedFirestore\';',
        r"import { collection, addDoc, Timestamp, updateDoc, doc, deleteDoc, getDoc } from '@/lib/trackedFirestore';",
        content
    )

# Insert handleViewSale
handle_view_sale_code = r'''  const [viewSale, setViewSale] = useState<any>(null);

  const handleViewSale = async (sale: any) => {
    try {
      const docRef = doc(db, 'otherDetails', sale.id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setViewSale({ ...sale, otherDetails: docSnap.data() as any });
      } else {
        setViewSale(sale);
      }
    } catch (error) {
      console.error("Failed to fetch other details:", error);
      setViewSale(sale);
    }
    setViewSheetOpen(true);
  };
'''

content = content.replace('  const [viewSale, setViewSale] = useState<any>(null);', handle_view_sale_code)

# Replace the onClick logic
target_click = r'''                                onClick={() => {
                                  const latestSale = customerSales.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())[0];
                                  setViewSale(latestSale);
                                  setViewSheetOpen(true);
                                }}'''

replacement_click = r'''                                onClick={() => {
                                  const latestSale = customerSales.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())[0];
                                  handleViewSale(latestSale);
                                }}'''

content = content.replace(target_click, replacement_click)

with open('src/pages/parties.tsx', 'w') as f:
    f.write(content)
