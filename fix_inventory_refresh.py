import re

with open('src/pages/inventory.tsx', 'r') as f:
    c = f.read()

# Make sure we import refreshVehicles
if 'refreshVehicles' not in c:
    c = c.replace("const { vehicles, companies, models, colors, purchases, sales } = useGlobalData();", "const { vehicles, companies, models, colors, purchases, sales, refreshVehicles } = useGlobalData();")

# After await setDoc(vehicleRef, vehicleData);
c = c.replace("await setDoc(vehicleRef, vehicleData);", "await setDoc(vehicleRef, vehicleData);\n      await refreshVehicles();")

# After await updateDocStatus(...) success
c = c.replace("toast.success(`Vehicle ${selectedVehicle.chassisNumber} updated successfully`);", "toast.success(`Vehicle ${selectedVehicle.chassisNumber} updated successfully`);\n      await refreshVehicles();")

# After await updateDoc(...) in openEditVehicle
c = c.replace("toast.success('Vehicle updated successfully');", "toast.success('Vehicle updated successfully');\n      await refreshVehicles();")

# Delete
c = c.replace("toast.success('Vehicle deleted successfully');", "toast.success('Vehicle deleted successfully');\n      await refreshVehicles();")


with open('src/pages/inventory.tsx', 'w') as f:
    f.write(c)

