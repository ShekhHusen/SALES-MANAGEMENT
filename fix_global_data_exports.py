import re

with open('src/contexts/GlobalDataContext.tsx', 'r') as f:
    c = f.read()

c = c.replace("""  refreshSales: () => Promise<void>;
  refreshFollowups: () => Promise<void>;
  
  // Local merge operations""", """  refreshVehicles: () => Promise<void>;
  refreshSales: () => Promise<void>;
  refreshFollowups: () => Promise<void>;
  
  // Local merge operations""")

c = c.replace("""      refreshSales,
      refreshFollowups,
      addLocal,""", """      refreshVehicles,
      refreshSales,
      refreshFollowups,
      addLocal,""")

with open('src/contexts/GlobalDataContext.tsx', 'w') as f:
    f.write(c)


with open('src/pages/inventory.tsx', 'r') as f:
    c = f.read()

c = c.replace("""const { vehicles, companies, models, colors, parties, purchases, sales, addLocal, updateLocal } = useGlobalData();""", """const { vehicles, companies, models, colors, parties, purchases, sales, addLocal, updateLocal, refreshVehicles } = useGlobalData();""")

c = c.replace("""      toast.success('Vehicle updated successfully');
      if (newChassisNumber !== originalChassisNumber) {
          // If renamed, just refresh vehicles for simplicity
          window.location.reload(); // since we don't have refreshVehicles easily, wait we can just export refreshVehicles again
      } else {""", """      toast.success('Vehicle updated successfully');
      if (newChassisNumber !== originalChassisNumber) {
          await refreshVehicles();
      } else {""")

with open('src/pages/inventory.tsx', 'w') as f:
    f.write(c)

