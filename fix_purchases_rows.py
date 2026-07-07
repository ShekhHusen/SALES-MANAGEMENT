import re

with open('src/pages/purchases.tsx', 'r') as f:
    c = f.read()

# 1. Update currentChassisEntries state to include _id
c = c.replace('const [currentChassisEntries, setCurrentChassisEntries] = useState<Partial<Vehicle>[]>([]);', 'const [currentChassisEntries, setCurrentChassisEntries] = useState<(Partial<Vehicle> & { _id?: string })[]>([]);')

# 2. Update addChassisRow
old_add = """  const addChassisRow = () => {
    setCurrentChassisEntries([...currentChassisEntries, { 
      chassisNumber: '', 
      companyId: '', 
      modelId: '', 
      color: 'White',
      bluebookStatus: 'Not Received',
      naamsariStatus: 'Pending',
      status: 'in-stock'
    }]);
  };"""
new_add = """  const addChassisRow = () => {
    setCurrentChassisEntries(prev => [...prev, { 
      _id: Math.random().toString(36).substr(2, 9),
      chassisNumber: '', 
      companyId: '', 
      modelId: '', 
      color: 'White',
      bluebookStatus: 'Not Received',
      naamsariStatus: 'Pending',
      status: 'in-stock'
    }]);
  };"""
c = c.replace(old_add, new_add)

# 3. Update openEditPurchase to add _id
old_open_edit = """    const entries = (purchase.chassisNumbers || []).map(chassis => {
       const v = allVehicles.find(veh => veh.chassisNumber === chassis);
       if (v) {
         return v;
       }
       return { chassisNumber: chassis, status: 'in-stock' } as Partial<Vehicle>;
    });"""
new_open_edit = """    const entries = (purchase.chassisNumbers || []).map(chassis => {
       const v = allVehicles.find(veh => veh.chassisNumber === chassis);
       if (v) {
         return { ...v, _id: Math.random().toString(36).substr(2, 9) };
       }
       return { _id: Math.random().toString(36).substr(2, 9), chassisNumber: chassis, status: 'in-stock' } as Partial<Vehicle> & { _id?: string };
    });"""
c = c.replace(old_open_edit, new_open_edit)

# 4. Update the key in the mapping
c = c.replace('{currentChassisEntries.map((entry, index) => (\n                    <TableRow key={index}', '{currentChassisEntries.map((entry, index) => (\n                    <TableRow key={entry._id || index}')

with open('src/pages/purchases.tsx', 'w') as f:
    f.write(c)

