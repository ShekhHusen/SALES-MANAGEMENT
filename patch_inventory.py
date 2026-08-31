import re

with open('src/pages/inventory.tsx', 'r') as f:
    content = f.read()

# Fix the badge
old_badge = """                          vehicle.naamsariStatus === 'Customer Done' 
                            ? "bg-indigo-50 text-indigo-700 border-indigo-200" 
                            : vehicle.naamsariStatus === 'Names of JBMT'
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 border-slate-200 dark:border-slate-800"
                        )}>
                          NS: {vehicle.naamsariStatus === 'Names of JBMT' ? 'JBMT' : vehicle.naamsariStatus === 'Customer Done' ? 'Customer' : 'Pending'}"""

new_badge = """                          vehicle.naamsariStatus === 'Customer Done' 
                            ? "bg-indigo-50 text-indigo-700 border-indigo-200" 
                            : vehicle.naamsariStatus === 'Names of JBMT'
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : vehicle.naamsariStatus === 'VAT Bill Issued'
                                ? "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 border-slate-200 dark:border-slate-800"
                        )}>
                          NS: {vehicle.naamsariStatus === 'Names of JBMT' ? 'JBMT' : vehicle.naamsariStatus === 'Customer Done' ? 'Customer' : vehicle.naamsariStatus === 'VAT Bill Issued' ? 'VAT Bill' : 'Pending'}"""

content = content.replace(old_badge, new_badge)

# Fix the select
old_select = """                                  <SelectContent>
                                    <SelectItem value="Pending">Pending</SelectItem>
                                    <SelectItem value="Names of JBMT" disabled={selectedVehicle?.bluebookStatus !== 'Received'}>Names of JBMT</SelectItem>
                                    <SelectItem value="Customer Done" disabled={selectedVehicle ? (sales.some(s => s.chassisNumber === selectedVehicle.chassisNumber) ? false : selectedVehicle.status !== 'sold') : true}>Customer Done</SelectItem>
                                  </SelectContent>"""

new_select = """                                  <SelectContent>
                                    <SelectItem value="Pending">Pending</SelectItem>
                                    <SelectItem value="Names of JBMT" disabled={selectedVehicle?.bluebookStatus !== 'Received'}>Names of JBMT</SelectItem>
                                    <SelectItem value="Customer Done" disabled={selectedVehicle ? (sales.some(s => s.chassisNumber === selectedVehicle.chassisNumber) ? false : selectedVehicle.status !== 'sold') : true}>Customer Done</SelectItem>
                                    <SelectItem value="VAT Bill Issued">VAT Bill Issued</SelectItem>
                                  </SelectContent>"""

content = content.replace(old_select, new_select)

with open('src/pages/inventory.tsx', 'w') as f:
    f.write(content)
