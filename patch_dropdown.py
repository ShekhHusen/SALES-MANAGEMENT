import re

with open('src/components/TallyStatementModal.tsx', 'r') as f:
    content = f.read()

target = r'''                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800 font-bold ml-2">
                    Tally Connected
                  </Badge>'''

replacement = r'''                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800 font-bold ml-2">
                    Tally Connected
                  </Badge>
                  {fiscalYears.length > 0 && (
                    <div className="relative ml-3">
                      <select
                        value={selectedFyId}
                        onChange={(e) => setSelectedFyId(e.target.value)}
                        className="appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-sm"
                      >
                        {fiscalYears.map(fy => (
                          <option key={fy.id} value={fy.id}>{fy.name || fy.id}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  )}'''

content = content.replace(target, replacement)

with open('src/components/TallyStatementModal.tsx', 'w') as f:
    f.write(content)
