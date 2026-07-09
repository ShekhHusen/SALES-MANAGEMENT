import re

with open('src/pages/inventory.tsx', 'r') as f:
    c = f.read()

if "updateLocal" not in c:
    c = c.replace("""const { vehicles, companies, models, colors, parties, purchases, sales, refreshVehicles } = useGlobalData();""", """const { vehicles, companies, models, colors, parties, purchases, sales, addLocal, updateLocal } = useGlobalData();""")

c = c.replace("""      await setDoc(vehicleRef, vehicleData);
      await refreshVehicles();""", """      await setDoc(vehicleRef, vehicleData);
      addLocal('vehicles', { ...vehicleData, id: newVehicle.chassisNumber });""")

c = c.replace("""      toast.success('Vehicle updated successfully');
      await refreshVehicles();""", """      toast.success('Vehicle updated successfully');
      updateLocal('vehicles', originalChassisNumber, vehicleData);""")

with open('src/pages/inventory.tsx', 'w') as f:
    f.write(c)

