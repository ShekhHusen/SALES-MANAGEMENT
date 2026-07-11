import re
with open('src/pages/inventory.tsx', 'r') as f:
    c = f.read()

c = c.replace(
    '  const processedVehicles = vehicles.filter(v => {\n      const matchesStatus',
    '''  const processedVehicles = vehicles.filter(v => {
    const sale = sales.find(s => s.chassisNumber === v.chassisNumber);
    const customer = sale ? parties.find(p => p.id === sale.customerId) : null;
    const matchesSearch = !search || v.chassisNumber.toLowerCase().includes(search.toLowerCase()) || (customer?.name?.toLowerCase().includes(search.toLowerCase()) || False);
      const matchesStatus'''
)
with open('src/pages/inventory.tsx', 'w') as f:
    f.write(c)

