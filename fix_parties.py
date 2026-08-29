import re

with open('src/pages/parties.tsx', 'r') as f:
    content = f.read()

# Update Schema
content = content.replace(
    "contactNumber: z.string().min(7, 'Invalid contact number'),",
    "contactNumber: z.string().min(7, 'Invalid contact number'),\n  alternateNumber: z.string().optional(),"
)

# Update Form defaultValues
content = content.replace(
    """      contactNumber: '',""",
    """      contactNumber: '',\n      alternateNumber: '',"""
)

# Update form reset on editing
content = content.replace(
    """        contactNumber: editingParty.contactNumber,""",
    """        contactNumber: editingParty.contactNumber,\n        alternateNumber: editingParty.alternateNumber || '',"""
)

# Update UI fields
old_contact_field = """                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Primary Contact Line</label>
                    <Input {...form.register('contactNumber')} placeholder="+977- ..." className="h-11 rounded-lg bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900" />
                    {form.formState.errors.contactNumber && <p className="text-[10px] font-bold text-red-500">{form.formState.errors.contactNumber.message}</p>}
                  </div>"""

new_contact_field = """                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Primary Contact</label>
                      <Input {...form.register('contactNumber')} placeholder="+977- ..." className="h-11 rounded-lg bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900" />
                      {form.formState.errors.contactNumber && <p className="text-[10px] font-bold text-red-500">{form.formState.errors.contactNumber.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Alternative Contact</label>
                      <Input {...form.register('alternateNumber')} placeholder="Optional..." className="h-11 rounded-lg bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900" />
                      {form.formState.errors.alternateNumber && <p className="text-[10px] font-bold text-red-500">{form.formState.errors.alternateNumber.message}</p>}
                    </div>
                  </div>"""

content = content.replace(old_contact_field, new_contact_field)

with open('src/pages/parties.tsx', 'w') as f:
    f.write(content)
