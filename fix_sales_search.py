import re

with open('src/pages/sales.tsx', 'r') as f:
    c = f.read()

bad_search_logic = """(c.contactNumber?.includes || function(){return false;})(customerSearchQuery)"""
good_search_logic = """(c.contactNumber || "").includes(customerSearchQuery)"""

c = c.replace(bad_search_logic, good_search_logic)

with open('src/pages/sales.tsx', 'w') as f:
    f.write(c)

