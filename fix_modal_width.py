import re

with open('src/components/TallyStatementModal.tsx', 'r') as f:
    content = f.read()

target = '<DialogContent className="max-w-[100vw] w-screen h-screen h-[100dvh] p-0 m-0 rounded-none border-0 flex flex-col bg-slate-50 dark:bg-slate-950 [&>button]:hidden">'
replacement = '<DialogContent className="max-w-[100vw] sm:max-w-[100vw] md:max-w-[100vw] lg:max-w-[100vw] w-screen h-screen h-[100dvh] p-0 m-0 rounded-none border-0 flex flex-col bg-slate-50 dark:bg-slate-950 [&>button]:hidden">'

content = content.replace(target, replacement)

with open('src/components/TallyStatementModal.tsx', 'w') as f:
    f.write(content)
