import re

with open('src/components/TallyStatementModal.tsx', 'r') as f:
    content = f.read()

# Revert in PDF summary
pdf_summary_old = r'<div>Contact <strong>\$\{vmsParty\?\.contactNumber \|\| \'-\'\}</strong></div>\s*<div>Address <strong>\$\{vmsParty\?\.address \|\| \'-\'\}</strong></div>'
pdf_summary_new = r'<div>Contact <strong>${accountInfo?.contact || \'-\'}</strong></div>\n            <div>Address <strong>${accountInfo?.address || \'-\'}</strong></div>'
content = re.sub(pdf_summary_old, pdf_summary_new, content)

# Revert in UI summary
ui_summary_old = r'<p className="text-\[10px\] text-slate-400 font-black uppercase tracking-widest mb-1">Contact</p>\s*<p className="font-bold text-slate-900 dark:text-slate-100">\{vmsParty\?\.contactNumber \|\| \'-\'\}</p>\s*</div>\s*<div>\s*<p className="text-\[10px\] text-slate-400 font-black uppercase tracking-widest mb-1">Address</p>\s*<p className="font-bold text-slate-900 dark:text-slate-100">\{vmsParty\?\.address \|\| \'-\'\}</p>'
ui_summary_new = r'<p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Contact</p>\n                      <p className="font-bold text-slate-900 dark:text-slate-100">{accountInfo?.contact || \'-\'}</p>\n                    </div>\n                    <div>\n                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Address</p>\n                      <p className="font-bold text-slate-900 dark:text-slate-100">{accountInfo?.address || \'-\'}</p>'
content = re.sub(ui_summary_old, ui_summary_new, content)

with open('src/components/TallyStatementModal.tsx', 'w') as f:
    f.write(content)
