import re

with open('src/pages/process-document.tsx', 'r') as f:
    c = f.read()

bad_pending = """    const searchLow = searchQuery.toLowerCase();
    return s.chassisNumber.toLowerCase().includes(searchLow) || 
           customer?.name.toLowerCase().includes(searchLow) ||
           customer?.contactNumber?.includes(searchLow);"""
           
good_pending = """    const searchLow = searchQuery.toLowerCase();
    return (s.chassisNumber || "").toLowerCase().includes(searchLow) || 
           (customer?.name || "").toLowerCase().includes(searchLow) ||
           (customer?.contactNumber || "").includes(searchLow);"""

c = c.replace(bad_pending, good_pending)

with open('src/pages/process-document.tsx', 'w') as f:
    f.write(c)

