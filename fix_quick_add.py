import re

with open('src/components/QuickAdd.tsx', 'r') as f:
    c = f.read()

c = c.replace('export function QuickAddVehicle({ onAdded }: { onAdded?: (chassis: string) => void }) {', 'export function QuickAddVehicle({ onAdded }: { onAdded?: (chassis: string, vehicleData?: any) => void }) {')
c = c.replace('if (onAdded) onAdded(chassisUpper);', 'if (onAdded) onAdded(chassisUpper, vehicleData);')

with open('src/components/QuickAdd.tsx', 'w') as f:
    f.write(c)

with open('src/pages/purchases.tsx', 'r') as f:
    p = f.read()

old_quick_add = """               <QuickAddVehicle onAdded={(chassis) => {
                 setTargetRowIndex(currentChassisEntries.length);
                 addChassisRow();
                 setSearchQuery(chassis);
                 setIsSelectorOpen(true);
               }} />"""
new_quick_add = """               <QuickAddVehicle onAdded={(chassis, vehicleData) => {
                 if (vehicleData) {
                    setCurrentChassisEntries(prev => [...prev, {
                      ...vehicleData,
                      _id: Math.random().toString(36).substr(2, 9)
                    }]);
                 } else {
                    setTargetRowIndex(currentChassisEntries.length);
                    addChassisRow();
                    setSearchQuery(chassis);
                    setIsSelectorOpen(true);
                 }
               }} />"""

p = p.replace(old_quick_add, new_quick_add)

with open('src/pages/purchases.tsx', 'w') as f:
    f.write(p)

