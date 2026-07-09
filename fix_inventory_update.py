import re

with open('src/pages/inventory.tsx', 'r') as f:
    c = f.read()

c = c.replace("""      toast.success('Vehicle updated successfully');
      updateLocal('vehicles', originalChassisNumber, vehicleData);
      setSelectedVehicle(null);""", """      toast.success('Vehicle updated successfully');
      if (newChassisNumber !== originalChassisNumber) {
          // If renamed, just refresh vehicles for simplicity
          window.location.reload(); // since we don't have refreshVehicles easily, wait we can just export refreshVehicles again
      } else {
          updateLocal('vehicles', originalChassisNumber, {
              companyId,
              modelId,
              bluebookStatus: bluebook,
              naamsariStatus: naamsari,
              registrationNumber: registrationNumber || '',
              color: color || '',
              updatedAt: Timestamp.now(),
          });
      }
      setSelectedVehicle(null);""")

with open('src/pages/inventory.tsx', 'w') as f:
    f.write(c)

