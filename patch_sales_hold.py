import re

with open('src/pages/sales.tsx', 'r') as f:
    content = f.read()

target = r"""        if (vehicleSnap.data().status === 'sold') {
          throw new Error('Ye vehicle already sold ho chuki hai — please refresh inventory.');
        }"""

replacement = r"""        if (vehicleSnap.data().status === 'sold') {
          throw new Error('Ye vehicle already sold ho chuki hai — please refresh inventory.');
        }

        if (vehicleSnap.data().status === 'hold') {
          throw new Error('This chassis is currently on HOLD for a Quotation. Please convert the quotation or cancel it first.');
        }"""

content = content.replace(target, replacement)

# We should also ensure that 'availableVehicles' for the dropdown only shows 'in-stock' ones, or if they are shown, they are appropriately handled.
# Currently `availableVehicles` is likely defined. Let's find it.
with open('src/pages/sales.tsx', 'w') as f:
    f.write(content)
