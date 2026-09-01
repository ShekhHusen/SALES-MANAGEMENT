import re

# Fix TallyStatementModal
with open('src/components/TallyStatementModal.tsx', 'r') as f:
    content = f.read()

target = r'className="max-w-\[100vw\][^"]*w-screen h-screen h-\[100dvh\][^"]*"'
replacement = 'className="!max-w-none !w-screen !h-screen !h-[100dvh] !p-0 !m-0 !rounded-none !border-0 flex flex-col bg-slate-50 dark:bg-slate-950 [&>button]:hidden"'

content = re.sub(target, replacement, content)

with open('src/components/TallyStatementModal.tsx', 'w') as f:
    f.write(content)

# Fix TallyLinkModal
with open('src/components/TallyLinkModal.tsx', 'r') as f:
    content2 = f.read()

target2 = r'className="max-w-3xl sm:max-w-3xl md:max-w-3xl max-h-\[85vh\] overflow-hidden flex flex-col"'
replacement2 = 'className="!max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col"'

content2 = re.sub(target2, replacement2, content2)

with open('src/components/TallyLinkModal.tsx', 'w') as f:
    f.write(content2)

