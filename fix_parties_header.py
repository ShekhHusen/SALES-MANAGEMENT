with open('src/pages/parties.tsx', 'r') as f:
    content = f.read()

target = """<TableHead className="py-2.5 px-6">
                    <div 
                      className="flex items-center gap-1 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 transition-colors group text-[11px] font-extrabold uppercase tracking-widest text-slate-500"
                      onClick={() => {
                        if (sortField === 'name') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        else { setSortField('name'); setSortOrder('asc'); }
                      }}
                    >
                      Principal Identity"""
                      
replacement = """<TableHead className="py-2.5 px-2 text-center w-[160px]"><span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500">Menu</span></TableHead>
                  <TableHead className="py-2.5 px-6">
                    <div 
                      className="flex items-center gap-1 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 transition-colors group text-[11px] font-extrabold uppercase tracking-widest text-slate-500"
                      onClick={() => {
                        if (sortField === 'name') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        else { setSortField('name'); setSortOrder('asc'); }
                      }}
                    >
                      Principal Identity"""
                      
content = content.replace(target, replacement)
with open('src/pages/parties.tsx', 'w') as f:
    f.write(content)
