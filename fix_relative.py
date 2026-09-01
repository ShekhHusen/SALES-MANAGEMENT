import re

with open('src/components/TallyStatementModal.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'className="h-16 flex items-center justify-between px-4 md:px-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 z-10 shadow-sm"',
    'className="h-16 flex items-center justify-between relative px-4 md:px-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 z-10 shadow-sm"'
)

with open('src/components/TallyStatementModal.tsx', 'w') as f:
    f.write(content)
