import re

with open('src/components/TallyStatementModal.tsx', 'r') as f:
    content = f.read()

# 1. Remove System/Business Info from UI header and add Customer info next to partyName
app_bar_pattern = r'(<DialogTitle className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">\s*{partyName}\s*<Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800 font-bold ml-2">\s*Tally Connected\s*</Badge>\s*)(</DialogTitle>)'

new_title = r'\1{(accountInfo?.contact || accountInfo?.address) && (<span className="text-[13px] font-semibold text-slate-500 normal-case ml-3 flex items-center gap-2 border-l pl-3 border-slate-200 dark:border-slate-700">{accountInfo?.contact} {accountInfo?.contact && accountInfo?.address ? "•" : ""} {accountInfo?.address}</span>)}\2'

content = re.sub(app_bar_pattern, new_title, content)

# Remove the system info block in UI
content = re.sub(
    r'{\/\* System/Business Information Block \*\/}\s*<div className="hidden md:flex flex-col items-center justify-center text-center absolute left-1/2 -translate-x-1/2">.*?</div>',
    '',
    content,
    flags=re.DOTALL
)

# 2. Add customer info to PDF header just under party name
pdf_header_pattern = r'(<h1 style="margin: 0; font-size: 22px;">\${partyName}</h1>\s*)(<p style="margin: 4px 0 0 0; color: #666; font-size: 12px;">Comprehensive Account Statement</p>)'

new_pdf_header = r'\1${(accountInfo?.contact || accountInfo?.address) ? `<p style="margin: 4px 0 0 0; color: #444; font-size: 13px;"><strong>Contact:</strong> ${accountInfo?.contact || "-"} &nbsp;|&nbsp; <strong>Address:</strong> ${accountInfo?.address || "-"}</p>` : ""}\n              \2'

content = re.sub(pdf_header_pattern, new_pdf_header, content)


with open('src/components/TallyStatementModal.tsx', 'w') as f:
    f.write(content)
