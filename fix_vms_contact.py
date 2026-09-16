import re

with open('src/components/TallyStatementModal.tsx', 'r') as f:
    content = f.read()

# 1. Update useGlobalData
content = content.replace(
    "const { businessProfile } = useGlobalData();",
    "const { businessProfile, parties } = useGlobalData();\n  const vmsParty = parties.find(p => p.tallyAccountId === tallyAccountId || p.name.toLowerCase() === partyName.toLowerCase());"
)

# 2. Update PDF header
pdf_header_old = r'\$\{\(accountInfo\?\.contact \|\| accountInfo\?\.address\) \? `<p style="margin: 4px 0 0 0; color: #444; font-size: 13px;"><strong>Contact:</strong> \$\{accountInfo\?\.contact \|\| "-"} &nbsp;\|&nbsp; <strong>Address:</strong> \$\{accountInfo\?\.address \|\| "-"\}</p>` : ""\}'
pdf_header_new = r'${(vmsParty?.contactNumber || vmsParty?.address) ? `<p style="margin: 4px 0 0 0; color: #444; font-size: 13px;"><strong>Contact:</strong> ${vmsParty?.contactNumber || "-"} &nbsp;|&nbsp; <strong>Address:</strong> ${vmsParty?.address || "-"}</p>` : ""}'

content = re.sub(pdf_header_old, pdf_header_new, content)

# 3. Update summary block in PDF
summary_old = r'<div>Contact <strong>\$\{accountInfo\?\.contact \|\| \'\-\'\}</strong></div>\s*<div>Address <strong>\$\{accountInfo\?\.address \|\| \'\-\'\}</strong></div>'
summary_new = r'<div>Contact <strong>${vmsParty?.contactNumber || \'-\'}</strong></div>\n            <div>Address <strong>${vmsParty?.address || \'-\'}</strong></div>'

content = re.sub(summary_old, summary_new, content)


# 4. Update UI Header
ui_header_old = r'\{\(accountInfo\?\.contact \|\| accountInfo\?\.address\) && \(<span className="text-\[13px\] font-semibold text-slate-500 normal-case ml-3 flex items-center gap-2 border-l pl-3 border-slate-200 dark:border-slate-700">\{accountInfo\?\.contact\} \{accountInfo\?\.contact && accountInfo\?\.address \? "•" : ""\} \{accountInfo\?\.address\}</span>\)\}'
ui_header_new = r'{(vmsParty?.contactNumber || vmsParty?.address) && (<span className="text-[13px] font-semibold text-slate-500 normal-case ml-3 flex items-center gap-2 border-l pl-3 border-slate-200 dark:border-slate-700">{vmsParty?.contactNumber} {vmsParty?.contactNumber && vmsParty?.address ? "•" : ""} {vmsParty?.address}</span>)}'

content = re.sub(ui_header_old, ui_header_new, content)

# 5. Update Account Profile block in UI
ui_profile_old = r'<p className="text-\[10px\] text-slate-400 font-black uppercase tracking-widest mb-1">Contact</p>\s*<p className="font-bold text-slate-900 dark:text-slate-100">\{accountInfo\?\.contact \|\| \'\-\'\}</p>\s*</div>\s*<div>\s*<p className="text-\[10px\] text-slate-400 font-black uppercase tracking-widest mb-1">Address</p>\s*<p className="font-bold text-slate-900 dark:text-slate-100">\{accountInfo\?\.address \|\| \'\-\'\}</p>'
ui_profile_new = r'<p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Contact</p>\n                      <p className="font-bold text-slate-900 dark:text-slate-100">{vmsParty?.contactNumber || \'-\'}</p>\n                    </div>\n                    <div>\n                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Address</p>\n                      <p className="font-bold text-slate-900 dark:text-slate-100">{vmsParty?.address || \'-\'}</p>'

content = re.sub(ui_profile_old, ui_profile_new, content)

with open('src/components/TallyStatementModal.tsx', 'w') as f:
    f.write(content)

