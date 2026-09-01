import re

with open('src/components/TallyStatementModal.tsx', 'r') as f:
    content = f.read()

# Update the print HTML header
new_print_header = """          <div class="header">
            <div>
              <h1 style="margin: 0; font-size: 22px;">${partyName}</h1>
              <p style="margin: 4px 0 0 0; color: #666; font-size: 12px;">Comprehensive Account Statement</p>
            </div>
            <div style="text-align: right;">
              <h2 style="margin: 0; font-size: 16px; color: #111;">VEHICLE MANAGEMENT SYSTEM</h2>
              <p style="margin: 4px 0 0 0; color: #666; font-size: 11px;">123 Business Street, Auto Market</p>
              <p style="margin: 4px 0 0 0; color: #666; font-size: 11px;">Contact: +977 9800000000</p>
            </div>
          </div>"""

content = re.sub(
    r'<div class="header">\s*<div>\s*<h1 style="margin: 0; font-size: 22px;">\${partyName}</h1>\s*<p style="margin: 4px 0 0 0; color: #666; font-size: 12px;">Comprehensive Account Statement</p>\s*</div>\s*</div>',
    new_print_header,
    content
)

# Update the Custom App Bar Header
app_bar_pattern = r'(<div className="flex items-center gap-4">.*?</div>)(\s*)({\/\* Top Bar PDF Export Dropdown \*\/})'

new_app_bar_middle = """\\1
            
            {/* System/Business Information Block */}
            <div className="hidden md:flex flex-col items-center justify-center text-center absolute left-1/2 -translate-x-1/2">
              <h2 className="text-[13px] font-black text-slate-900 dark:text-white uppercase tracking-wider">Vehicle Management System</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">123 Business Street, Auto Market • +977 9800000000</p>
            </div>
\\2\\3"""

content = re.sub(app_bar_pattern, new_app_bar_middle, content, flags=re.DOTALL)

with open('src/components/TallyStatementModal.tsx', 'w') as f:
    f.write(content)

