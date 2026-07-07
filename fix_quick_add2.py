import re

with open('src/components/QuickAdd.tsx', 'r') as f:
    c = f.read()

# For QuickAddParty
old_party_start = """export function QuickAddParty({ type, onAdded }: { type: 'vendor' | 'customer', onAdded?: (id: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);"""
new_party_start = """export function QuickAddParty({ type, onAdded }: { type: 'vendor' | 'customer', onAdded?: (id: string) => void }) {
  const { refreshParties } = useGlobalData();
  const [isOpen, setIsOpen] = useState(false);"""

c = c.replace(old_party_start, new_party_start)

old_party_end = """      toast.success(`${type === 'vendor' ? 'Vendor' : 'Customer'} created successfully`);
      if (onAdded) onAdded(docRef.id);"""
new_party_end = """      toast.success(`${type === 'vendor' ? 'Vendor' : 'Customer'} created successfully`);
      await refreshParties();
      if (onAdded) onAdded(docRef.id);"""

c = c.replace(old_party_end, new_party_end)

# For QuickAddVehicle
old_veh_start = """export function QuickAddVehicle({ onAdded }: { onAdded?: (chassis: string, vehicleData?: any) => void }) {
  const { companies, models } = useGlobalData();"""
new_veh_start = """export function QuickAddVehicle({ onAdded }: { onAdded?: (chassis: string, vehicleData?: any) => void }) {
  const { companies, models, refreshVehicles } = useGlobalData();"""

c = c.replace(old_veh_start, new_veh_start)

old_veh_end = """      if (user) {
         logAction(user.uid, user.email || '', 'CREATE', 'Vehicle', chassisUpper, vehicleData);
      }
      toast.success('Vehicle registered successfully');
      if (onAdded) onAdded(chassisUpper, vehicleData);"""
new_veh_end = """      if (user) {
         logAction(user.uid, user.email || '', 'CREATE', 'Vehicle', chassisUpper, vehicleData);
      }
      toast.success('Vehicle registered successfully');
      await refreshVehicles();
      if (onAdded) onAdded(chassisUpper, vehicleData);"""

c = c.replace(old_veh_end, new_veh_end)

with open('src/components/QuickAdd.tsx', 'w') as f:
    f.write(c)

