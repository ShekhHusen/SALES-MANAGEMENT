import re

with open('src/pages/purchases.tsx', 'r') as f:
    c = f.read()

bad_edit = """    const entries = (purchase.chassisNumbers || []).map(chassis => {
       const v = allVehicles.find(veh => veh.chassisNumber === chassis);
       if (v) {
         return { ...v, _id: Math.random().toString(36).substr(2, 9) };
       }
       return { _id: Math.random().toString(36).substr(2, 9), chassisNumber: chassis, status: 'in-stock' } as Partial<Vehicle> & { _id?: string };
    });"""

good_edit = """    // Get chassis numbers from both the purchase record and vehicles linked to this purchase
    const linkedVehicles = allVehicles.filter(v => v.purchaseId === purchase.id);
    const linkedChassis = linkedVehicles.map(v => v.chassisNumber);
    const allChassisForPurchase = Array.from(new Set([...(purchase.chassisNumbers || []), ...linkedChassis]));

    const entries = allChassisForPurchase.map(chassis => {
       const v = allVehicles.find(veh => veh.chassisNumber === chassis);
       if (v) {
         return { ...v, _id: Math.random().toString(36).substr(2, 9) };
       }
       return { _id: Math.random().toString(36).substr(2, 9), chassisNumber: chassis, status: 'in-stock' } as Partial<Vehicle> & { _id?: string };
    });"""

c = c.replace(bad_edit, good_edit)

with open('src/pages/purchases.tsx', 'w') as f:
    f.write(c)

