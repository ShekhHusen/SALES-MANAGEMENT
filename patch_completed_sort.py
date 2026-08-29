import re

with open('src/pages/process-document.tsx', 'r') as f:
    content = f.read()

# Current pagination logic:
#   const completedTotalItems = filteredCompletedSales.length;
#   const completedTotalPages = completedItemsPerPage === 'all' ? 1 : Math.ceil(completedTotalItems / (completedItemsPerPage as number));
#   
#   const currentCompletedSales = completedItemsPerPage === 'all'
#     ? filteredCompletedSales
#     : filteredCompletedSales.slice((completedCurrentPage - 1) * (completedItemsPerPage as number), completedCurrentPage * (completedItemsPerPage as number));

old_block = """  const completedTotalItems = filteredCompletedSales.length;
  const completedTotalPages = completedItemsPerPage === 'all' ? 1 : Math.ceil(completedTotalItems / (completedItemsPerPage as number));
  
  const currentCompletedSales = completedItemsPerPage === 'all'
    ? filteredCompletedSales
    : filteredCompletedSales.slice((completedCurrentPage - 1) * (completedItemsPerPage as number), completedCurrentPage * (completedItemsPerPage as number));"""

new_block = """  // Sort Completed Vehicles
  const sortedCompletedSales = [...filteredCompletedSales].sort((a, b) => {
    let aVal: any = a[completedSortConfig.key as keyof typeof a];
    let bVal: any = b[completedSortConfig.key as keyof typeof b];
    
    if (completedSortConfig.key === 'customerName') {
      aVal = customers.find(c => c.id === a.customerId)?.name || '';
      bVal = customers.find(c => c.id === b.customerId)?.name || '';
    } else if (completedSortConfig.key === 'date' || completedSortConfig.key === 'createdAt') {
      aVal = a.date?.toMillis ? a.date.toMillis() : (a.createdAt?.toMillis ? a.createdAt.toMillis() : 0);
      bVal = b.date?.toMillis ? b.date.toMillis() : (b.createdAt?.toMillis ? b.createdAt.toMillis() : 0);
    } else if (completedSortConfig.key === 'fileNumber') {
      aVal = Number(a.fileNumber) || 0;
      bVal = Number(b.fileNumber) || 0;
    }

    if (aVal < bVal) return completedSortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return completedSortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const completedTotalItems = sortedCompletedSales.length;
  const completedTotalPages = completedItemsPerPage === 'all' ? 1 : Math.ceil(completedTotalItems / (completedItemsPerPage as number));
  
  const currentCompletedSales = completedItemsPerPage === 'all'
    ? sortedCompletedSales
    : sortedCompletedSales.slice((completedCurrentPage - 1) * (completedItemsPerPage as number), completedCurrentPage * (completedItemsPerPage as number));"""

if old_block in content:
    content = content.replace(old_block, new_block)
    with open('src/pages/process-document.tsx', 'w') as f:
        f.write(content)
    print("Patched successfully")
else:
    print("Could not find the block to patch")

