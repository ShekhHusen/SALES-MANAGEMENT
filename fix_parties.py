import re

with open('src/pages/parties.tsx', 'r') as f:
    content = f.read()

# 1. Add "Menu" header before "Principal Identity"
header_pattern = r'(<TableHead className="py\.2\.5 px-6">\s*<div \s*className="flex items-center gap-1 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 transition-colors group text-\[11px\] font-extrabold uppercase tracking-widest text-slate-500"\s*onClick=\{\(\) => \{\s*if \(sortField === \'name\'\) setSortOrder\(sortOrder === \'asc\' \? \'desc\' : \'asc\'\);\s*else \{ setSortField\(\'name\'\); setSortOrder\(\'asc\'\); \}\s*\}\}\s*>\s*Principal Identity)'
new_header = r'<TableHead className="py-2.5 px-6 w-[120px] text-center"><span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500">Menu</span></TableHead>\n                  \1'
content = re.sub(header_pattern, new_header, content)

with open('src/pages/parties.tsx', 'w') as f:
    f.write(content)
